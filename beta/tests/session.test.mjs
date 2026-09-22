import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSession, applyCommand, viewFor } from '../session/session.mjs';
const gm = { uid: 'host', role: 'gm' };
const player = { uid: 'one', role: 'player' };
const other = { uid: 'two', role: 'player' };
const presenter = { uid: 'screen', role: 'presenter' };
function setup() {
  let state = createSession('host');
  state = applyCommand(state, gm, { type: 'scene.set', expectedRevision: 0,
    scene: { id: 'scene-one', title: 'Test scene', body: 'Public scene text', secret: 'Never publish' } });
  return applyCommand(state, gm, { type: 'prompt.open', expectedRevision: 1,
    prompt: { id: 'decision-one', recipientUid: 'one', question: 'Choose', a: 'First', b: 'Second' } });
}
test('GM scene and private decision reach only the intended surfaces', () => {
  const state = setup();
  assert.deepEqual(viewFor(state, presenter).scene, { id: 'scene-one', title: 'Test scene', body: 'Public scene text' });
  assert.equal('prompts' in viewFor(state, presenter), false);
  assert.equal(viewFor(state, other).prompts.length, 0);
  assert.equal(viewFor(state, player).prompts.length, 1);
  const answered = applyCommand(state, player, { type: 'response.submit', expectedRevision: 2, promptId: 'decision-one', choice: 'A' });
  assert.equal(viewFor(answered, gm).responses['decision-one'].choice, 'A');
  assert.deepEqual(viewFor(answered, other).responses, {});
  assert.equal('responses' in viewFor(answered, presenter), false);
  assert.deepEqual(state.responses, {});
});
test('role spoofing, presenter writes, and another player response are rejected', () => {
  const state = setup();
  for (const actor of [player, presenter, { uid: 'one', role: 'gm' }]) {
    assert.throws(() => applyCommand(state, actor, { type: 'scene.set', expectedRevision: 2, scene: {} }));
  }
  assert.throws(() => applyCommand(state, other, { type: 'response.submit', expectedRevision: 2, promptId: 'decision-one', choice: 'B' }));
});
test('stale, duplicate, malformed, and closed responses do not apply', () => {
  const state = setup();
  const response = { type: 'response.submit', expectedRevision: 2, promptId: 'decision-one', choice: 'A' };
  assert.throws(() => applyCommand(state, player, { ...response, expectedRevision: 1 }), /Stale/);
  assert.throws(() => applyCommand(state, player, { ...response, choice: 'C' }), /Invalid choice/);
  assert.throws(() => applyCommand(state, player, { ...response, promptId: '../gm' }), /Invalid identifier/);
  const answered = applyCommand(state, player, response);
  assert.throws(() => applyCommand(answered, player, { ...response, expectedRevision: 3 }), /Already answered/);
  const moved = applyCommand(state, gm, { type: 'scene.set', expectedRevision: 2, scene: { id: 'next', title: 'Next', body: 'Next scene' } });
  assert.throws(() => applyCommand(moved, player, { ...response, expectedRevision: 3 }), /denied/);
});
test('projections are detached and prompt identifiers cannot be reused', () => {
  const state = setup();
  const projected = viewFor(state, player);
  projected.scene.title = 'Tampered';
  projected.prompts[0].open = false;
  assert.equal(state.scene.title, 'Test scene');
  assert.equal(state.prompts['decision-one'].open, true);
  assert.throws(() => applyCommand(state, gm, { type: 'prompt.open', expectedRevision: 2, prompt: state.prompts['decision-one'] }), /already used/);
});
