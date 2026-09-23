// Trusted SB-04 room transaction. No client can write betaRooms directly.
import { configuredSlots } from './slots.mjs';

export const ROOM_LIMITS = Object.freeze({ admissions: 24, prompts: 100, receipts: 512, bytes: 512 * 1024, closeReserveBytes: 1024 });
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const own = (object, key) => Object.hasOwn(object ?? {}, key) ? object[key] : undefined;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const exact = (value, fields) => plain(value) && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field)) && Object.keys(value).every(field => !forbidden.has(field));
const id = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) && !forbidden.has(value);
const revision = value => Number.isSafeInteger(value) && value >= 0;
const bounded = (value, max, empty = false) => typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0);
const copy = value => structuredClone(value);
const canonical = value => JSON.stringify(value, (_key, item) => plain(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
const fail = code => ({ ok: false, code });
const ok = (commandId, entityRevision) => ({ ok: true, commandId, entityRevision });
const emptySheet = () => ({ schemaVersion: 1, revision: 0, name: '', playbookId: null, inventory: [] });
const emptyNotes = () => ({ schemaVersion: 1, revision: 0, text: '' });
const emptyBoard = () => ({ schemaVersion: 1, revision: 0, bleed: 0, clues: [] });
const publicBoardContent = board => ({ schemaVersion: 1, bleed: board.bleed, clues: copy(board.clues.filter(clue => clue.state === 'active' || clue.state === 'woven')) });
const syncBoard = room => {
  room.gm.board ??= emptyBoard();
  room.gm.board.schemaVersion ??= 1;
  room.gm.board.revision ??= 0;
  room.gm.board.bleed ??= 0;
  room.gm.board.clues = Array.isArray(room.gm.board.clues) ? room.gm.board.clues : [];
  const previous = room.shared.board ?? emptyBoard();
  const next = publicBoardContent(room.gm.board);
  const changed = canonical({ bleed: previous.bleed ?? 0, clues: Array.isArray(previous.clues) ? previous.clues : [] }) !== canonical({ bleed: next.bleed, clues: next.clues });
  room.shared.board = { ...next, revision: (previous.revision ?? 0) + (changed ? 1 : 0) };
};
const playbooks = new Set(['splicer', 'registrar', 'operator', 'diver', 'inspector', 'salvage', 'watch']);
const receiptCount = room => Object.values(room.receipts ?? {}).reduce((count, issuer) => count + Object.keys(issuer ?? {}).length, 0);
const roomBytes = room => Buffer.byteLength(JSON.stringify(room), 'utf8');
const overCapacity = room => Object.keys(room.admissions ?? {}).length > ROOM_LIMITS.admissions ||
  Object.keys(room.usedPrompts ?? {}).length > ROOM_LIMITS.prompts ||
  receiptCount(room) > ROOM_LIMITS.receipts - 1 ||
  roomBytes(room) > ROOM_LIMITS.bytes - ROOM_LIMITS.closeReserveBytes;

export function validCommand(value) {
  if (!plain(value) || !id(value.commandId)) return false;
  switch (value.type) {
    case 'room.create': return exact(value, ['type', 'commandId']);
    case 'room.close': return exact(value, ['type', 'commandId']);
    case 'admission.request': return exact(value, ['type', 'commandId', 'role', 'name']) && ['player', 'presenter'].includes(value.role) && bounded(value.name, 200);
    case 'admission.decide': return exact(value, ['type', 'commandId', 'uid', 'decision', 'expectedRevision']) && id(value.uid) && ['admit', 'deny'].includes(value.decision) && revision(value.expectedRevision);
    case 'admission.revoke': return exact(value, ['type', 'commandId', 'uid', 'expectedRevision']) && id(value.uid) && revision(value.expectedRevision);
    case 'scene.publish': return exact(value, ['type', 'commandId', 'expectedEpoch', 'title', 'body']) && revision(value.expectedEpoch) && bounded(value.title, 200) && bounded(value.body, 2000);
    case 'clue.create': return exact(value, ['type', 'commandId', 'expectedRevision', 'clueId', 'text']) && revision(value.expectedRevision) && id(value.clueId) && bounded(value.text, 2000);
    case 'clue.update': return exact(value, ['type', 'commandId', 'expectedRevision', 'clueId', 'text', 'state']) && revision(value.expectedRevision) && id(value.clueId) && bounded(value.text, 2000) && ['staged', 'active', 'woven', 'deep'].includes(value.state);
    case 'clue.move': return exact(value, ['type', 'commandId', 'expectedRevision', 'clueId', 'direction']) && revision(value.expectedRevision) && id(value.clueId) && ['up', 'down'].includes(value.direction);
    case 'clock.bleed.set': return exact(value, ['type', 'commandId', 'expectedRevision', 'value']) && revision(value.expectedRevision) && Number.isInteger(value.value) && value.value >= 0 && value.value <= 6;
    case 'prompt.open': return exact(value, ['type', 'commandId', 'recipientUid', 'promptId', 'sceneEpoch', 'question', 'a', 'b']) && id(value.recipientUid) && id(value.promptId) && revision(value.sceneEpoch) && bounded(value.question, 2000) && bounded(value.a, 200) && bounded(value.b, 200);
    case 'prompt.close': return exact(value, ['type', 'commandId', 'recipientUid', 'promptId', 'expectedRevision']) && id(value.recipientUid) && id(value.promptId) && revision(value.expectedRevision);
    case 'response.submit': return exact(value, ['type', 'commandId', 'promptId', 'sceneEpoch', 'expectedRevision', 'choice']) && id(value.promptId) && revision(value.sceneEpoch) && revision(value.expectedRevision) && ['A', 'B'].includes(value.choice);
    case 'sheet.replace': return exact(value, ['type', 'commandId', 'expectedRevision', 'name', 'playbookId', 'inventory']) && revision(value.expectedRevision) && bounded(value.name, 200, true) && (value.playbookId === null || playbooks.has(value.playbookId)) && Array.isArray(value.inventory) && value.inventory.length <= 100 && value.inventory.every(item => exact(item, ['id', 'label', 'quantity']) && id(item.id) && bounded(item.label, 200) && Number.isInteger(item.quantity) && item.quantity >= 0 && item.quantity <= 999) && new Set(value.inventory.map(item => item.id)).size === value.inventory.length;
    case 'notes.replace': return exact(value, ['type', 'commandId', 'expectedRevision', 'text']) && revision(value.expectedRevision) && bounded(value.text, 2000, true);
    default: return false;
  }
}

function apply(room, uid, roomId, command, slots) {
  if (!room) {
    if (command.type !== 'room.create') return { result: fail('NOT_FOUND') };
    if (!slots.permits(roomId, uid)) return { result: fail('FORBIDDEN') };
    const board = emptyBoard();
    const created = { schemaVersion: 1, owner: uid, epoch: 0, closed: false, admissions: {}, members: {}, shared: { board: emptyBoard() }, gm: { board }, decisions: {}, personal: {}, receipts: {}, usedPrompts: {} };
    created.receipts[uid] = { [command.commandId]: { payload: canonical(command), result: ok(command.commandId, 0) } };
    if (overCapacity(created)) return { result: fail('ROOM_FULL') };
    return { room: created, result: ok(command.commandId, 0) };
  }
  if (command.type === 'room.create') {
    if (uid !== room.owner) return { result: fail('FORBIDDEN') };
    const priorCreate = own(own(room.receipts, uid), command.commandId);
    return { result: priorCreate?.payload === canonical(command) ? priorCreate.result : priorCreate ? fail('COMMAND_ID_REUSED') : fail('CONFLICT') };
  }
  // RTDB omits empty objects when storing a room; restore absent collections in the transaction copy.
  for (const field of ['admissions', 'members', 'shared', 'gm', 'decisions', 'personal', 'receipts', 'usedPrompts']) room[field] ??= {};
  const owner = uid === room.owner;
  const member = own(room.members, uid);
  const admitted = member?.status === 'admitted';
  const player = admitted && member.role === 'player';
  if (command.type === 'admission.request') {
    if (owner) return { result: fail('FORBIDDEN') };
  } else if (command.type === 'admission.decide' || command.type === 'admission.revoke' || command.type === 'scene.publish' || command.type === 'prompt.open' || command.type === 'prompt.close' || command.type === 'clue.create' || command.type === 'clue.update' || command.type === 'clue.move' || command.type === 'clock.bleed.set' || command.type === 'room.close') {
    if (!owner) return { result: fail('FORBIDDEN') };
  } else if (!player) return { result: fail('FORBIDDEN') };
  const prior = own(own(room.receipts, uid), command.commandId);
  if (prior) return { result: prior.payload === canonical(command) ? prior.result : fail('COMMAND_ID_REUSED') };
  if (room.closed) return { result: fail('ROOM_CLOSED') };

  let entityRevision = 0;
  syncBoard(room);
  switch (command.type) {
    case 'room.close':
      room.closed = true;
      // Existing own-admission listeners carry the read-only signal to every admitted client.
      for (const admission of Object.values(room.admissions)) admission.roomClosed = true;
      entityRevision = room.epoch;
      break;
    case 'admission.request': {
      const current = own(room.admissions, uid);
      if (current?.status === 'admitted' || (current && current.role !== command.role)) return { result: fail('CONFLICT') };
      const next = { schemaVersion: 1, revision: current ? current.revision + 1 : 0, role: command.role, status: 'pending', name: command.name };
      room.admissions[uid] = next;
      entityRevision = next.revision;
      break;
    }
    case 'admission.decide': {
      const current = own(room.admissions, command.uid);
      if (!current) return { result: fail('NOT_FOUND') };
      if (current.status !== 'pending' || current.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      const next = { ...current, revision: current.revision + 1, status: command.decision === 'admit' ? 'admitted' : 'denied' };
      if (next.status === 'admitted') {
        const roleLimit = next.role === 'player' ? 2 : 1;
        const activeSameRole = Object.values(room.members).filter(member => member?.status === 'admitted' && member.role === next.role).length;
        if (activeSameRole >= roleLimit) return { result: fail('CONFLICT') };
      }
      room.admissions[command.uid] = next;
      if (next.status === 'admitted') {
        room.members[command.uid] = { schemaVersion: 1, revision: next.revision, role: next.role, status: 'admitted', name: next.name };
        if (next.role === 'player') {
          room.personal[command.uid] ??= { sheet: emptySheet(), notes: emptyNotes() };
          room.decisions[command.uid] ??= {};
        }
      }
      entityRevision = next.revision;
      break;
    }
    case 'admission.revoke': {
      const current = own(room.admissions, command.uid);
      if (!current) return { result: fail('NOT_FOUND') };
      if (current.status !== 'admitted' || current.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      const next = { ...current, revision: current.revision + 1, status: 'revoked' };
      room.admissions[command.uid] = next;
      room.members[command.uid] = { ...room.members[command.uid], revision: next.revision, status: 'revoked' };
      entityRevision = next.revision;
      break;
    }
    case 'scene.publish':
      if (room.epoch !== command.expectedEpoch) return { result: fail('CONFLICT') };
      entityRevision = ++room.epoch;
      room.shared.scene = { schemaVersion: 1, epoch: room.epoch, title: command.title, body: command.body };
      break;
    case 'clue.create': {
      const board = room.gm.board;
      if (board.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      if (board.clues.some(clue => clue.id === command.clueId)) return { result: fail('CONFLICT') };
      if (board.clues.length >= 100) return { result: fail('ROOM_FULL') };
      board.clues.push({ schemaVersion: 1, id: command.clueId, revision: 0, text: command.text, state: 'staged' });
      entityRevision = ++board.revision; syncBoard(room); break;
    }
    case 'clue.update': {
      const board = room.gm.board;
      if (board.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      const clue = board.clues.find(value => value.id === command.clueId); if (!clue) return { result: fail('NOT_FOUND') };
      clue.text = command.text; clue.state = command.state; clue.revision++; entityRevision = ++board.revision; syncBoard(room); break;
    }
    case 'clue.move': {
      const board = room.gm.board;
      if (board.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      const from = board.clues.findIndex(value => value.id === command.clueId); if (from < 0) return { result: fail('NOT_FOUND') };
      const to = command.direction === 'up' ? from - 1 : from + 1; if (to < 0 || to >= board.clues.length) return { result: fail('INVALID') };
      const [clue] = board.clues.splice(from, 1); board.clues.splice(to, 0, clue); clue.revision++; entityRevision = ++board.revision; syncBoard(room); break;
    }
    case 'clock.bleed.set': {
      const board = room.gm.board;
      if (board.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      board.bleed = command.value; entityRevision = ++board.revision; syncBoard(room); break;
    }
    case 'prompt.open': {
      const target = own(room.members, command.recipientUid);
      if (target?.status !== 'admitted' || target.role !== 'player') return { result: fail('FORBIDDEN') };
      if (!room.shared.scene || command.sceneEpoch !== room.epoch) return { result: fail('STALE_SCENE') };
      if (own(room.usedPrompts, command.promptId)) return { result: fail('CONFLICT') };
      room.usedPrompts[command.promptId] = true;
      room.decisions[command.recipientUid] ??= {};
      room.decisions[command.recipientUid][command.promptId] = { schemaVersion: 1, id: command.promptId, sceneEpoch: room.epoch, revision: 0, question: command.question, a: command.a, b: command.b, closed: false, response: null };
      break;
    }
    case 'prompt.close': {
      const prompt = own(own(room.decisions, command.recipientUid), command.promptId);
      if (!prompt) return { result: fail('NOT_FOUND') };
      if (prompt.sceneEpoch !== room.epoch) return { result: fail('STALE_SCENE') };
      if (prompt.closed) return { result: fail('CLOSED') };
      if (prompt.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      prompt.closed = true;
      entityRevision = ++prompt.revision;
      break;
    }
    case 'response.submit': {
      const prompt = own(own(room.decisions, uid), command.promptId);
      if (!prompt) return { result: fail('FORBIDDEN') };
      if (prompt.sceneEpoch !== room.epoch || command.sceneEpoch !== room.epoch) return { result: fail('STALE_SCENE') };
      if (prompt.response) return { result: fail('ALREADY_ANSWERED') };
      if (prompt.closed) return { result: fail('CLOSED') };
      if (prompt.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      prompt.response = { choice: command.choice, commandId: command.commandId };
      entityRevision = ++prompt.revision;
      break;
    }
    case 'sheet.replace': {
      const sheet = room.personal[uid]?.sheet;
      if (!sheet) return { result: fail('NOT_FOUND') };
      if (sheet.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      entityRevision = sheet.revision + 1;
      room.personal[uid].sheet = { schemaVersion: 1, revision: entityRevision, name: command.name, playbookId: command.playbookId, inventory: copy(command.inventory) };
      break;
    }
    case 'notes.replace': {
      const notes = room.personal[uid]?.notes;
      if (!notes) return { result: fail('NOT_FOUND') };
      if (notes.revision !== command.expectedRevision) return { result: fail('CONFLICT') };
      entityRevision = notes.revision + 1;
      room.personal[uid].notes = { schemaVersion: 1, revision: entityRevision, text: command.text };
      break;
    }
  }
  const result = ok(command.commandId, entityRevision);
  room.receipts[uid] ??= {};
  room.receipts[uid][command.commandId] = { payload: canonical(command), result };
  if (command.type !== 'room.close' && overCapacity(room)) return { result: fail('ROOM_FULL') };
  return { room, result };
}

export async function submitRoomCommand(database, uid, data, slots = configuredSlots()) {
  if (!id(uid)) return fail('UNAUTHENTICATED');
  if (!exact(data, ['roomId', 'command']) || !id(data.roomId) || !validCommand(data.command)) return fail('INVALID');
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 32_000) return fail('INVALID');
  let result = fail('CONFLICT');
  const roomRef = database.ref(`betaRooms/v1/${data.roomId}`);
  // Admin's RTDB transaction callback first sees the local cache. Prime it so an
  // uncached existing room is not mistaken for a missing room and aborted.
  const initial = (await roomRef.get()).val();
  await roomRef.transaction(current => {
    const state = current ?? initial;
    const outcome = apply(state ? copy(state) : null, uid, data.roomId, data.command, slots);
    result = outcome.result;
    return outcome.room;
  }, undefined, false);
  return result;
}

// GM-only metadata query; it never returns room contents or bypasses command authorization.
export async function readRoomStatus(database, uid, roomId) {
  if (!id(uid)) return fail('UNAUTHENTICATED');
  if (!id(roomId)) return fail('INVALID');
  const room = (await database.ref(`betaRooms/v1/${roomId}`).get()).val();
  // FORBIDDEN uniformly for any non-owner, so a probe cannot learn whether an unassigned slot has been created yet.
  if (!room || room.owner !== uid) return fail('FORBIDDEN');
  return { ok: true, closed: room.closed === true, limits: ROOM_LIMITS, usage: {
    admissions: Object.keys(room.admissions ?? {}).length,
    prompts: Object.keys(room.usedPrompts ?? {}).length,
    receipts: receiptCount(room),
    bytes: roomBytes(room),
  } };
}
