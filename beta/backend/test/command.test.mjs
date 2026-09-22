import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { submitRoomCommand } from '../server/command.mjs';

let app;
let database;
const roomId = 'commandTestRoom';
const send = (uid, command) => submitRoomCommand(database, uid, { roomId, command });
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
  success(await send('gm1', { type: 'scene.publish', commandId: 'scene2', expectedEpoch: 1, title: 'Two', body: 'Next' }));
  error(await send('p1', { type: 'response.submit', commandId: 'late', promptId: 'prompt_p1', sceneEpoch: 1, expectedRevision: 1, choice: 'A' }), 'STALE_SCENE');
  success(await send('gm1', { type: 'admission.revoke', commandId: 'revoke', uid: 'p1', expectedRevision: 1 }));
  error(await send('p1', { type: 'response.submit', commandId: 'answer_p1', promptId: 'prompt_p1', sceneEpoch: 1, expectedRevision: 0, choice: 'A' }), 'FORBIDDEN');
  const room = await getRoom();
  assert.equal(room.receipts.p1.steal, undefined);
  assert.equal(room.receipts.p1.bad, undefined);
  assert.equal(room.receipts.p1.late, undefined);
  assert.equal(room.members.p1.status, 'revoked');
});

test('close/answer and scene/answer races have one authoritative order; personal revisions stay independent', async () => {
  const raceRoomId = 'raceRoom';
  const race = (uid, command) => submitRoomCommand(database, uid, { roomId: raceRoomId, command });
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
