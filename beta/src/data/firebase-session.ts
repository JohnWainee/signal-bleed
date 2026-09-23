import type { Auth } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { Database, DataSnapshot } from 'firebase/database';
import { get, onValue, ref } from 'firebase/database';
import type { Functions } from 'firebase/functions';
import { httpsCallable } from 'firebase/functions';
import type { Admission, Command, Delivery, Failure, Notes, Prompt, Result, Scene, SessionAdapter, SessionEvent, Sheet } from '../session/model.ts';

export type RoomCommand = Command | { type: 'room.create' | 'room.close'; commandId: string } | { type: 'admission.request'; commandId: string; role: 'player' | 'presenter'; name: string } | { type: 'admission.decide'; commandId: string; uid: string; decision: 'admit' | 'deny'; expectedRevision: number } | { type: 'admission.revoke'; commandId: string; uid: string; expectedRevision: number };
export type RoomStatus = { ok: true; closed: boolean; limits: { admissions: number; prompts: number; receipts: number; bytes: number; closeReserveBytes: number }; usage: { admissions: number; prompts: number; receipts: number; bytes: number } } | { ok: false; code: Failure };
const statusFailed = (code: Failure): RoomStatus => ({ ok: false, code });
type Projection = Extract<SessionEvent, { data: Delivery<unknown> }>;
const id = (value: string): boolean => /^[A-Za-z0-9_-]{1,128}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value);
const failed = (code: Failure): Result => ({ ok: false, code });
const normalize = (value: unknown): Result => {
  if (value && typeof value === 'object' && 'ok' in value) {
    const result = value as Result;
    if (result.ok === true && typeof result.commandId === 'string' && Number.isSafeInteger(result.entityRevision)) return result;
    if (result.ok === false && typeof result.code === 'string') return result;
  }
  return failed('DISCONNECTED');
};
const failureFromError = (error: unknown): Failure => {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  if (code.includes('unauthenticated')) return 'UNAUTHENTICATED';
  if (code.includes('permission-denied')) return 'FORBIDDEN';
  return 'DISCONNECTED';
};
const promptMap = (value: unknown): Record<string, Prompt> => Object.fromEntries(
  Object.entries(value && typeof value === 'object' ? value : {}).map(([key, prompt]) => [key, { ...(prompt as Prompt), response: (prompt as Prompt).response ?? null }]),
);
const projection = (type: Projection['type'], value: unknown): unknown => {
  if (type === 'decisions') return promptMap(value);
  if (type === 'gmDecisions') return Object.fromEntries(Object.entries(value && typeof value === 'object' ? value : {}).map(([uid, prompts]) => [uid, promptMap(prompts)]));
  if (type === 'gmRoster') return value ?? {};
  if (type === 'sheet' && value && typeof value === 'object') {
    const sheet = value as Sheet;
    return { ...sheet, playbookId: sheet.playbookId ?? null, inventory: Array.isArray(sheet.inventory) ? sheet.inventory : [] };
  }
  return value;
};

export class FirebaseSessionAdapter implements SessionAdapter {
  private readonly auth: Auth;
  private readonly database: Database;
  private readonly call: ReturnType<typeof httpsCallable<{ roomId: string; command: RoomCommand }, Result>>;
  private readonly statusCall: ReturnType<typeof httpsCallable<{ roomId: string }, RoomStatus>>;
  private readonly watchers = new Set<() => void>();
  private disposed = false;

  constructor(auth: Auth, database: Database, functions: Functions) {
    this.auth = auth;
    this.database = database;
    this.call = httpsCallable(functions, 'betaRoomCommand');
    this.statusCall = httpsCallable(functions, 'betaRoomStatus');
  }

  private async command(roomId: string, command: RoomCommand): Promise<Result> {
    if (this.disposed || !this.auth.currentUser) return failed('UNAUTHENTICATED');
    if (!id(roomId)) return failed('INVALID');
    try { return normalize((await this.call({ roomId, command })).data); }
    catch (error) { return failed(failureFromError(error)); }
  }

  sendRoomCommand(roomId: string, command: RoomCommand): Promise<Result> { return this.command(roomId, command); }

  async roomStatus(roomId: string): Promise<RoomStatus> {
    if (this.disposed || !this.auth.currentUser) return statusFailed('UNAUTHENTICATED');
    if (!id(roomId)) return statusFailed('INVALID');
    try {
      const value = (await this.statusCall({ roomId })).data;
      if (value?.ok === true && typeof value.closed === 'boolean' && value.usage && value.limits) return value;
      if (value?.ok === false && typeof value.code === 'string') return value;
      return statusFailed('DISCONNECTED');
    } catch (error) { return statusFailed(failureFromError(error)); }
  }

  async createRoom(roomId: string, commandId: string): Promise<{ ok: true; roomId: string } | { ok: false; code: Failure }> {
    const result = await this.command(roomId, { type: 'room.create', commandId });
    return result.ok ? { ok: true, roomId } : result;
  }
  requestAdmission(roomId: string, role: 'player' | 'presenter', name: string, commandId: string): Promise<Result> {
    return this.command(roomId, { type: 'admission.request', commandId, role, name });
  }
  decideAdmission(roomId: string, uid: string, decision: 'admit' | 'deny', expectedRevision: number, commandId: string): Promise<Result> {
    return this.command(roomId, { type: 'admission.decide', commandId, uid, decision, expectedRevision });
  }
  revoke(roomId: string, uid: string, expectedRevision: number, commandId: string): Promise<Result> {
    return this.command(roomId, { type: 'admission.revoke', commandId, uid, expectedRevision });
  }
  send(roomId: string, command: Command): Promise<Result> { return this.command(roomId, command); }

  watch(roomId: string, onEvent: (event: SessionEvent) => void): () => void {
    const uid = this.auth.currentUser?.uid;
    if (this.disposed || !uid || !id(roomId)) {
      onEvent({ type: 'accessLost', code: uid ? 'FORBIDDEN' : 'UNAUTHENTICATED' });
      return () => {};
    }
    const room = `betaRooms/v1/${roomId}`;
    let closed = false;
    let activeRole: 'gm' | 'player' | 'presenter' | null = null;
    const privateStops: Array<() => void> = [];
    const stops: Array<() => void> = [];
    const last = new Map<Projection['type'], unknown>();
    const emit = (event: SessionEvent) => { if (!closed && !this.disposed) onEvent(event); };
    const clearPrivate = () => { for (const stop of privateStops.splice(0)) stop(); activeRole = null; last.clear(); };
    const stopAll = () => { if (closed) return; clearPrivate(); closed = true; for (const stop of stops.splice(0)) stop(); this.watchers.delete(stopAll); };
    const lose = (code: 'FORBIDDEN' | 'UNAUTHENTICATED') => { clearPrivate(); emit({ type: 'accessLost', code }); stopAll(); };
    const subscribe = <T>(path: string, type: Projection['type'], group: Array<() => void>) => {
      const latest = { seen: false };
      const stop = onValue(ref(this.database, `${room}/${path}`), (snapshot: DataSnapshot) => {
        const value = projection(type, snapshot.val()) as T | null;
        latest.seen = true;
        last.set(type, value);
        emit({ type, data: { status: 'live', value } } as SessionEvent);
      }, error => {
        const code = failureFromError(error);
        if (code === 'FORBIDDEN' || code === 'UNAUTHENTICATED') { lose(code); return; }
        emit({ type, data: { status: 'disconnected', value: latest.seen ? (last.get(type) as T | null) : null } } as SessionEvent);
      });
      group.push(stop);
    };
    const activate = (role: 'gm' | 'player' | 'presenter') => {
      if (closed || activeRole === role) return;
      clearPrivate(); activeRole = role;
      subscribe<Scene>('shared/scene', 'scene', privateStops);
      if (role === 'gm') {
        subscribe<Record<string, Admission>>('admissions', 'gmRoster', privateStops);
        subscribe<Record<string, Record<string, Prompt>>>('decisions', 'gmDecisions', privateStops);
      } else if (role === 'player') {
        subscribe<Record<string, Prompt>>(`decisions/${uid}`, 'decisions', privateStops);
        subscribe<Sheet>(`personal/${uid}/sheet`, 'sheet', privateStops);
        subscribe<Notes>(`personal/${uid}/notes`, 'notes', privateStops);
      }
    };
    this.watchers.add(stopAll);
    stops.push(onAuthStateChanged(this.auth, user => { if (!user || user.uid !== uid) lose('UNAUTHENTICATED'); }));
    stops.push(onValue(ref(this.database, '.info/connected'), snapshot => {
      if (snapshot.val() === false) {
        for (const [type, value] of last) emit({ type, data: { status: 'disconnected', value } } as SessionEvent);
      }
    }));
    const admissionStop = onValue(ref(this.database, `${room}/admissions/${uid}`), snapshot => {
      const admission = snapshot.val() as Admission | null;
      if (admission) emit({ type: 'admission', value: admission });
      if (admission?.status === 'admitted') { activate(admission.role); return; }
      if (activeRole && activeRole !== 'gm') clearPrivate();
      if (admission?.status === 'revoked') lose('FORBIDDEN');
      if (!admission) {
        void get(ref(this.database, `${room}/owner`)).then(owner => {
          if (closed) return;
          if (owner.val() === uid) activate('gm');
          else lose('FORBIDDEN');
        }).catch(() => { /* An applicant may request admission after watch begins. */ });
      }
    }, error => { if (!closed) lose(failureFromError(error) === 'UNAUTHENTICATED' ? 'UNAUTHENTICATED' : 'FORBIDDEN'); });
    stops.push(admissionStop);
    return stopAll;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const stop of [...this.watchers]) stop();
  }
}
