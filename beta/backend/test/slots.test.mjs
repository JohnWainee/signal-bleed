import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CLOSED_BETA_SLOT_IDS, configuredSlots } from '../server/slots.mjs';

test('closed-beta slot IDs are fixed, unique, and only assigned to configured GM UIDs', () => {
  assert.equal(CLOSED_BETA_SLOT_IDS.length, 10);
  assert.equal(new Set(CLOSED_BETA_SLOT_IDS).size, 10);
  const saved = {
    slots: process.env.SB_BETA_GM_SLOTS,
    functions: process.env.FUNCTIONS_EMULATOR,
    open: process.env.SB_BETA_TEST_OPEN_SLOTS,
  };
  try {
    process.env.FUNCTIONS_EMULATOR = 'false';
    delete process.env.SB_BETA_TEST_OPEN_SLOTS;
    const first = CLOSED_BETA_SLOT_IDS[0];
    process.env.SB_BETA_GM_SLOTS = JSON.stringify({ [first]: 'gm1' });
    assert.equal(configuredSlots().permits(first, 'gm1'), true);
    assert.equal(configuredSlots().permits(first, 'other'), false);
    assert.equal(configuredSlots().permits('inventedRoom', 'gm1'), false);
    process.env.SB_BETA_GM_SLOTS = JSON.stringify({ inventedRoom: 'gm1' });
    assert.equal(configuredSlots().permits('inventedRoom', 'gm1'), false);
    process.env.SB_BETA_GM_SLOTS = '{bad json';
    assert.equal(configuredSlots().permits(first, 'gm1'), false);
    process.env.SB_BETA_GM_SLOTS = JSON.stringify({ [first]: '__proto__' });
    assert.equal(configuredSlots().permits(first, '__proto__'), false);
    delete process.env.SB_BETA_GM_SLOTS;
    assert.equal(configuredSlots().permits(first, 'gm1'), false);
  } finally {
    for (const [key, value] of [['SB_BETA_GM_SLOTS', saved.slots], ['FUNCTIONS_EMULATOR', saved.functions], ['SB_BETA_TEST_OPEN_SLOTS', saved.open]]) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
