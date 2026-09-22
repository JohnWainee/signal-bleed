// Closed-beta slots are fixed in source; only their GM UID assignments come from deployment configuration.
export const CLOSED_BETA_SLOT_IDS = Object.freeze([
  'z55BRvW4r2wmaaXQ', 'rZ-Z0j3MpZbC8jrh', 'zk-De1RtETLq0FJC', 'pxz_R-Pr3HUYOD8N', 'I7ufbxpM5VL8PVJd',
  'cVOlUFjrpgefbnHI', 'TDjOctjXd-saxlJt', 'V0PcL8KMxq_z_XwZ', 'bxZXjBoAe5zF8q0B', '_oo16VGCskNg4zxD',
]);
const uid = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value);

export function configuredSlots() {
  // Explicit opt-in for isolated demo tests. It cannot be enabled by a production Functions deployment.
  if (process.env.FUNCTIONS_EMULATOR === 'true' && process.env.FIREBASE_DATABASE_EMULATOR_HOST && process.env.SB_BETA_TEST_OPEN_SLOTS === '1') {
    return { permits: () => true };
  }
  let assignments;
  try { assignments = JSON.parse(process.env.SB_BETA_GM_SLOTS || '{}'); } catch { assignments = {}; }
  if (!assignments || typeof assignments !== 'object' || Array.isArray(assignments) || Object.keys(assignments).length > CLOSED_BETA_SLOT_IDS.length ||
      Object.entries(assignments).some(([roomId, ownerUid]) => !CLOSED_BETA_SLOT_IDS.includes(roomId) || !uid(ownerUid))) {
    return { permits: () => false };
  }
  return { permits: (roomId, ownerUid) => Object.hasOwn(assignments, roomId) && assignments[roomId] === ownerUid };
}
