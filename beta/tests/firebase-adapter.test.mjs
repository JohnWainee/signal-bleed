import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, connectAuthEmulator, signInAnonymously, signOut } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator, get, ref, goOffline } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { FirebaseSessionAdapter } from '../src/data/firebase-session.ts';

const backendRequire = createRequire(new URL('../backend/package.json', import.meta.url));
const { initializeTestEnvironment } = backendRequire('@firebase/rules-unit-testing');
const room = 'adapterRoom';
const base = `betaRooms/v1/${room}`;
const databaseUrl = 'https://demo-signal-bleed-beta-default-rtdb.firebaseio.com';
const actors = [];
let env;
const waitFor = async (events, predicate) => {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    const match = events.find(predicate);
    if (match) return match;
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error(`Timed out waiting for projection; saw ${events.map(event => event.type).join(', ')}`);
};
const actor = async name => {
  const app = initializeApp({ apiKey: 'fake-api-key', authDomain: 'demo-signal-bleed-beta.firebaseapp.com', databaseURL: databaseUrl, projectId: 'demo-signal-bleed-beta' }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
  await signInAnonymously(auth);
  const database = getDatabase(app);
  connectDatabaseEmulator(database, '127.0.0.1', 9001);
  const functions = getFunctions(app, 'us-central1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5101);
  const adapter = new FirebaseSessionAdapter(auth, database, functions);
  const entry = { app, auth, database, adapter, uid: auth.currentUser.uid };
  actors.push(entry);
  return entry;
};

before(async () => {
  assert.ok(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
  assert.ok(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  env = await initializeTestEnvironment({ projectId: 'demo-signal-bleed-beta', database: { host: '127.0.0.1', port: 9001 } });
});
after(async () => {
  for (const { adapter, auth, database, app } of actors) { adapter.dispose(); goOffline(database); await signOut(auth); await deleteApp(app); }
  if (env) await env.cleanup();
});

test('adapter subscribes only to GM, player, presenter and applicant projections', async () => {
  const gm = await actor('adapter-gm');
  const player = await actor('adapter-player');
  const presenter = await actor('adapter-presenter');
  const applicant = await actor('adapter-applicant');
  await env.withSecurityRulesDisabled(async context => {
    await context.database(databaseUrl).ref(base).set({
      owner: gm.uid,
      admissions: {
        [player.uid]: { schemaVersion: 1, revision: 1, role: 'player', status: 'admitted', name: 'Player' },
        [presenter.uid]: { schemaVersion: 1, revision: 1, role: 'presenter', status: 'admitted', name: 'Presenter' },
      },
      members: {
        [player.uid]: { schemaVersion: 1, revision: 1, role: 'player', status: 'admitted', name: 'Player' },
        [presenter.uid]: { schemaVersion: 1, revision: 1, role: 'presenter', status: 'admitted', name: 'Presenter' },
      },
      shared: { scene: { schemaVersion: 1, epoch: 1, title: 'Public', body: 'PUBLIC_ONLY' } },
      gm: { notes: { text: 'GM_ONLY' } },
      decisions: { [player.uid]: { p1: { schemaVersion: 1, id: 'p1', sceneEpoch: 1, revision: 0, question: 'ONLY_PLAYER', a: 'A', b: 'B', closed: false } } },
      personal: { [player.uid]: { sheet: { schemaVersion: 1, revision: 0, name: '', inventory: [] }, notes: { schemaVersion: 1, revision: 0, text: 'PLAYER_ONLY' } } },
    });
  });
  let storedOwner;
  await env.withSecurityRulesDisabled(async context => { storedOwner = (await context.database(databaseUrl).ref(`${base}/owner`).once('value')).val(); });
  assert.equal(storedOwner, gm.uid);
  assert.equal((await get(ref(gm.database, `${base}/owner`))).val(), gm.uid);
  assert.equal((await get(ref(player.database, `${base}/admissions/${player.uid}`))).val().status, 'admitted');
  const observed = new Map();
  for (const entry of [gm, player, presenter, applicant]) {
    const events = [];
    observed.set(entry.uid, events);
    entry.adapter.watch(room, event => events.push(event));
  }
  const gmEvents = observed.get(gm.uid);
  const playerEvents = observed.get(player.uid);
  const presenterEvents = observed.get(presenter.uid);
  const applicantEvents = observed.get(applicant.uid);
  await waitFor(gmEvents, event => event.type === 'gmDecisions' && event.data.status === 'live');
  await waitFor(playerEvents, event => event.type === 'notes' && event.data.status === 'live');
  await waitFor(presenterEvents, event => event.type === 'scene' && event.data.status === 'live');
  assert.equal(gmEvents.some(event => event.type === 'notes' || event.type === 'sheet'), false);
  assert.equal(presenterEvents.some(event => event.type !== 'scene' && event.type !== 'admission'), false);
  assert.equal(playerEvents.some(event => event.type === 'gmDecisions' || event.type === 'gmRoster'), false);
  assert.equal(JSON.stringify(presenterEvents).includes('ONLY_PLAYER'), false);
  assert.equal(JSON.stringify(playerEvents.find(event => event.type === 'scene')).includes('GM_ONLY'), false);
  assert.equal(playerEvents.find(event => event.type === 'sheet').data.value.playbookId, null);
  assert.deepEqual(playerEvents.find(event => event.type === 'sheet').data.value.inventory, []);
  await env.withSecurityRulesDisabled(async context => {
    await context.database(databaseUrl).ref(`${base}/admissions/${applicant.uid}`).set({ schemaVersion: 1, revision: 0, role: 'player', status: 'pending', name: 'Applicant' });
  });
  await waitFor(applicantEvents, event => event.type === 'admission' && event.value.status === 'pending');
  assert.equal(applicantEvents.some(event => event.type === 'scene' || event.type === 'decisions'), false);
  await env.withSecurityRulesDisabled(async context => {
    await context.database(databaseUrl).ref(`${base}/admissions/${player.uid}/status`).set('revoked');
    await context.database(databaseUrl).ref(`${base}/members/${player.uid}/status`).set('revoked');
  });
  await waitFor(playerEvents, event => event.type === 'accessLost' && event.code === 'FORBIDDEN');
});

test('authenticated callable creates a room and records the accepted command receipt', async () => {
  const gm = await actor('callable-gm');
  const player = await actor('callable-player');
  const created = await gm.adapter.createRoom('callableRoom', 'create1');
  assert.deepEqual(created, { ok: true, roomId: 'callableRoom' });
  assert.deepEqual(await gm.adapter.createRoom('callableRoom', 'create1'), created);
  let stored;
  await env.withSecurityRulesDisabled(async context => { stored = (await context.database(databaseUrl).ref('betaRooms/v1/callableRoom').once('value')).val(); });
  assert.equal(stored.owner, gm.uid);
  assert.equal(stored.receipts[gm.uid].create1.result.ok, true);
  assert.equal((await player.adapter.requestAdmission('callableRoom', 'player', 'Player', 'request1')).ok, true);
  assert.equal((await gm.adapter.decideAdmission('callableRoom', player.uid, 'admit', 0, 'admit1')).ok, true);
  assert.equal((await gm.adapter.send('callableRoom', { type: 'scene.publish', commandId: 'scene1', expectedEpoch: 0, title: 'Scene', body: 'PUBLIC_ONLY' })).ok, true);
  assert.equal((await gm.adapter.send('callableRoom', { type: 'prompt.open', commandId: 'open1', recipientUid: player.uid, promptId: 'prompt1', sceneEpoch: 1, question: 'ONLY_PLAYER', a: 'A', b: 'B' })).ok, true);
  assert.equal((await player.adapter.send('callableRoom', { type: 'response.submit', commandId: 'answer1', promptId: 'prompt1', sceneEpoch: 1, expectedRevision: 0, choice: 'A' })).ok, true);
  const playerEvents = [];
  const stop = player.adapter.watch('callableRoom', event => playerEvents.push(event));
  const decisions = await waitFor(playerEvents, event => event.type === 'decisions' && event.data.value?.prompt1?.response?.choice === 'A');
  assert.equal(decisions.data.value.prompt1.question, 'ONLY_PLAYER');
  assert.equal(JSON.stringify(playerEvents).includes('GM_ONLY'), false);
  stop();
});
