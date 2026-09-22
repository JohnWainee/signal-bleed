import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

let env;
const room = 'betaRooms/v1/roomA';
const otherRoom = 'betaRooms/v1/roomB';
const ref = (actor, path) => actor.database().ref(path);
const read = (actor, path) => ref(actor, path).once('value');

before(async () => {
  const rules = await readFile(new URL('../../../firebase.rules.json', import.meta.url), 'utf8');
  const proposal = await readFile(new URL('../rules.proposed.json', import.meta.url), 'utf8');
  assert.deepEqual(JSON.parse(rules), JSON.parse(proposal), 'protected rules must match the reviewed proposal');
  env = await initializeTestEnvironment({ projectId: 'demo-signal-bleed-beta', database: { host: '127.0.0.1', port: 9001, rules } });
  await env.clearDatabase();
  await env.withSecurityRulesDisabled(async context => {
    await context.database().ref().set({
      rooms: { alpha: { shared: { title: 'Alpha stays' }, meta: { gmUid: 'g1' }, players: { p1: { name: 'Alpha player' } } } },
      betaRooms: { v1: {
        roomA: {
          owner: 'g1',
          admissions: {
            p1: { role: 'player', status: 'admitted' }, p2: { role: 'player', status: 'admitted' },
            tv1: { role: 'presenter', status: 'admitted' }, x1: { role: 'player', status: 'pending' }, revoked: { role: 'player', status: 'revoked' },
          },
          members: {
            p1: { role: 'player', status: 'admitted' }, p2: { role: 'player', status: 'admitted' },
            tv1: { role: 'presenter', status: 'admitted' }, revoked: { role: 'player', status: 'revoked' },
          },
          shared: { scene: { schemaVersion: 1, epoch: 1, title: 'Public', body: 'PUBLIC_ONLY' } },
          gm: { notes: { text: 'GM_ONLY' } },
          decisions: { p1: { one: { question: 'ONLY_P1' } }, p2: { two: { question: 'ONLY_P2' } } },
          personal: { p1: { sheet: { name: 'P1' }, notes: { text: 'PLAYER_ONLY' } }, p2: { sheet: { name: 'P2' }, notes: { text: 'P2_ONLY' } } },
          receipts: { p1: { cmd1: { ok: true } }, p2: { cmd2: { ok: true } } },
        },
        roomB: { owner: 'otherGm', admissions: {}, members: {}, shared: { scene: { title: 'OTHER_ROOM' } } },
      } },
    });
  });
});
after(async () => { if (env) await env.cleanup(); });

test('GM receives roster and decisions but no player personal records', async () => {
  const gm = env.authenticatedContext('g1');
  assert.equal((await assertSucceeds(read(gm, `${room}/shared/scene`))).val().body, 'PUBLIC_ONLY');
  assert.equal((await assertSucceeds(read(gm, `${room}/admissions`))).val().x1.status, 'pending');
  assert.equal((await assertSucceeds(read(gm, `${room}/members`))).val().p1.role, 'player');
  assert.equal((await assertSucceeds(read(gm, `${room}/decisions`))).val().p2.two.question, 'ONLY_P2');
  assert.equal((await assertSucceeds(read(gm, `${room}/gm/notes`))).val().text, 'GM_ONLY');
  await assertFails(read(gm, `${room}/personal/p1/sheet`));
  await assertFails(read(gm, `${room}/receipts/p1/cmd1`));
  await assertFails(read(gm, room));
});

test('each player receives only their own private data', async () => {
  for (const [uid, ownPrompt, otherUid] of [['p1', 'one', 'p2'], ['p2', 'two', 'p1']]) {
    const player = env.authenticatedContext(uid);
    const scene = (await assertSucceeds(read(player, `${room}/shared/scene`))).val();
    assert.equal(JSON.stringify(scene).includes('ONLY_'), false);
    assert.equal((await assertSucceeds(read(player, `${room}/decisions/${uid}`))).val()[ownPrompt].question, `ONLY_${uid.toUpperCase()}`);
    await assertSucceeds(read(player, `${room}/personal/${uid}/sheet`));
    await assertSucceeds(read(player, `${room}/personal/${uid}/notes`));
    await assertSucceeds(read(player, `${room}/receipts/${uid}`));
    await assertSucceeds(read(player, `${room}/admissions/${uid}`));
    await assertSucceeds(read(player, `${room}/members/${uid}`));
    for (const path of [`${room}/decisions`, `${room}/decisions/${otherUid}`, `${room}/personal/${otherUid}`, `${room}/receipts/${otherUid}`, `${room}/gm/notes`, `${room}/members`, `${room}/admissions`, room, otherRoom]) await assertFails(read(player, path));
  }
});

test('presenter, applicant, revoked identity and unauthenticated client receive only allowed leaves', async () => {
  const tv = env.authenticatedContext('tv1');
  assert.equal((await assertSucceeds(read(tv, `${room}/shared/scene`))).val().title, 'Public');
  await assertSucceeds(read(tv, `${room}/admissions/tv1`));
  await assertSucceeds(read(tv, `${room}/members/tv1`));
  for (const path of [`${room}/decisions`, `${room}/decisions/p1`, `${room}/personal/p1`, `${room}/receipts/p1`, `${room}/gm`, room]) await assertFails(read(tv, path));
  const applicant = env.authenticatedContext('x1');
  assert.equal((await assertSucceeds(read(applicant, `${room}/admissions/x1`))).val().status, 'pending');
  await assertFails(read(applicant, `${room}/shared/scene`));
  await assertFails(read(applicant, `${room}/members/x1`));
  const revoked = env.authenticatedContext('revoked');
  assert.equal((await assertSucceeds(read(revoked, `${room}/admissions/revoked`))).val().status, 'revoked');
  await assertFails(read(revoked, `${room}/shared/scene`));
  await assertFails(read(revoked, `${room}/members/revoked`));
  const unknown = env.authenticatedContext('unknown');
  await assertFails(read(unknown, `${room}/shared/scene`));
  await assertFails(read(env.unauthenticatedContext(), `${room}/shared/scene`));
});

test('all direct beta client writes are denied, including parent, response and receipt writes', async () => {
  for (const actor of [env.authenticatedContext('g1'), env.authenticatedContext('p1'), env.authenticatedContext('tv1'), env.authenticatedContext('x1'), env.unauthenticatedContext()]) {
    for (const path of [`${room}/shared/scene`, `${room}/decisions/p1/one/response`, `${room}/personal/p1/notes`, `${room}/admissions/x1`, `${room}/receipts/p1/fake`, room]) {
      await assertFails(ref(actor, path).set({ forged: true }));
    }
  }
});

test('existing alpha subtree retains its repository permissions', async () => {
  const p1 = env.authenticatedContext('p1');
  assert.equal((await assertSucceeds(read(p1, 'rooms/alpha/shared'))).val().title, 'Alpha stays');
  await assertSucceeds(ref(p1, 'rooms/alpha/shared').update({ title: 'Alpha still writable' }));
  await assertFails(read(env.unauthenticatedContext(), 'rooms/alpha/shared'));
});
