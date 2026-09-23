import { get, ref } from 'firebase/database';
import { bootstrapFirebase } from '../data/firebase-bootstrap.ts';
import type { RoomCommand, RoomStatus } from '../data/firebase-session.ts';
import type { Admission, Notes, Prompt, Scene, SessionEvent, Sheet } from '../session/model.ts';

const root = document.querySelector<HTMLDivElement>('#app');
const surface = document.body.dataset.surface;
const roomId = new URLSearchParams(location.search).get('room') ?? '';
const validId = (value: string) => /^[A-Za-z0-9_-]{1,128}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value);
const commandId = () => crypto.randomUUID().replaceAll('-', '');
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, value = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); node.textContent = value; return node;
};
const field = (label: string, value = '') => {
  const wrap = el('label', `${label} `); const input = el('input'); input.value = value; wrap.append(input); return { wrap, input };
};
const button = (label: string, action: () => void | Promise<void>) => {
  const node = el('button', label); node.type = 'button';
  node.addEventListener('click', () => { void action(); }); return node;
};

export async function startLive() {
  if (!root || !surface || !['gm', 'play', 'present'].includes(surface)) throw new Error('Unknown beta surface');
  if (!validId(roomId)) { root.textContent = 'Open this beta route with a valid ?room= identifier.'; return; }
  const { uid, database, adapter, demo } = await bootstrapFirebase();
  const path = `betaRooms/v1/${roomId}`;
  const owner = await get(ref(database, `${path}/owner`)).then(snapshot => snapshot.val() === uid).catch(() => false);
  if (surface === 'gm' && !owner) {
    // An absent room can be created; another identity cannot claim an existing room.
    const admission = await get(ref(database, `${path}/admissions/${uid}`)).then(snapshot => snapshot.val()).catch(() => null);
    if (admission) { root.textContent = 'This identity is not the GM. Use a separate browser profile for this role.'; return; }
  }
  if (surface !== 'gm' && owner) {
    root.textContent = 'The GM identity cannot use a player or presenter surface. Open an isolated browser profile.'; return;
  }
  let admission: Admission | null = null;
  if (surface !== 'gm') admission = await get(ref(database, `${path}/admissions/${uid}`)).then(snapshot => snapshot.val() as Admission | null).catch(() => null);
  if (admission && admission.role !== (surface === 'play' ? 'player' : 'presenter')) {
    root.textContent = 'This identity has another room role. Open an isolated browser profile.'; return;
  }
  let scene: Scene | null = null;
  let roster: Record<string, Admission> = {};
  let gmDecisions: Record<string, Record<string, Prompt>> = {};
  let decisions: Record<string, Prompt> = {};
  let sheet: Sheet | null = null;
  let notes: Notes | null = null;
  let roomStatus: Extract<RoomStatus, { ok: true }> | null = null;
  let message = demo ? 'Local emulator beta · no production connection' : 'Beta room connected';
  let stop: (() => void) | null = null;
  let accessLost = false;
  let busy = false;
  const pendingKey = `SB:beta:pending:${roomId}:${uid}`;
  const clearStoredPending = () => { try { sessionStorage.removeItem(pendingKey); } catch { /* Private view must still clear. */ } };
  let pending: { label: string; command: RoomCommand } | null = null;
  try {
    const stored = sessionStorage.getItem(pendingKey);
    if (stored) {
      const value: unknown = JSON.parse(stored);
      if (value && typeof value === 'object' && 'label' in value && 'command' in value && typeof value.label === 'string' &&
        value.command && typeof value.command === 'object' && 'commandId' in value.command && typeof value.command.commandId === 'string') {
        pending = value as { label: string; command: RoomCommand };
      } else clearStoredPending();
    }
  } catch { /* Storage may be unavailable; a fresh command is blocked below if it cannot be retained. */ }
  const status = el('p'); status.setAttribute('role', 'status');
  const report = (value: string) => { message = value; render(); };
  const refreshStatus = async () => {
    if (surface !== 'gm' || !owner || accessLost) return;
    const result = await adapter.roomStatus(roomId);
    if (result.ok) { roomStatus = result; render(); }
  };
  const retry = async () => {
    if (!pending || busy || accessLost) return;
    busy = true; render();
    try {
      const command = pending.command;
      const result = await adapter.sendRoomCommand(roomId, command);
      if (result.ok || result.code !== 'DISCONNECTED') {
        pending = null;
        clearStoredPending();
      }
      if (result.ok && command.type === 'admission.request') subscribe();
      if (result.ok && command.type === 'room.create') location.reload();
      if (surface === 'gm' && owner) await refreshStatus();
      report(result.ok ? (command.type === 'room.close' ? 'Room closed. Existing records are read-only.' : 'Saved.') :
        result.code === 'ROOM_FULL' ? 'Room at capacity. No change was saved; request another preassigned beta slot.' :
        result.code === 'ROOM_CLOSED' ? 'Room is closed. Existing records are read-only.' :
        `Not saved: ${result.code ?? 'unknown error'}`);
    } catch { report('Connection interrupted. Retry the exact pending command.'); }
    finally { busy = false; render(); }
  };
  const run = (label: string, command: RoomCommand) => {
    if (pending || busy || accessLost) return;
    try { sessionStorage.setItem(pendingKey, JSON.stringify({ label, command })); }
    catch { report('Browser session storage is unavailable; command was not sent.'); return; }
    pending = { label, command }; void retry();
  };
  const subscribe = () => {
    stop?.();
    stop = adapter.watch(roomId, (event: SessionEvent) => {
      if (event.type === 'accessLost') {
        accessLost = true; pending = null; clearStoredPending(); admission = null;
        scene = null; roster = {}; gmDecisions = {}; decisions = {}; sheet = null; notes = null;
        report(`Access lost: ${event.code}. Private views cleared.`); return;
      }
      if (event.type === 'admission') admission = event.value;
      if (event.type === 'scene') scene = event.data.value;
      if (event.type === 'gmRoster') { roster = event.data.value ?? {}; void refreshStatus(); }
      if (event.type === 'gmDecisions') gmDecisions = event.data.value ?? {};
      if (event.type === 'decisions') decisions = event.data.value ?? {};
      if (event.type === 'sheet') sheet = event.data.value;
      if (event.type === 'notes') notes = event.data.value;
      render();
    });
  };
  const render = () => {
    if (!root) return;
    root.replaceChildren();
    root.append(el('h1', `Signal Bleed beta / ${surface}`), el('p', `Room ${roomId} · identity ${uid}`));
    status.textContent = message; root.append(status);
    if (accessLost) return;
    if (pending) {
      root.append(el('p', `${pending.label} is ${busy ? 'in progress' : 'unconfirmed'}. Do not start another command.`));
      if (!busy) root.append(button('Retry exact pending command', retry));
      return;
    }
    if (surface === 'gm' && !owner) {
      root.append(button('Create this room', () => {
        const id = commandId();
        run('Room creation', { type: 'room.create', commandId: id });
      }));
      return;
    }
    if (surface === 'gm' && roomStatus) {
      const { usage, limits } = roomStatus;
      root.append(el('p', `Room capacity: ${usage.admissions}/${limits.admissions} applicants · ${usage.prompts}/${limits.prompts} prompts · ${usage.receipts}/${limits.receipts} receipts · ${Math.ceil(usage.bytes / 1024)}/${Math.floor(limits.bytes / 1024)} KiB`));
      if (Object.entries(usage).some(([key, value]) => value >= 0.9 * limits[key as keyof typeof limits])) {
        root.append(el('p', 'This room is nearing its closed-beta limit. Ask for another preassigned slot before continuing.'));
      }
      if (roomStatus.closed) {
        root.append(el('p', 'Room closed. Existing scene and private views remain readable; new commands are disabled.'));
      }
    }
    if (surface !== 'gm' && admission?.status !== 'admitted') {
      root.append(el('p', `Admission: ${admission?.status ?? 'not requested'}`));
      if (!admission || admission.status === 'denied') {
        const { wrap, input } = field('Display name'); root.append(wrap);
        root.append(button('Request admission', () => {
          const name = input.value.trim(); const id = commandId();
          run('Admission request', { type: 'admission.request', commandId: id, role: surface === 'play' ? 'player' : 'presenter', name });
        }));
      }
      return;
    }
    root.append(el('h2', scene?.title ?? 'Waiting for a published scene'));
    if (scene) root.append(el('p', scene.body));
    if (surface === 'gm') {
      const closed = roomStatus?.closed === true;
      if (!closed) {
        const title = field('Scene title'); const body = field('Scene body'); root.append(title.wrap, body.wrap);
        root.append(button('Publish scene', () => {
          const command = { type: 'scene.publish' as const, commandId: commandId(), expectedEpoch: scene?.epoch ?? 0,
            title: title.input.value, body: body.input.value };
          run('Scene publication', command);
        }));
      }
      // Closed rooms stay read-only, not hidden: the roster and decisions below remain visible without action controls.
      const rosterSection = el('section'); rosterSection.append(el('h2', 'Admissions'));
      for (const [memberUid, record] of Object.entries(roster)) {
        const row = el('p', `${record.name} · ${record.role} · ${record.status} · ${memberUid}`);
        if (!closed && record.status === 'pending') row.append(button('Admit', () => {
          const id = commandId(); run('Admission decision', { type: 'admission.decide', commandId: id, uid: memberUid, decision: 'admit', expectedRevision: record.revision });
        }));
        if (!closed && record.status === 'admitted') row.append(button('Revoke', () => {
          const id = commandId(); run('Revocation', { type: 'admission.revoke', commandId: id, uid: memberUid, expectedRevision: record.revision });
        }));
        rosterSection.append(row);
      }
      root.append(rosterSection);
      if (!closed) {
        const recipient = field('Player UID'); const question = field('Question'); const a = field('Choice A'); const b = field('Choice B');
        root.append(recipient.wrap, question.wrap, a.wrap, b.wrap);
        root.append(button('Send private prompt', () => {
          const command = { type: 'prompt.open' as const, commandId: commandId(), recipientUid: recipient.input.value.trim(),
            promptId: commandId(), sceneEpoch: scene?.epoch ?? 0,
            question: question.input.value, a: a.input.value, b: b.input.value };
          run('Private prompt', command);
        }));
      }
      for (const [recipientUid, prompts] of Object.entries(gmDecisions)) {
        for (const prompt of Object.values(prompts)) {
          const row = el('p', `${recipientUid}: ${prompt.question} · ${prompt.response?.choice ?? (prompt.closed ? 'closed' : 'unanswered')}`);
          if (!closed && !prompt.closed && !prompt.response) row.append(button('Close prompt', () => {
            const id = commandId(); run('Prompt closure', {
              type: 'prompt.close', commandId: id, recipientUid, promptId: prompt.id, expectedRevision: prompt.revision,
            });
          }));
          root.append(row);
        }
      }
      if (!closed) root.append(button('Close room (read-only)', () => {
        if (window.confirm('Close this beta room? New commands will be rejected; existing records remain readable.')) {
          run('Room closure', { type: 'room.close', commandId: commandId() });
        }
      }));
    }
    if (surface === 'play') {
      root.append(el('h2', 'Your private prompts'));
      const closed = admission?.roomClosed === true;
      if (closed) root.append(el('p', 'Room closed. Existing records are read-only.'));
      for (const prompt of Object.values(decisions).sort((a, b) => a.id.localeCompare(b.id))) {
        const panel = el('section'); panel.append(el('p', prompt.question));
        if (prompt.response) panel.append(el('p', `Answered ${prompt.response.choice}`));
        else if (!closed && !prompt.closed && prompt.sceneEpoch === scene?.epoch) {
          for (const choice of ['A', 'B'] as const) panel.append(button(`${choice}: ${choice === 'A' ? prompt.a : prompt.b}`, () => {
            const command = { type: 'response.submit' as const, commandId: commandId(), promptId: prompt.id,
              sceneEpoch: prompt.sceneEpoch, expectedRevision: prompt.revision, choice };
            run('Prompt response', command);
          }));
        } else panel.append(el('p', 'Closed or expired'));
        root.append(panel);
      }
      root.append(el('p', `Character: ${sheet?.name || 'not set'} · private notes: ${notes?.text || 'empty'}`));
    }
  };
  if (owner || admission) subscribe();
  if (owner) void refreshStatus();
  render();
  window.addEventListener('pagehide', () => { stop?.(); adapter.dispose(); }, { once: true });
}
