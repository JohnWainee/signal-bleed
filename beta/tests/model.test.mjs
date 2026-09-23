import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLAYBOOK_IDS } from '../src/session/model.ts';
import { createSyntheticFixture } from '../src/session/fixtures.ts';

async function fixture() {
  const result = await createSyntheticFixture();
  return { ...result, x: result.outsider };
}
function events(adapter) { const list = []; const stop = adapter.watch('fixture', event => list.push(event)); return { list, stop }; }
function latest(list, type) { return list.filter(event => event.type === type).at(-1); }
const answer = (uid, commandId = `answer_${uid}`, choice = 'A') => ({ type: 'response.submit', commandId, promptId: `prompt_${uid}`, sceneEpoch: 1, expectedRevision: 0, choice });

test('scene, admission and private views are isolated and detached', async () => {
  const { store, gm, p1, p2, tv, x } = await fixture();
  const g = events(gm).list, one = events(p1).list, two = events(p2).list, screen = events(tv).list, outsider = events(x).list;
  assert.equal(latest(screen, 'scene').data.value.title, 'Synthetic Hawaiʻi scene');
  assert.deepEqual(new Set(screen.map(event => event.type)), new Set(['admission', 'scene', 'board']));
  assert.deepEqual(new Set(outsider.map(event => event.type)), new Set(['admission']));
  assert.equal(JSON.stringify(one).includes('ONLY_P2'), false);
  assert.equal(JSON.stringify(two).includes('ONLY_P1'), false);
  assert.equal(JSON.stringify(screen).includes('ONLY_'), false);
  assert.equal(JSON.stringify(one).includes('PLAYER_ONLY'), true);
  assert.equal(JSON.stringify(two).includes('PLAYER_ONLY'), false);
  assert.equal(JSON.stringify(screen).includes('PLAYER_ONLY'), false);
  assert.equal(JSON.stringify(g).includes('PLAYER_ONLY'), false);
  assert.equal(JSON.stringify(g).includes('GM_ONLY'), false);
  assert.equal(store.room('fixture').gmNote, 'GM_ONLY');
  assert.equal(JSON.stringify(g).includes('ONLY_P1'), true);
  latest(one, 'scene').data.value.title = 'mutated';
  assert.equal(latest(events(tv).list, 'scene').data.value.title, 'Synthetic Hawaiʻi scene');
});

test('ordered clues and Bleed expose only active and woven clues outside the GM view', async () => {
  const { gm, p1, tv } = await fixture();
  assert.equal((await gm.send('fixture', { type: 'clue.create', commandId: 'clue_create_1', expectedRevision: 0, clueId: 'clue_1', text: 'GM_STAGED_ONLY' })).ok, true);
  assert.equal(JSON.stringify(latest(events(gm).list, 'board')).includes('GM_STAGED_ONLY'), true);
  assert.equal(JSON.stringify(latest(events(p1).list, 'board')).includes('GM_STAGED_ONLY'), false);
  assert.equal(JSON.stringify(latest(events(tv).list, 'board')).includes('GM_STAGED_ONLY'), false);
  assert.equal((await gm.send('fixture', { type: 'clue.update', commandId: 'clue_reveal_1', expectedRevision: 1, clueId: 'clue_1', text: 'Public clue one', state: 'active' })).ok, true);
  assert.equal((await gm.send('fixture', { type: 'clue.create', commandId: 'clue_create_2', expectedRevision: 2, clueId: 'clue_2', text: 'Second staged clue' })).ok, true);
  assert.equal((await gm.send('fixture', { type: 'clue.update', commandId: 'clue_reveal_2', expectedRevision: 3, clueId: 'clue_2', text: 'Public clue two', state: 'woven' })).ok, true);
  assert.equal((await gm.send('fixture', { type: 'clue.move', commandId: 'clue_move', expectedRevision: 4, clueId: 'clue_2', direction: 'up' })).ok, true);
  assert.deepEqual(latest(events(p1).list, 'board').data.value.clues.map(clue => clue.id), ['clue_2', 'clue_1']);
  assert.deepEqual(latest(events(tv).list, 'board').data.value.clues.map(clue => clue.state), ['woven', 'active']);
  assert.equal((await gm.send('fixture', { type: 'clock.bleed.set', commandId: 'bleed_1', expectedRevision: 5, value: 3 })).ok, true);
  assert.equal(latest(events(tv).list, 'board').data.value.bleed, 3);
  assert.deepEqual(await p1.send('fixture', { type: 'clock.bleed.set', commandId: 'spoof_bleed', expectedRevision: 6, value: 6 }), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await gm.send('fixture', { type: 'clock.bleed.set', commandId: 'stale_bleed', expectedRevision: 5, value: 4 }), { ok: false, code: 'CONFLICT' });
  assert.deepEqual(await gm.send('fixture', { type: 'clue.update', commandId: 'archive_clue', expectedRevision: 6, clueId: 'clue_1', text: 'Public clue one', state: 'deep' }), { ok: true, commandId: 'archive_clue', entityRevision: 7 });
  assert.equal(JSON.stringify(latest(events(tv).list, 'board')).includes('Public clue one'), false);
});

test('independent player answers, idempotency and stale scene enforcement', async () => {
  const { gm, p1, p2 } = await fixture();
  const [a, b] = await Promise.all([p1.send('fixture', answer('p1')), p2.send('fixture', answer('p2', 'answer_p2', 'B'))]);
  assert.equal(a.ok, true); assert.equal(b.ok, true);
  assert.deepEqual(await p1.send('fixture', answer('p1')), a);
  assert.deepEqual(await p1.send('fixture', answer('p1', 'answer_p1', 'B')), { ok: false, code: 'COMMAND_ID_REUSED' });
  assert.deepEqual(await p1.send('fixture', answer('p1', 'again')), { ok: false, code: 'ALREADY_ANSWERED' });
  const g = events(gm).list;
  assert.equal(latest(g, 'gmDecisions').data.value.p1.prompt_p1.response.choice, 'A');
  assert.equal(latest(g, 'gmDecisions').data.value.p2.prompt_p2.response.choice, 'B');
  assert.equal((await gm.send('fixture', { type: 'scene.publish', commandId: 'scene2', expectedEpoch: 1, title: 'Next', body: 'Next public scene' })).ok, true);
  assert.deepEqual(await p2.send('fixture', answer('p2', 'late')), { ok: false, code: 'STALE_SCENE' });
  assert.deepEqual(await p1.send('fixture', answer('p1')), a);
});

test('authorization, malformed input, close race and revocation', async () => {
  const { gm, p1, p2, tv, x } = await fixture();
  assert.deepEqual(await tv.send('fixture', answer('p1')), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await p2.send('fixture', answer('p1')), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await x.send('fixture', answer('p1')), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await p1.send('fixture', { ...answer('p1'), promptId: '../gm' }), { ok: false, code: 'INVALID' });
  assert.deepEqual(await p1.send('fixture', { ...answer('p1'), role: 'gm' }), { ok: false, code: 'INVALID' });
  assert.deepEqual(await gm.send('fixture', { type: 'prompt.close', commandId: 'close1', recipientUid: 'p1', promptId: 'prompt_p1', expectedRevision: 0 }), { ok: true, commandId: 'close1', entityRevision: 1 });
  assert.deepEqual(await p1.send('fixture', answer('p1')), { ok: false, code: 'CLOSED' });
  const one = events(p1).list;
  assert.equal((await gm.revoke('fixture', 'p1', 1, 'revoke1')).ok, true);
  assert.equal(latest(one, 'accessLost').code, 'FORBIDDEN');
  assert.deepEqual(await p1.send('fixture', answer('p1')), { ok: false, code: 'FORBIDDEN' });
});

test('personal fields use independent revisions and survive scene changes', async () => {
  const { gm, p1, tv } = await fixture();
  const sheet = { type: 'sheet.replace', commandId: 'sheet1', expectedRevision: 0, name: 'Character', playbookId: PLAYBOOK_IDS[0], inventory: [{ id: 'item1', label: 'Notebook', quantity: 1 }] };
  assert.equal((await p1.send('fixture', sheet)).ok, true);
  assert.deepEqual(await p1.send('fixture', { ...sheet, commandId: 'sheet2' }), { ok: false, code: 'CONFLICT' });
  assert.equal((await p1.send('fixture', { type: 'notes.replace', commandId: 'notes1', expectedRevision: 0, text: 'PLAYER_ONLY' })).ok, true);
  assert.equal((await gm.send('fixture', { type: 'scene.publish', commandId: 'scene2', expectedEpoch: 1, title: 'Next', body: 'Next' })).ok, true);
  const one = events(p1).list, screen = events(tv).list;
  assert.equal(latest(one, 'sheet').data.value.inventory[0].label, 'Notebook');
  assert.equal(latest(one, 'notes').data.value.text, 'PLAYER_ONLY');
  assert.equal(JSON.stringify(events(gm).list).includes('PLAYER_ONLY'), false);
  assert.equal(JSON.stringify(screen).includes('PLAYER_ONLY'), false);
});

test('invalid payloads and role spoofing cannot mutate state', async () => {
  const { gm, p1, tv } = await fixture();
  const invalid = [
    { ...answer('p1'), choice: 'C' },
    { ...answer('p1'), sceneEpoch: Number.NaN },
    { ...answer('p1'), extra: 'gm' },
    { type: 'notes.replace', commandId: 'badnote', expectedRevision: 0, text: 'x'.repeat(2001) },
    { type: 'sheet.replace', commandId: 'badsheet', expectedRevision: 0, name: 'X', playbookId: 'invented', inventory: [] },
    { type: 'sheet.replace', commandId: 'badqty', expectedRevision: 0, name: 'X', playbookId: null, inventory: [{ id: 'a', label: 'X', quantity: Infinity }] },
  ];
  for (const command of invalid) assert.deepEqual(await p1.send('fixture', command), { ok: false, code: 'INVALID' });
  assert.deepEqual(await p1.send('fixture', { type: 'scene.publish', commandId: 'spoof', expectedEpoch: 1, title: 'X', body: 'Y' }), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await tv.send('fixture', { type: 'notes.replace', commandId: 'tvwrite', expectedRevision: 0, text: 'X' }), { ok: false, code: 'FORBIDDEN' });
  assert.equal(latest(events(gm).list, 'scene').data.value.title, 'Synthetic Hawaiʻi scene');
});

test('admission retries and reconnect preserve confirmed state', async () => {
  const { gm, p1, store } = await fixture();
  const accepted = await p1.send('fixture', answer('p1'));
  assert.equal(accepted.ok, true);
  assert.deepEqual(await p1.send('fixture', answer('p1')), accepted);
  const anotherContext = store.connect('p1');
  assert.equal(latest(events(anotherContext).list, 'decisions').data.value.prompt_p1.response.choice, 'A');
  assert.equal((await gm.revoke('fixture', 'p1', 1, 'revoke')).ok, true);
  assert.deepEqual(await anotherContext.send('fixture', answer('p1')), { ok: false, code: 'FORBIDDEN' });
  assert.equal((await p1.requestAdmission('fixture', 'player', 'Player one', 'reapply')).ok, true);
  assert.equal((await gm.decideAdmission('fixture', 'p1', 'admit', 3, 'readmit')).ok, true);
  assert.deepEqual(await anotherContext.send('fixture', answer('p1')), accepted);
  anotherContext.dispose(); anotherContext.dispose();
  assert.deepEqual(await anotherContext.send('fixture', answer('p1')), { ok: false, code: 'UNAUTHENTICATED' });
});

test('synthetic empty, loading, disconnected, denied and revoked fixtures', async () => {
  const empty = await createSyntheticFixture('empty');
  assert.equal(latest(events(empty.tv).list, 'scene').data.value, null);
  const loading = await createSyntheticFixture('loading');
  assert.deepEqual(latest(events(loading.tv).list, 'scene').data, { status: 'loading', value: null });
  const disconnected = await createSyntheticFixture('disconnected');
  assert.equal(latest(events(disconnected.tv).list, 'scene').data.status, 'disconnected');
  assert.equal(latest(events(disconnected.tv).list, 'scene').data.value.epoch, 1);
  assert.deepEqual(await disconnected.p1.send('fixture', answer('p1')), { ok: false, code: 'DISCONNECTED' });
  assert.deepEqual(await disconnected.tv.send('fixture', answer('p1')), { ok: false, code: 'FORBIDDEN' });
  disconnected.store.setStatus('fixture', 'live');
  assert.equal((await disconnected.p1.send('fixture', answer('p1'))).ok, true);
  const denied = await createSyntheticFixture('denied');
  assert.equal(latest(events(denied.outsider).list, 'admission').value.status, 'denied');
  const revoked = await createSyntheticFixture('revoked');
  assert.equal(latest(events(revoked.p1).list, 'accessLost').code, 'FORBIDDEN');
});

test('close and answer races resolve in one order per prompt', async () => {
  const first = await fixture();
  const [answered, closed] = await Promise.all([
    first.p1.send('fixture', answer('p1')),
    first.gm.send('fixture', { type: 'prompt.close', commandId: 'close_after', recipientUid: 'p1', promptId: 'prompt_p1', expectedRevision: 0 }),
  ]);
  assert.equal(answered.ok, true);
  assert.deepEqual(closed, { ok: false, code: 'CONFLICT' });
  assert.equal((await first.gm.send('fixture', { type: 'prompt.close', commandId: 'close_answered', recipientUid: 'p1', promptId: 'prompt_p1', expectedRevision: 1 })).ok, true);
  assert.equal(latest(events(first.gm).list, 'gmDecisions').data.value.p1.prompt_p1.response.choice, 'A');
  const second = await fixture();
  const [closedFirst, rejected] = await Promise.all([
    second.gm.send('fixture', { type: 'prompt.close', commandId: 'close_first', recipientUid: 'p1', promptId: 'prompt_p1', expectedRevision: 0 }),
    second.p1.send('fixture', answer('p1')),
  ]);
  assert.equal(closedFirst.ok, true);
  assert.deepEqual(rejected, { ok: false, code: 'CLOSED' });
});

test('room creation and command receipts are scoped to issuer and payload', async () => {
  const { store, gm, p1 } = await fixture();
  assert.deepEqual(await gm.createRoom('fixture', 'create'), { ok: true, roomId: 'fixture' });
  assert.deepEqual(await gm.createRoom('fixture', 'different'), { ok: false, code: 'CONFLICT' });
  assert.deepEqual(await p1.createRoom('fixture', 'create'), { ok: false, code: 'FORBIDDEN' });
  const accepted = await p1.send('fixture', answer('p1'));
  const reordered = { choice: 'A', expectedRevision: 0, sceneEpoch: 1, promptId: 'prompt_p1', commandId: 'answer_p1', type: 'response.submit' };
  assert.deepEqual(await p1.send('fixture', reordered), accepted);
  assert.equal(latest(events(store.connect('p1')).list, 'decisions').data.value.prompt_p1.revision, 1);
});

test('admission revisions and GM authority reject stale or spoofed decisions', async () => {
  const { gm, p1, tv, outsider } = await createSyntheticFixture();
  assert.deepEqual(await p1.decideAdmission('fixture', 'x1', 'admit', 0, 'player_admit'), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await tv.revoke('fixture', 'p1', 1, 'tv_revoke'), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await gm.requestAdmission('fixture', 'player', 'GM', 'gm_request'), { ok: false, code: 'FORBIDDEN' });
  const denied = await gm.decideAdmission('fixture', 'x1', 'deny', 0, 'deny');
  assert.equal(denied.ok, true);
  assert.deepEqual(await gm.decideAdmission('fixture', 'x1', 'deny', 0, 'deny'), denied);
  assert.deepEqual(await gm.decideAdmission('fixture', 'x1', 'admit', 0, 'deny'), { ok: false, code: 'COMMAND_ID_REUSED' });
  assert.deepEqual(await gm.decideAdmission('fixture', 'x1', 'admit', 0, 'stale'), { ok: false, code: 'CONFLICT' });
  assert.equal((await outsider.requestAdmission('fixture', 'player', 'Outsider', 'retry')).ok, true);
  assert.deepEqual(await gm.decideAdmission('fixture', 'x1', 'admit', 1, 'stale2'), { ok: false, code: 'CONFLICT' });
  assert.deepEqual(await gm.revoke('fixture', 'p1', 0, 'stale_revoke'), { ok: false, code: 'CONFLICT' });
});

test('prompt identity, recipient, epochs and watch lifecycle', async () => {
  const { gm, p1, tv, store } = await fixture();
  const open = { type: 'prompt.open', commandId: 'second_prompt', recipientUid: 'p1', promptId: 'prompt_second', sceneEpoch: 1, question: 'Second', a: 'First', b: 'Second' };
  assert.equal((await gm.send('fixture', open)).ok, true);
  assert.deepEqual(Object.keys(latest(events(p1).list, 'decisions').data.value).sort(), ['prompt_p1', 'prompt_second']);
  assert.deepEqual(await gm.send('fixture', { ...open, commandId: 'reuse_id', promptId: 'prompt_p1' }), { ok: false, code: 'CONFLICT' });
  assert.deepEqual(await gm.send('fixture', { ...open, commandId: 'presenter_prompt', recipientUid: 'tv1', promptId: 'to_tv' }), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await gm.send('fixture', { ...open, commandId: 'pending_prompt', recipientUid: 'x1', promptId: 'to_x' }), { ok: false, code: 'FORBIDDEN' });
  assert.deepEqual(await gm.send('fixture', { ...open, commandId: 'old_epoch', promptId: 'old', sceneEpoch: 0 }), { ok: false, code: 'STALE_SCENE' });
  assert.deepEqual(await gm.send('fixture', { type: 'scene.publish', commandId: 'wrong_epoch', expectedEpoch: 0, title: 'No', body: 'No' }), { ok: false, code: 'CONFLICT' });
  const list = []; const unsubscribe = tv.watch('fixture', event => list.push(event));
  const before = list.length; unsubscribe(); store.setStatus('fixture', 'disconnected');
  assert.equal(list.length, before);
  assert.equal(latest(events(store.connect('missing_uid')).list, 'accessLost').code, 'FORBIDDEN');
});
