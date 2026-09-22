import { MockSessionStore } from './model.ts';

// Synthetic contract fixture. Names, scene, and prompts are not game canon.
export async function createSyntheticFixture(state: 'live' | 'empty' | 'loading' | 'disconnected' | 'denied' | 'revoked' = 'live') {
  const store = new MockSessionStore();
  const gm = store.connect('g1');
  const p1 = store.connect('p1');
  const p2 = store.connect('p2');
  const tv = store.connect('tv1');
  const outsider = store.connect('x1');
  await gm.createRoom('fixture', 'create');
  for (const [actor, role, uid] of [
    [p1, 'player', 'p1'], [p2, 'player', 'p2'], [tv, 'presenter', 'tv1'],
  ] as const) {
    await actor.requestAdmission('fixture', role, uid, `request_${uid}`);
    await gm.decideAdmission('fixture', uid, 'admit', 0, `admit_${uid}`);
  }
  await outsider.requestAdmission('fixture', 'player', 'Outsider', 'request_x1');
  store.seedPrivateMarkers('fixture');
  if (state === 'empty') return { store, gm, p1, p2, tv, outsider };
  await gm.send('fixture', { type: 'scene.publish', commandId: 'scene1', expectedEpoch: 0, title: 'Synthetic Hawaiʻi scene', body: 'Public test content' });
  for (const uid of ['p1', 'p2']) {
    await gm.send('fixture', { type: 'prompt.open', commandId: `open_${uid}`, recipientUid: uid, promptId: `prompt_${uid}`, sceneEpoch: 1, question: `ONLY_${uid.toUpperCase()}`, a: 'A', b: 'B' });
  }
  if (state === 'denied') await gm.decideAdmission('fixture', 'x1', 'deny', 0, 'deny_x1');
  if (state === 'revoked') await gm.revoke('fixture', 'p1', 1, 'revoke_p1');
  if (state === 'loading' || state === 'disconnected') store.setStatus('fixture', state);
  return { store, gm, p1, p2, tv, outsider };
}
