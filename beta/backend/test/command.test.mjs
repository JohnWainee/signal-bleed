import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { ROOM_LIMITS, readRoomStatus, submitRoomCommand } from '../server/command.mjs';

let app;
let database;
const roomId = 'commandTestRoom';
const slots = { permits: (room, uid) => (room === roomId && uid === 'gm1') || (room === 'raceRoom' && uid === 'raceGm') || (room.startsWith('limit') && uid === 'limitGm') };
const send = (uid, command) => submitRoomCommand(database, uid, { roomId, command }, slots);
const getRoom = async () => (await database.ref(`betaRooms/v1/${roomId}`).get()).val();
const success = result => assert.equal(result.ok, true, JSON.stringify(result));
const error = (result, code) => assert.deepEqual(result, { ok: false, code });

before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST, 'Run through firebase emulators:exec');
  app = initializeApp({ projectId: 'demo-signal-bleed-beta', databaseURL: 'https://demo-signal-bleed-beta-default-rtdb.firebaseio.com' }, 'command-tests');
  database = getDatabase(app);
  await database.ref(`betaRooms/v1/${roomId}`).remove();
});
after(async () => { if (app) await deleteApp(app); });

test('room, admission, scene, concurrent answers and receipts commit atomically', async () => {
  error(await send('', { type: 'room.create', commandId: 'create' }), 'UNAUTHENTICATED');
  success(await send('gm1', { type: 'room.create', commandId: 'create' }));
  success(await send('gm1', { type: 'room.create', commandId: 'create' }));
  error(await send('other', { type: 'room.create', commandId: 'create' }), 'FORBIDDEN');
  success(await send('gm1', { type: 'clue.create', commandId: 'clueCreate1', expectedRevision: 0, clueId: 'clue1', text: 'GM_STAGED_ONLY' }));
  assert.equal((await getRoom()).gm.board.clues[0].text, 'GM_STAGED_ONLY');
  assert.equal((await getRoom()).shared.board.clues, undefined);
  success(await send('gm1', { type: 'clue.update', commandId: 'clueReveal1', expectedRevision: 1, clueId: 'clue1', text: 'Public one', state: 'active' }));
  success(await send('gm1', { type: 'clue.create', commandId: 'clueCreate2', expectedRevision: 2, clueId: 'clue2', text: 'Second' }));
  success(await send('gm1', { type: 'clue.update', commandId: 'clueReveal2', expectedRevision: 3, clueId: 'clue2', text: 'Public two', state: 'woven' }));
  success(await send('gm1', { type: 'clue.move', commandId: 'clueMove', expectedRevision: 4, clueId: 'clue2', direction: 'up' }));
  success(await send('gm1', { type: 'clock.bleed.set', commandId: 'bleedSet', expectedRevision: 5, value: 3 }));
  assert.deepEqual((await getRoom()).shared.board.clues.map(clue => clue.id), ['clue2', 'clue1']);
  assert.equal((await getRoom()).shared.board.bleed, 3);
  error(await send('p1', { type: 'clock.bleed.set', commandId: 'spoofBleed', expectedRevision: 6, value: 6 }), 'FORBIDDEN');
  error(await send('gm1', { type: 'clock.bleed.set', commandId: 'staleBleed', expectedRevision: 5, value: 4 }), 'CONFLICT');
  for (const uid of ['p1', 'p2']) {
    success(await send(uid, { type: 'admission.request', commandId: `request_${uid}`, role: 'player', name: uid }));
    assert.equal((await getRoom()).admissions?.[uid]?.status, 'pending');
    success(await send('gm1', { type: 'admission.decide', commandId: `admit_${uid}`, uid, decision: 'admit', expectedRevision: 0 }));
  }
  success(await send('p3', { type: 'admission.request', commandId: 'request_p3', role: 'player', name: 'Third' }));
  error(await send('gm1', { type: 'admission.decide', commandId: 'admit_p3', uid: 'p3', decision: 'admit', expectedRevision: 0 }), 'CONFLICT');
  success(await send('gm1', { type: 'scene.publish', commandId: 'scene1', expectedEpoch: 0, title: 'One', body: 'Scene' }));
  for (const uid of ['p1', 'p2']) success(await send('gm1', { type: 'prompt.open', commandId: `open_${uid}`, recipientUid: uid, promptId: `prompt_${uid}`, sceneEpoch: 1, question: 'Which?', a: 'A', b: 'B' }));
  const answer1 = { type: 'response.submit', commandId: 'answer_p1', promptId: 'prompt_p1', sceneEpoch: 1, expectedRevision: 0, choice: 'A' };
  const answer2 = { type: 'response.submit', commandId: 'answer_p2', promptId: 'prompt_p2', sceneEpoch: 1, expectedRevision: 0, choice: 'B' };
  const [one, two] = await Promise.all([send('p1', answer1), send('p2', answer2)]);
  success(one); success(two);
  assert.deepEqual(await send('p1', answer1), one);
  error(await send('p1', { ...answer1, choice: 'B' }), 'COMMAND_ID_REUSED');
  const room = await getRoom();
  assert.equal(room.decisions.p1.prompt_p1.response.choice, 'A');
  assert.equal(room.decisions.p2.prompt_p2.response.choice, 'B');
  assert.deepEqual(room.receipts.p1.answer_p1.result, one);
  assert.deepEqual(room.receipts.p2.answer_p2.result, two);
  assert.equal(room.personal.p1.sheet.revision, 0);
  assert.equal(room.personal.p2.notes.revision, 0);
});

test('scene transition, revocation, malformed commands and cross-player commands fail without receipts', async () => {
  error(await send('p1', { type: 'response.submit', commandId: 'steal', promptId: 'prompt_p2', sceneEpoch: 1, expectedRevision: 0, choice: 'A' }), 'FORBIDDEN');
  error(await send('p1', { type: 'notes.replace', commandId: 'bad', expectedRevision: 0, text: 'x', uid: 'p2' }), 'INVALID');
  const multibyteInventory = Array.from({ length: 100 }, (_, index) => ({ id: `item_${index}`, label: '漢'.repeat(200), quantity: 1 }));
  error(await send('p2', { type: 'sheet.replace', commandId: 'utf8Oversize', expectedRevision: 0, name: 'Player', playbookId: null, inventory: multibyteInventory }), 'INVALID');
  success(await send('gm1', { type: 'scene.publish', commandId: 'scene2', expectedEpoch: 1, title: 'Two', body: 'Next' }));
  error(await send('p1', { type: 'response.submit', commandId: 'late', promptId: 'prompt_p1', sceneEpoch: 1, expectedRevision: 1, choice: 'A' }), 'STALE_SCENE');
  success(await send('gm1', { type: 'admission.revoke', commandId: 'revoke', uid: 'p1', expectedRevision: 1 }));
  error(await send('p1', { type: 'response.submit', commandId: 'answer_p1', promptId: 'prompt_p1', sceneEpoch: 1, expectedRevision: 0, choice: 'A' }), 'FORBIDDEN');
  const room = await getRoom();
  assert.equal(room.receipts.p1.steal, undefined);
  assert.equal(room.receipts.p1.bad, undefined);
  assert.equal(room.receipts.p2.utf8Oversize, undefined);
  assert.equal(room.receipts.p1.late, undefined);
  assert.equal(room.members.p1.status, 'revoked');
});

test('close/answer and scene/answer races have one authoritative order; personal revisions stay independent', async () => {
  const raceRoomId = 'raceRoom';
  const race = (uid, command) => submitRoomCommand(database, uid, { roomId: raceRoomId, command }, slots);
  success(await race('raceGm', { type: 'room.create', commandId: 'raceCreate' }));
  success(await race('racePlayer', { type: 'admission.request', commandId: 'raceRequest', role: 'player', name: 'Player' }));
  success(await race('raceGm', { type: 'admission.decide', commandId: 'raceAdmit', uid: 'racePlayer', decision: 'admit', expectedRevision: 0 }));
  success(await race('raceGm', { type: 'scene.publish', commandId: 'raceScene1', expectedEpoch: 0, title: 'One', body: 'Scene' }));
  const open = promptId => race('raceGm', { type: 'prompt.open', commandId: `open_${promptId}`, recipientUid: 'racePlayer', promptId, sceneEpoch: 1, question: 'Choose', a: 'A', b: 'B' });
  success(await open('closeRace'));
  const [closed, answered] = await Promise.all([
    race('raceGm', { type: 'prompt.close', commandId: 'closeRaceCommand', recipientUid: 'racePlayer', promptId: 'closeRace', expectedRevision: 0 }),
    race('racePlayer', { type: 'response.submit', commandId: 'answerRaceCommand', promptId: 'closeRace', sceneEpoch: 1, expectedRevision: 0, choice: 'A' }),
  ]);
  assert.equal(Number(closed.ok) + Number(answered.ok), 1);
  const closeRoom = (await database.ref(`betaRooms/v1/${raceRoomId}`).get()).val();
  assert.equal(closeRoom.decisions.racePlayer.closeRace.revision, 1);
  assert.equal(Boolean(closeRoom.receipts.raceGm?.closeRaceCommand) + Boolean(closeRoom.receipts.racePlayer?.answerRaceCommand), 1);
  success(await open('sceneRace'));
  const [transition, lateAnswer] = await Promise.all([
    race('raceGm', { type: 'scene.publish', commandId: 'raceScene2', expectedEpoch: 1, title: 'Two', body: 'Next' }),
    race('racePlayer', { type: 'response.submit', commandId: 'sceneRaceAnswer', promptId: 'sceneRace', sceneEpoch: 1, expectedRevision: 0, choice: 'B' }),
  ]);
  success(transition);
  if (!lateAnswer.ok) error(lateAnswer, 'STALE_SCENE');
  const sceneRoom = (await database.ref(`betaRooms/v1/${raceRoomId}`).get()).val();
  assert.equal(Boolean(sceneRoom.decisions.racePlayer.sceneRace.response), lateAnswer.ok);
  assert.equal(Boolean(sceneRoom.receipts.racePlayer?.sceneRaceAnswer), lateAnswer.ok);
  const [sheet, notes] = await Promise.all([
    race('racePlayer', { type: 'sheet.replace', commandId: 'sheet1', expectedRevision: 0, name: 'Name', playbookId: 'splicer', inventory: [] }),
    race('racePlayer', { type: 'notes.replace', commandId: 'notes1', expectedRevision: 0, text: 'Private' }),
  ]);
  success(sheet); success(notes);
  error(await race('racePlayer', { type: 'notes.replace', commandId: 'notesStale', expectedRevision: 0, text: 'Other' }), 'CONFLICT');
  const finalRoom = (await database.ref(`betaRooms/v1/${raceRoomId}`).get()).val();
  assert.equal(finalRoom.personal.racePlayer.sheet.revision, 1);
  assert.equal(finalRoom.personal.racePlayer.notes.revision, 1);
  assert.equal(finalRoom.receipts.racePlayer.notesStale, undefined);
});

test('room creation requires its assigned GM slot and slots cannot be claimed by URL alone', async () => {
  const create = (uid, id) => submitRoomCommand(database, uid, { roomId: id, command: { type: 'room.create', commandId: 'create' } }, slots);
  error(await create('intruder', 'limitSlot'), 'FORBIDDEN');
  error(await create('limitGm', 'notAllocated'), 'FORBIDDEN');
  assert.equal((await database.ref('betaRooms/v1/limitSlot').get()).exists(), false);
  success(await create('limitGm', 'limitSlot'));
  error(await create('intruder', 'limitSlot'), 'FORBIDDEN');
});

test('admission and prompt ceilings reject new growth without losing existing records', async () => {
  const admissionRoom = 'limitAdmissions';
  const at = (id, uid, command) => submitRoomCommand(database, uid, { roomId: id, command }, slots);
  success(await at(admissionRoom, 'limitGm', { type: 'room.create', commandId: 'create' }));
  const admissions = Object.fromEntries(Array.from({ length: ROOM_LIMITS.admissions }, (_, n) => [`guest${n}`, { schemaVersion: 1, revision: 0, role: 'player', status: 'denied', name: `Guest ${n}` }]));
  await database.ref(`betaRooms/v1/${admissionRoom}/admissions`).set(admissions);
  error(await at(admissionRoom, 'extra', { type: 'admission.request', commandId: 'requestExtra', role: 'player', name: 'Extra' }), 'ROOM_FULL');
  assert.equal((await database.ref(`betaRooms/v1/${admissionRoom}/receipts/extra`).get()).exists(), false);
  success(await at(admissionRoom, 'guest0', { type: 'admission.request', commandId: 'retryGuest', role: 'player', name: 'Guest zero' }));

  const promptRoom = 'limitPrompts';
  success(await at(promptRoom, 'limitGm', { type: 'room.create', commandId: 'create' }));
  success(await at(promptRoom, 'player', { type: 'admission.request', commandId: 'request', role: 'player', name: 'Player' }));
  success(await at(promptRoom, 'limitGm', { type: 'admission.decide', commandId: 'admit', uid: 'player', decision: 'admit', expectedRevision: 0 }));
  success(await at(promptRoom, 'limitGm', { type: 'scene.publish', commandId: 'scene', expectedEpoch: 0, title: 'Scene', body: 'Body' }));
  await database.ref(`betaRooms/v1/${promptRoom}/usedPrompts`).set(Object.fromEntries(Array.from({ length: ROOM_LIMITS.prompts }, (_, n) => [`old${n}`, true])));
  error(await at(promptRoom, 'limitGm', { type: 'prompt.open', commandId: 'extraPrompt', recipientUid: 'player', promptId: 'newPrompt', sceneEpoch: 1, question: 'Question', a: 'A', b: 'B' }), 'ROOM_FULL');
  assert.equal((await database.ref(`betaRooms/v1/${promptRoom}/decisions/player/newPrompt`).get()).exists(), false);
});

test('last ordinary receipt is atomic under a race; close reserve and exact retries survive the cap', async () => {
  const id = 'limitReceipts';
  const at = (uid, command) => submitRoomCommand(database, uid, { roomId: id, command }, slots);
  success(await at('limitGm', { type: 'room.create', commandId: 'create' }));
  for (const uid of ['one', 'two']) {
    success(await at(uid, { type: 'admission.request', commandId: `request_${uid}`, role: 'player', name: uid }));
    success(await at('limitGm', { type: 'admission.decide', commandId: `admit_${uid}`, uid, decision: 'admit', expectedRevision: 0 }));
  }
  const existing = (await database.ref(`betaRooms/v1/${id}/receipts`).get()).val();
  const existingCount = Object.values(existing).reduce((n, group) => n + Object.keys(group).length, 0);
  existing.limitGm = { ...existing.limitGm, ...Object.fromEntries(Array.from({ length: ROOM_LIMITS.receipts - 2 - existingCount }, (_, n) => [`seed${n}`, { payload: '{}', result: { ok: true, commandId: `seed${n}`, entityRevision: 0 } }])) };
  await database.ref(`betaRooms/v1/${id}/receipts`).set(existing);
  const [one, two] = await Promise.all([
    at('one', { type: 'notes.replace', commandId: 'lastOne', expectedRevision: 0, text: 'One' }),
    at('two', { type: 'notes.replace', commandId: 'lastTwo', expectedRevision: 0, text: 'Two' }),
  ]);
  assert.equal(Number(one.ok) + Number(two.ok), 1);
  assert.equal([one, two].filter(result => !result.ok)[0].code, 'ROOM_FULL');
  const winnerUid = one.ok ? 'one' : 'two';
  const winnerCommand = { type: 'notes.replace', commandId: one.ok ? 'lastOne' : 'lastTwo', expectedRevision: 0, text: one.ok ? 'One' : 'Two' };
  assert.deepEqual(await at(winnerUid, winnerCommand), one.ok ? one : two);
  error(await at(winnerUid, { ...winnerCommand, text: 'Changed' }), 'COMMAND_ID_REUSED');
  const close = { type: 'room.close', commandId: 'closeAtCap' };
  const closed = await at('limitGm', close);
  success(closed);
  assert.deepEqual(await at('limitGm', close), closed);
  error(await at('limitGm', { type: 'scene.publish', commandId: 'afterClose', expectedEpoch: 0, title: 'No', body: 'No' }), 'ROOM_CLOSED');
  error(await at('one', { type: 'notes.replace', commandId: 'afterClosePlayer', expectedRevision: one.ok ? 1 : 0, text: 'No' }), 'ROOM_CLOSED');
  const room = (await database.ref(`betaRooms/v1/${id}`).get()).val();
  assert.equal(room.closed, true);
  assert.equal(Object.values(room.receipts).reduce((n, group) => n + Object.keys(group).length, 0), ROOM_LIMITS.receipts);
  assert.equal(room.receipts.limitGm.afterClose, undefined);
  const status = await readRoomStatus(database, 'limitGm', id);
  assert.equal(status.ok, true);
  assert.equal(status.closed, true);
  assert.equal(status.usage.receipts, ROOM_LIMITS.receipts);
  error(await readRoomStatus(database, 'one', id), 'FORBIDDEN');
});

test('byte ceiling rejects the full transaction while still permitting explicit close', async () => {
  const id = 'limitBytes';
  const at = command => submitRoomCommand(database, 'limitGm', { roomId: id, command }, slots);
  success(await at({ type: 'room.create', commandId: 'create' }));
  await database.ref(`betaRooms/v1/${id}/gm/notes`).set({ text: 'x'.repeat(ROOM_LIMITS.bytes - ROOM_LIMITS.closeReserveBytes - 300) });
  error(await at({ type: 'scene.publish', commandId: 'tooLarge', expectedEpoch: 0, title: 'Scene', body: 'Body' }), 'ROOM_FULL');
  assert.equal((await database.ref(`betaRooms/v1/${id}/shared/scene`).get()).exists(), false);
  assert.equal((await database.ref(`betaRooms/v1/${id}/receipts/limitGm/tooLarge`).get()).exists(), false);
  success(await at({ type: 'room.close', commandId: 'closeOversize' }));
});
