// Fixture-only model. Firebase authorization and atomic writes belong to SB-04.
export type Role = 'gm' | 'player' | 'presenter';
export type Choice = 'A' | 'B';
export type Failure = 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID' | 'CONFLICT' | 'STALE_SCENE' | 'CLOSED' | 'ALREADY_ANSWERED' | 'COMMAND_ID_REUSED' | 'DISCONNECTED';
export type Result = { ok: true; commandId: string; entityRevision: number } | { ok: false; code: Failure };
export type Delivery<T> = { status: 'loading' | 'live' | 'disconnected'; value: T | null };
export type Scene = { schemaVersion: 1; epoch: number; title: string; body: string };
export type Prompt = { schemaVersion: 1; id: string; sceneEpoch: number; revision: number; question: string; a: string; b: string; closed: boolean; response: null | { choice: Choice; commandId: string } };
export type Sheet = { schemaVersion: 1; revision: number; name: string; playbookId: string | null; inventory: { id: string; label: string; quantity: number }[] };
export type Notes = { schemaVersion: 1; revision: number; text: string };
export type Admission = { schemaVersion: 1; revision: number; role: 'player' | 'presenter'; status: 'pending' | 'admitted' | 'denied' | 'revoked'; name: string };
export type Command = { commandId: string } & (
  | { type: 'scene.publish'; expectedEpoch: number; title: string; body: string }
  | { type: 'prompt.open'; recipientUid: string; promptId: string; sceneEpoch: number; question: string; a: string; b: string }
  | { type: 'prompt.close'; recipientUid: string; promptId: string; expectedRevision: number }
  | { type: 'response.submit'; promptId: string; sceneEpoch: number; expectedRevision: number; choice: Choice }
  | { type: 'sheet.replace'; expectedRevision: number; name: string; playbookId: string | null; inventory: Sheet['inventory'] }
  | { type: 'notes.replace'; expectedRevision: number; text: string }
);
export type SessionEvent =
  | { type: 'admission'; value: Admission }
  | { type: 'scene'; data: Delivery<Scene> }
  | { type: 'decisions'; data: Delivery<Record<string, Prompt>> }
  | { type: 'sheet'; data: Delivery<Sheet> }
  | { type: 'notes'; data: Delivery<Notes> }
  | { type: 'gmRoster'; data: Delivery<Record<string, Admission>> }
  | { type: 'gmDecisions'; data: Delivery<Record<string, Record<string, Prompt>>> }
  | { type: 'accessLost'; code: 'FORBIDDEN' | 'UNAUTHENTICATED' };
export interface SessionAdapter {
  createRoom(roomId: string, commandId: string): Promise<{ ok: true; roomId: string } | { ok: false; code: Failure }>;
  requestAdmission(roomId: string, role: 'player' | 'presenter', name: string, commandId: string): Promise<Result>;
  decideAdmission(roomId: string, uid: string, decision: 'admit' | 'deny', expectedRevision: number, commandId: string): Promise<Result>;
  revoke(roomId: string, uid: string, expectedRevision: number, commandId: string): Promise<Result>;
  send(roomId: string, command: Command): Promise<Result>;
  watch(roomId: string, onEvent: (event: SessionEvent) => void): () => void;
  dispose(): void;
}

export const PLAYBOOK_IDS = ['splicer', 'registrar', 'operator', 'diver', 'inspector', 'salvage', 'watch'] as const;
type Receipt = { payload: string; result: Result };
type Room = { owner: string; epoch: number; scene: Scene | null; gmNote: string; admissions: Record<string, Admission>; decisions: Record<string, Record<string, Prompt>>; sheets: Record<string, Sheet>; notes: Record<string, Notes>; receipts: Record<string, Record<string, Receipt>>; usedPrompts: Set<string> };
type Listener = { uid: string; emit: (event: SessionEvent) => void; admissionRevision?: number; admissionStatus?: Admission['status'] };
const forbiddenKeys = new Set(['__proto__', 'prototype', 'constructor']);
const clone = <T>(value: T): T => structuredClone(value);
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => object(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : item);
const own = <T>(record: Record<string, T>, key: string): T | undefined => Object.hasOwn(record, key) ? record[key] : undefined;
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const keys = (value: unknown, expected: string[]): boolean => object(value) && Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => !forbiddenKeys.has(key));
const id = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) && !forbiddenKeys.has(value);
const bounded = (value: unknown, max: number, empty = false): value is string => typeof value === 'string' && value.length <= max && (empty || value.trim().length > 0);
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;
const ok = (commandId: string, entityRevision: number): Result => ({ ok: true, commandId, entityRevision });
const fail = (code: Failure): { ok: false; code: Failure } => ({ ok: false, code });
const emptySheet = (): Sheet => ({ schemaVersion: 1, revision: 0, name: '', playbookId: null, inventory: [] });
const emptyNotes = (): Notes => ({ schemaVersion: 1, revision: 0, text: '' });

function validCommand(value: unknown): value is Command {
  if (!object(value) || !id(value.commandId) || typeof value.type !== 'string') return false;
  switch (value.type) {
    case 'scene.publish': return keys(value, ['type', 'commandId', 'expectedEpoch', 'title', 'body']) && revision(value.expectedEpoch) && bounded(value.title, 200) && bounded(value.body, 2000);
    case 'prompt.open': return keys(value, ['type', 'commandId', 'recipientUid', 'promptId', 'sceneEpoch', 'question', 'a', 'b']) && id(value.recipientUid) && id(value.promptId) && revision(value.sceneEpoch) && bounded(value.question, 2000) && bounded(value.a, 200) && bounded(value.b, 200);
    case 'prompt.close': return keys(value, ['type', 'commandId', 'recipientUid', 'promptId', 'expectedRevision']) && id(value.recipientUid) && id(value.promptId) && revision(value.expectedRevision);
    case 'response.submit': return keys(value, ['type', 'commandId', 'promptId', 'sceneEpoch', 'expectedRevision', 'choice']) && id(value.promptId) && revision(value.sceneEpoch) && revision(value.expectedRevision) && (value.choice === 'A' || value.choice === 'B');
    case 'sheet.replace': return keys(value, ['type', 'commandId', 'expectedRevision', 'name', 'playbookId', 'inventory']) && revision(value.expectedRevision) && bounded(value.name, 200, true) && (value.playbookId === null || PLAYBOOK_IDS.includes(value.playbookId as typeof PLAYBOOK_IDS[number])) && Array.isArray(value.inventory) && value.inventory.length <= 100 && value.inventory.every(item => keys(item, ['id', 'label', 'quantity']) && id(item.id) && bounded(item.label, 200) && Number.isInteger(item.quantity) && item.quantity >= 0 && item.quantity <= 999) && new Set(value.inventory.map(item => item.id)).size === value.inventory.length;
    case 'notes.replace': return keys(value, ['type', 'commandId', 'expectedRevision', 'text']) && revision(value.expectedRevision) && bounded(value.text, 2000, true);
    default: return false;
  }
}

export class MockSessionStore {
  private rooms = new Map<string, Room>();
  private listeners = new Map<string, Set<Listener>>();
  private statuses = new Map<string, Delivery<unknown>['status']>();
  connect(uid: string): SessionAdapter { return new MockSessionAdapter(this, uid); }
  status(roomId: string): Delivery<unknown>['status'] { return this.statuses.get(roomId) ?? 'live'; }
  setStatus(roomId: string, status: Delivery<unknown>['status']): void { this.statuses.set(roomId, status); this.publish(roomId); }
  room(roomId: string): Room | undefined { return this.rooms.get(roomId); }
  seedPrivateMarkers(roomId: string): void {
    const room = this.rooms.get(roomId); if (!room) return;
    room.gmNote = 'GM_ONLY';
    if (own(room.notes, 'p1')) room.notes.p1 = { schemaVersion: 1, revision: 0, text: 'PLAYER_ONLY' };
  }
  create(roomId: string, room: Room): void { this.rooms.set(roomId, room); }
  subscribe(roomId: string, listener: Listener): () => void {
    const set = this.listeners.get(roomId) ?? new Set<Listener>(); set.add(listener); this.listeners.set(roomId, set);
    return () => { set.delete(listener); if (!set.size) this.listeners.delete(roomId); };
  }
  publish(roomId: string): void { for (const listener of this.listeners.get(roomId) ?? []) this.emit(roomId, listener); }
  emit(roomId: string, listener: Listener): void {
    const room = this.room(roomId); if (!room) return;
    const admission = own(room.admissions, listener.uid);
    if (listener.uid !== room.owner && admission?.status !== 'admitted') {
      if (admission && (admission.revision !== listener.admissionRevision || admission.status !== listener.admissionStatus)) {
        listener.admissionRevision = admission.revision; listener.admissionStatus = admission.status;
        listener.emit({ type: 'admission', value: clone(admission) });
      }
      if (!admission || admission.status === 'revoked') {
        listener.emit({ type: 'accessLost', code: 'FORBIDDEN' });
        this.listeners.get(roomId)?.delete(listener);
      }
      return;
    }
    if (admission && (admission.revision !== listener.admissionRevision || admission.status !== listener.admissionStatus)) {
      listener.admissionRevision = admission.revision; listener.admissionStatus = admission.status;
      listener.emit({ type: 'admission', value: clone(admission) });
    }
    const delivery = <T>(value: T | null): Delivery<T> => ({ status: this.status(roomId), value: this.status(roomId) === 'loading' ? null : clone(value) });
    listener.emit({ type: 'scene', data: delivery(room.scene) });
    if (listener.uid === room.owner) {
      listener.emit({ type: 'gmRoster', data: delivery(room.admissions) });
      listener.emit({ type: 'gmDecisions', data: delivery(room.decisions) });
    } else if (admission?.role === 'player') {
      listener.emit({ type: 'decisions', data: delivery(own(room.decisions, listener.uid) ?? {}) });
      listener.emit({ type: 'sheet', data: delivery(own(room.sheets, listener.uid) ?? null) });
      listener.emit({ type: 'notes', data: delivery(own(room.notes, listener.uid) ?? null) });
    }
  }
}

class MockSessionAdapter implements SessionAdapter {
  private disposed = false;
  private unsubscribe = new Set<() => void>();
  private store: MockSessionStore;
  private uid: string;
  constructor(store: MockSessionStore, uid: string) { this.store = store; this.uid = uid; }
  private authenticated(): boolean { return !this.disposed && id(this.uid); }
  private access(roomId: string): { room?: Room; code?: Failure } {
    if (!this.authenticated()) return { code: 'UNAUTHENTICATED' };
    if (!id(roomId)) return { code: 'INVALID' };
    const room = this.store.room(roomId);
    if (!room) return { code: 'NOT_FOUND' };
    return { room };
  }
  private authorized(room: Room): boolean { return this.uid === room.owner || own(room.admissions, this.uid)?.status === 'admitted'; }
  private receipt(room: Room, commandId: string, payload: unknown): Result | null {
    const previous = own(own(room.receipts, this.uid) ?? {}, commandId);
    if (!previous) return null;
    return previous.payload === canonical(payload) ? clone(previous.result) : fail('COMMAND_ID_REUSED');
  }
  private save(room: Room, commandId: string, payload: unknown, result: Result): Result {
    const receipts = room.receipts[this.uid] ??= Object.create(null) as Record<string, Receipt>;
    receipts[commandId] = { payload: canonical(payload), result: clone(result) };
    return result;
  }
  async createRoom(roomId: string, commandId: string): Promise<{ ok: true; roomId: string } | { ok: false; code: Failure }> {
    if (!this.authenticated()) return fail('UNAUTHENTICATED');
    if (!id(roomId) || !id(commandId)) return fail('INVALID');
    const existing = this.store.room(roomId);
    if (existing) {
      if (existing.owner !== this.uid) return fail('FORBIDDEN');
      const prior = this.receipt(existing, commandId, { type: 'room.create', roomId });
      return prior?.ok ? { ok: true, roomId } : prior ?? fail('CONFLICT');
    }
    const room: Room = { owner: this.uid, epoch: 0, scene: null, gmNote: '', admissions: Object.create(null), decisions: Object.create(null), sheets: Object.create(null), notes: Object.create(null), receipts: Object.create(null), usedPrompts: new Set() };
    this.store.create(roomId, room);
    this.save(room, commandId, { type: 'room.create', roomId }, ok(commandId, 0));
    return { ok: true, roomId };
  }
  async requestAdmission(roomId: string, role: 'player' | 'presenter', name: string, commandId: string): Promise<Result> {
    const { room, code } = this.access(roomId); if (!room) return fail(code!);
    if (this.uid === room.owner) return fail('FORBIDDEN');
    if (this.store.status(roomId) !== 'live') return fail('DISCONNECTED');
    if (!id(commandId) || (role !== 'player' && role !== 'presenter') || !bounded(name, 200)) return fail('INVALID');
    const payload = { type: 'admission.request', role, name };
    const prior = this.receipt(room, commandId, payload); if (prior) return prior;
    const current = own(room.admissions, this.uid);
    if (current?.status === 'admitted' || (current && current.role !== role)) return fail('CONFLICT');
    const next: Admission = { schemaVersion: 1, revision: current ? current.revision + 1 : 0, role, status: 'pending', name };
    room.admissions[this.uid] = next;
    const result = this.save(room, commandId, payload, ok(commandId, next.revision)); this.store.publish(roomId); return result;
  }
  async decideAdmission(roomId: string, uid: string, decision: 'admit' | 'deny', expectedRevision: number, commandId: string): Promise<Result> {
    const { room, code } = this.access(roomId); if (!room) return fail(code!);
    if (this.uid !== room.owner) return fail('FORBIDDEN');
    if (this.store.status(roomId) !== 'live') return fail('DISCONNECTED');
    if (!id(uid) || !id(commandId) || !revision(expectedRevision) || (decision !== 'admit' && decision !== 'deny')) return fail('INVALID');
    const payload = { type: 'admission.decide', uid, decision, expectedRevision };
    const prior = this.receipt(room, commandId, payload); if (prior) return prior;
    const current = own(room.admissions, uid); if (!current) return fail('NOT_FOUND');
    if (current.status !== 'pending' || current.revision !== expectedRevision) return fail('CONFLICT');
    const next: Admission = { ...current, revision: current.revision + 1, status: decision === 'admit' ? 'admitted' : 'denied' };
    room.admissions[uid] = next;
    if (decision === 'admit' && current.role === 'player') {
      room.sheets[uid] ??= emptySheet(); room.notes[uid] ??= emptyNotes(); room.decisions[uid] ??= Object.create(null) as Record<string, Prompt>;
    }
    const result = this.save(room, commandId, payload, ok(commandId, next.revision)); this.store.publish(roomId); return result;
  }
  async revoke(roomId: string, uid: string, expectedRevision: number, commandId: string): Promise<Result> {
    const { room, code } = this.access(roomId); if (!room) return fail(code!);
    if (this.uid !== room.owner) return fail('FORBIDDEN');
    if (this.store.status(roomId) !== 'live') return fail('DISCONNECTED');
    if (!id(uid) || !id(commandId) || !revision(expectedRevision)) return fail('INVALID');
    const payload = { type: 'admission.revoke', uid, expectedRevision };
    const prior = this.receipt(room, commandId, payload); if (prior) return prior;
    const current = own(room.admissions, uid); if (!current) return fail('NOT_FOUND');
    if (current.status !== 'admitted' || current.revision !== expectedRevision) return fail('CONFLICT');
    const next: Admission = { ...current, revision: current.revision + 1, status: 'revoked' }; room.admissions[uid] = next;
    const result = this.save(room, commandId, payload, ok(commandId, next.revision)); this.store.publish(roomId); return result;
  }
  async send(roomId: string, command: Command): Promise<Result> {
    const { room, code } = this.access(roomId); if (!room) return fail(code!);
    if (!this.authorized(room)) return fail('FORBIDDEN');
    if (this.store.status(roomId) !== 'live') return fail('DISCONNECTED');
    if (object(command) && typeof command.type === 'string') {
      const gmCommand = command.type === 'scene.publish' || command.type === 'prompt.open' || command.type === 'prompt.close';
      const playerCommand = command.type === 'response.submit' || command.type === 'sheet.replace' || command.type === 'notes.replace';
      if ((gmCommand && this.uid !== room.owner) || (playerCommand && (this.uid === room.owner || own(room.admissions, this.uid)?.role !== 'player'))) return fail('FORBIDDEN');
    }
    if (!validCommand(command)) return fail('INVALID');
    const prior = this.receipt(room, command.commandId, command); if (prior) return prior;
    let entityRevision = 0;
    switch (command.type) {
      case 'scene.publish':
        if (command.expectedEpoch !== room.epoch) return fail('CONFLICT');
        room.epoch++; room.scene = { schemaVersion: 1, epoch: room.epoch, title: command.title, body: command.body }; entityRevision = room.epoch; break;
      case 'prompt.open': {
        if (own(room.admissions, command.recipientUid)?.status !== 'admitted' || own(room.admissions, command.recipientUid)?.role !== 'player') return fail('FORBIDDEN');
        if (!room.scene || command.sceneEpoch !== room.epoch) return fail('STALE_SCENE');
        if (room.usedPrompts.has(command.promptId)) return fail('CONFLICT');
        room.usedPrompts.add(command.promptId);
        const record = room.decisions[command.recipientUid] ??= Object.create(null) as Record<string, Prompt>;
        record[command.promptId] = { schemaVersion: 1, id: command.promptId, sceneEpoch: room.epoch, revision: 0, question: command.question, a: command.a, b: command.b, closed: false, response: null };
        break;
      }
      case 'prompt.close': {
        const prompt = own(own(room.decisions, command.recipientUid) ?? {}, command.promptId); if (!prompt) return fail('NOT_FOUND');
        if (prompt.sceneEpoch !== room.epoch) return fail('STALE_SCENE');
        if (prompt.closed) return fail('CLOSED');
        if (prompt.revision !== command.expectedRevision) return fail('CONFLICT');
        prompt.closed = true; entityRevision = ++prompt.revision; break;
      }
      case 'response.submit': {
        const prompt = own(own(room.decisions, this.uid) ?? {}, command.promptId); if (!prompt) return fail('NOT_FOUND');
        if (prompt.sceneEpoch !== room.epoch || command.sceneEpoch !== room.epoch) return fail('STALE_SCENE');
        if (prompt.response) return fail('ALREADY_ANSWERED');
        if (prompt.closed) return fail('CLOSED');
        if (prompt.revision !== command.expectedRevision) return fail('CONFLICT');
        prompt.response = { choice: command.choice, commandId: command.commandId }; entityRevision = ++prompt.revision; break;
      }
      case 'sheet.replace': {
        const sheet = own(room.sheets, this.uid); if (!sheet) return fail('NOT_FOUND');
        if (sheet.revision !== command.expectedRevision) return fail('CONFLICT');
        room.sheets[this.uid] = { schemaVersion: 1, revision: sheet.revision + 1, name: command.name, playbookId: command.playbookId, inventory: clone(command.inventory) }; entityRevision = sheet.revision + 1; break;
      }
      case 'notes.replace': {
        const notes = own(room.notes, this.uid); if (!notes) return fail('NOT_FOUND');
        if (notes.revision !== command.expectedRevision) return fail('CONFLICT');
        room.notes[this.uid] = { schemaVersion: 1, revision: notes.revision + 1, text: command.text }; entityRevision = notes.revision + 1; break;
      }
    }
    const result = this.save(room, command.commandId, command, ok(command.commandId, entityRevision)); this.store.publish(roomId); return result;
  }
  watch(roomId: string, onEvent: (event: SessionEvent) => void): () => void {
    if (!this.authenticated() || !id(roomId) || !this.store.room(roomId)) { onEvent({ type: 'accessLost', code: this.authenticated() ? 'FORBIDDEN' : 'UNAUTHENTICATED' }); return () => {}; }
    const listener: Listener = { uid: this.uid, emit: event => { if (!this.disposed) onEvent(clone(event)); } };
    const unsubscribe = this.store.subscribe(roomId, listener); this.unsubscribe.add(unsubscribe); this.store.emit(roomId, listener);
    return () => { unsubscribe(); this.unsubscribe.delete(unsubscribe); };
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; for (const unsubscribe of this.unsubscribe) unsubscribe(); this.unsubscribe.clear(); }
}
