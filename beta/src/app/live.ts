import { get, ref } from 'firebase/database';
import { bootstrapFirebase } from '../data/firebase-bootstrap.ts';
import type { RoomCommand, RoomStatus } from '../data/firebase-session.ts';
import type { Admission, Notes, Prompt, Scene, SessionEvent, Sheet } from '../session/model.ts';

type Surface = 'gm' | 'play' | 'present';
type ConnectionState = 'loading' | 'live' | 'disconnected';
type Pending = { label: string; command: RoomCommand };

const root = document.querySelector<HTMLDivElement>('#app');
const route = document.body.dataset.surface;
const surface: Surface | null = route === 'gm' || route === 'play' || route === 'present' ? route : null;
const roomId = new URLSearchParams(location.search).get('room') ?? '';
const validId = (value: string) => /^[A-Za-z0-9_-]{1,128}$/.test(value) && !['__proto__', 'prototype', 'constructor'].includes(value);
const commandId = () => crypto.randomUUID().replaceAll('-', '');
const el = <K extends keyof HTMLElementTagNameMap>(tag: K, value = ''): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag); node.textContent = value; return node;
};
const button = (label: string, action: () => void | Promise<void>, className = '') => {
  const node = el('button', label); node.type = 'button'; node.className = className;
  node.addEventListener('click', () => { void action(); }); return node;
};
const section = (id: string, className = '') => {
  const node = el('section'); node.className = className; node.setAttribute('aria-labelledby', id);
  const heading = el('h2'); heading.id = id; node.append(heading); return { node, heading };
};
const inputField = (labelText: string, value = '', maxLength?: number) => {
  const label = el('label'); const text = el('span', labelText); const input = el('input');
  input.value = value; if (maxLength) input.maxLength = maxLength; label.append(text, input); return { label, input };
};
const textField = (labelText: string, value = '', maxLength?: number) => {
  const label = el('label'); const text = el('span', labelText); const input = el('textarea');
  input.value = value; if (maxLength) input.maxLength = maxLength; label.append(text, input); return { label, input };
};
const badge = (value: string, kind = '') => { const node = el('span', value); node.className = `badge ${kind}`.trim(); return node; };

export async function startLive() {
  if (!root || !surface) throw new Error('Unknown beta surface');
  if (!validId(roomId)) { root.textContent = 'Open this beta route with a valid ?room= identifier.'; return; }
  const { uid, database, adapter, demo } = await bootstrapFirebase();
  const path = `betaRooms/v1/${roomId}`;
  const owner = await get(ref(database, `${path}/owner`)).then(snapshot => snapshot.val() === uid).catch(() => false);
  if (surface === 'gm' && !owner) {
    const otherRole = await get(ref(database, `${path}/admissions/${uid}`)).then(snapshot => snapshot.val()).catch(() => null);
    if (otherRole) { root.textContent = 'This identity is not the GM. Use a separate browser profile for this role.'; return; }
  }
  if (surface !== 'gm' && owner) { root.textContent = 'The GM identity cannot use a player or presenter surface. Open an isolated browser profile.'; return; }
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
  let connection: ConnectionState = 'loading';
  let message = demo ? 'Local emulator beta · no production connection' : 'Connecting to beta room…';
  let stop: (() => void) | null = null;
  let accessLost = false;
  let busy = false;
  let sceneDraft = { title: '', body: '', previewed: false };
  let promptDraft = { recipientUid: '', question: '', a: '', b: '' };
  const pendingKey = `SB:beta:pending:${roomId}:${uid}`;
  const clearStoredPending = () => { try { sessionStorage.removeItem(pendingKey); } catch { /* Private view must still clear. */ } };
  let pending: Pending | null = null;
  try {
    const stored = sessionStorage.getItem(pendingKey);
    if (stored) {
      const value: unknown = JSON.parse(stored);
      if (value && typeof value === 'object' && 'label' in value && 'command' in value && typeof value.label === 'string' &&
        value.command && typeof value.command === 'object' && 'commandId' in value.command && typeof value.command.commandId === 'string') pending = value as Pending;
      else clearStoredPending();
    }
  } catch { /* Storage failure blocks a fresh command in run(). */ }
  const status = el('p'); status.className = 'status'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const report = (value: string) => { message = value; render(); };
  const refreshStatus = async () => {
    if (surface !== 'gm' || !owner || accessLost) return;
    const result = await adapter.roomStatus(roomId); if (result.ok) roomStatus = result; render();
  };
  const retry = async () => {
    if (!pending || busy || accessLost) return;
    busy = true; render();
    try {
      const command = pending.command; const result = await adapter.sendRoomCommand(roomId, command);
      if (result.ok || result.code !== 'DISCONNECTED') { pending = null; clearStoredPending(); }
      if (result.ok && command.type === 'admission.request') subscribe();
      if (result.ok && command.type === 'room.create') location.reload();
      if (result.ok && command.type === 'scene.publish') sceneDraft = { title: '', body: '', previewed: false };
      if (result.ok && command.type === 'prompt.open') promptDraft = { recipientUid: '', question: '', a: '', b: '' };
      if (surface === 'gm' && owner) await refreshStatus();
      report(result.ok ? (command.type === 'room.close' ? 'Room closed. Existing records are read-only.' : 'Saved and confirmed.') :
        result.code === 'ROOM_FULL' ? 'Room at capacity. No change was saved; request another preassigned beta slot.' :
        result.code === 'ROOM_CLOSED' ? 'Room is closed. Existing records are read-only.' :
        result.code === 'DISCONNECTED' ? 'Connection interrupted. Retry the exact pending command.' : `Not saved: ${result.code}`);
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
        accessLost = true; pending = null; clearStoredPending(); admission = null; scene = null; roster = {}; gmDecisions = {}; decisions = {}; sheet = null; notes = null;
        connection = 'disconnected'; report(`Access lost: ${event.code}. Private views cleared.`); return;
      }
      if (event.type === 'admission') admission = event.value;
      if ('data' in event) connection = event.data.status;
      if (event.type === 'scene') scene = event.data.value;
      if (event.type === 'gmRoster') { roster = event.data.value ?? {}; void refreshStatus(); }
      if (event.type === 'gmDecisions') gmDecisions = event.data.value ?? {};
      if (event.type === 'decisions') decisions = event.data.value ?? {};
      if (event.type === 'sheet') sheet = event.data.value;
      if (event.type === 'notes') notes = event.data.value;
      if (connection === 'live') message = demo ? 'Local emulator beta · changes confirmed' : 'Beta room connected';
      if (connection === 'disconnected') message = 'Disconnected · showing last-confirmed information';
      render();
    });
  };

  const renderHeader = () => {
    const header = el('header'); header.className = 'masthead'; header.append(el('p', 'SIGNAL BLEED / HAWAIʻI'));
    header.append(el('h1', surface === 'gm' ? 'Direct the session' : surface === 'play' ? 'Your next move' : 'The shared scene'));
    const roomLine = el('p', `Room ${roomId}`); roomLine.className = 'room-line';
    if (surface !== 'present') { roomLine.dataset.identity = uid; roomLine.append(document.createTextNode(` · identity ${uid}`)); }
    roomLine.append(badge(connection, connection)); header.append(roomLine, status); return header;
  };
  const renderScene = (presenter = false) => {
    const panel = el('section'); panel.className = `scene ${presenter ? 'presenter-scene' : ''}`; panel.setAttribute('aria-live', 'polite');
    panel.append(el('p', scene ? `SCENE / ${String(scene.epoch).padStart(2, '0')}` : 'SCENE / WAITING'));
    panel.append(el('h2', scene?.title ?? 'Waiting for the GM'), el('p', scene?.body ?? 'The shared scene will appear here when it is published.')); return panel;
  };
  const renderPending = () => {
    if (!pending) return null;
    const panel = el('section'); panel.className = 'callout pending'; panel.append(el('h2', busy ? 'Sending command' : 'Confirmation needed'));
    panel.append(el('p', `${pending.label} is ${busy ? 'in progress' : 'unconfirmed'}. Do not start another command.`));
    if (!busy) panel.append(button('Retry exact pending command', retry, 'primary')); return panel;
  };
  const renderGm = (main: HTMLElement) => {
    if (!owner) {
      const panel = section('create-room'); panel.heading.textContent = 'Assigned room'; panel.node.append(el('p', 'Create this room only if the invitation slot was assigned to this GM identity.'));
      panel.node.append(button('Create this room', () => run('Room creation', { type: 'room.create', commandId: commandId() }), 'primary')); main.append(panel.node); return;
    }
    main.append(renderScene());
    if (roomStatus) {
      const { usage, limits } = roomStatus; const capacity = section('room-capacity', 'capacity'); capacity.heading.textContent = 'Room capacity'; const list = el('ul');
      for (const [label, value, limit] of [['Applicants', usage.admissions, limits.admissions], ['Prompts', usage.prompts, limits.prompts], ['Receipts', usage.receipts, limits.receipts]]) {
        const item = el('li'); item.append(el('span', String(label)), el('strong', `${value}/${limit}`)); list.append(item);
      }
      const bytes = el('li'); bytes.append(el('span', 'Storage guard'), el('strong', `${Math.ceil(usage.bytes / 1024)}/${Math.floor(limits.bytes / 1024)} KiB`)); list.append(bytes); capacity.node.append(list);
      if (Object.entries(usage).some(([key, value]) => value >= 0.9 * limits[key as keyof typeof limits])) capacity.node.append(el('p', 'This room is nearing its closed-beta limit. Request another assigned slot before continuing.'));
      if (roomStatus.closed) capacity.node.append(el('p', 'Room closed. Existing scene and private views remain readable; new commands are disabled.')); main.append(capacity.node);
    }
    const closed = roomStatus?.closed === true;
    if (!closed) {
      const compose = section('scene-composer', 'composer'); compose.heading.textContent = 'Compose the next scene';
      const title = inputField('Scene title', sceneDraft.title, 200); const body = textField('Scene body', sceneDraft.body, 2000);
      title.input.addEventListener('input', () => { sceneDraft.title = title.input.value; sceneDraft.previewed = false; }); body.input.addEventListener('input', () => { sceneDraft.body = body.input.value; sceneDraft.previewed = false; }); compose.node.append(title.label, body.label);
      compose.node.append(button('Preview scene', () => {
        sceneDraft.title = title.input.value.trim(); sceneDraft.body = body.input.value.trim();
        if (!sceneDraft.title || !sceneDraft.body) { report('Add a scene title and body before previewing.'); return; } sceneDraft.previewed = true; render();
      }));
      if (sceneDraft.previewed) {
        const preview = el('div'); preview.className = 'scene preview'; preview.append(badge('PREVIEW · NOT PUBLISHED'), el('h3', sceneDraft.title), el('p', sceneDraft.body));
        compose.node.append(preview, button('Publish previewed scene', () => run('Scene publication', { type: 'scene.publish', commandId: commandId(), expectedEpoch: scene?.epoch ?? 0, title: sceneDraft.title, body: sceneDraft.body }), 'primary'));
      }
      main.append(compose.node);
    }
    const admissions = section('admissions'); admissions.heading.textContent = 'Admissions'; const rosterEntries = Object.entries(roster).sort(([, a], [, b]) => a.name.localeCompare(b.name));
    if (!rosterEntries.length) admissions.node.append(el('p', 'No admission requests yet.'));
    for (const [memberUid, record] of rosterEntries) {
      const row = el('article'); row.className = 'roster-row'; const summary = el('div'); summary.append(el('h3', record.name), badge(record.role), badge(record.status, record.status)); row.append(summary, el('p', `Identity ${memberUid}`));
      if (!closed && record.status === 'pending') { row.append(button('Admit', () => run('Admission decision', { type: 'admission.decide', commandId: commandId(), uid: memberUid, decision: 'admit', expectedRevision: record.revision }), 'primary')); row.append(button('Deny', () => run('Admission decision', { type: 'admission.decide', commandId: commandId(), uid: memberUid, decision: 'deny', expectedRevision: record.revision }))); }
      if (!closed && record.status === 'admitted') row.append(button('Revoke', () => run('Revocation', { type: 'admission.revoke', commandId: commandId(), uid: memberUid, expectedRevision: record.revision }), 'danger')); admissions.node.append(row);
    }
    main.append(admissions.node);
    if (!closed) {
      const players = rosterEntries.filter(([, value]) => value.status === 'admitted' && value.role === 'player'); const prompt = section('private-prompt', 'composer'); prompt.heading.textContent = 'Send a private choice';
      if (!players.length) prompt.node.append(el('p', 'Admit a player before composing a private prompt.'));
      else {
        const recipientLabel = el('label'); recipientLabel.append(el('span', 'Prompt recipient')); const recipient = el('select'); const empty = el('option', 'Choose an admitted player'); empty.value = ''; recipient.append(empty);
        for (const [playerUid, player] of players) { const option = el('option', player.name); option.value = playerUid; recipient.append(option); } recipient.value = players.some(([id]) => id === promptDraft.recipientUid) ? promptDraft.recipientUid : ''; recipient.addEventListener('change', () => { promptDraft.recipientUid = recipient.value; }); recipientLabel.append(recipient);
        const question = textField('Question', promptDraft.question, 2000); const a = inputField('Choice A', promptDraft.a, 200); const b = inputField('Choice B', promptDraft.b, 200);
        question.input.addEventListener('input', () => { promptDraft.question = question.input.value; }); a.input.addEventListener('input', () => { promptDraft.a = a.input.value; }); b.input.addEventListener('input', () => { promptDraft.b = b.input.value; }); prompt.node.append(recipientLabel, question.label, a.label, b.label);
        prompt.node.append(button('Send private prompt', () => {
          promptDraft = { recipientUid: recipient.value, question: question.input.value.trim(), a: a.input.value.trim(), b: b.input.value.trim() };
          if (!promptDraft.recipientUid || !promptDraft.question || !promptDraft.a || !promptDraft.b) { report('Choose a player and complete every prompt field.'); return; }
          run('Private prompt', { type: 'prompt.open', commandId: commandId(), recipientUid: promptDraft.recipientUid, promptId: commandId(), sceneEpoch: scene?.epoch ?? 0, question: promptDraft.question, a: promptDraft.a, b: promptDraft.b });
        }, 'primary'));
      }
      main.append(prompt.node);
    }
    const responses = section('responses'); responses.heading.textContent = 'Private response status'; let promptCount = 0;
    for (const [recipientUid, prompts] of Object.entries(gmDecisions)) for (const prompt of Object.values(prompts).sort((a, b) => b.id.localeCompare(a.id))) {
      promptCount++; const row = el('article'); row.className = 'response-row'; row.append(el('h3', roster[recipientUid]?.name ?? 'Unknown player'), el('p', prompt.question)); row.append(badge(prompt.response ? `Answered ${prompt.response.choice}` : prompt.closed ? 'Closed' : prompt.sceneEpoch !== scene?.epoch ? 'Expired' : 'Awaiting response', prompt.response ? 'admitted' : 'pending'));
      if (!closed && !prompt.closed && !prompt.response && prompt.sceneEpoch === scene?.epoch) row.append(button('Close prompt', () => run('Prompt closure', { type: 'prompt.close', commandId: commandId(), recipientUid, promptId: prompt.id, expectedRevision: prompt.revision }))); responses.node.append(row);
    }
    if (!promptCount) responses.node.append(el('p', 'No private prompts have been sent.')); main.append(responses.node);
    if (!closed) {
      const danger = section('room-actions', 'danger-zone'); danger.heading.textContent = 'End this room'; danger.node.append(el('p', 'Closing is permanent and read-only. Existing records remain available for export.'));
      danger.node.append(button('Close room (read-only)', () => { if (window.confirm('Close this beta room? New commands will be rejected; existing records remain readable.')) run('Room closure', { type: 'room.close', commandId: commandId() }); }, 'danger')); main.append(danger.node);
    }
  };
  const renderPlayer = (main: HTMLElement) => {
    main.append(renderScene()); const promptPanel = section('your-prompts'); promptPanel.heading.textContent = 'Your private prompts'; const closed = admission?.roomClosed === true;
    if (closed) promptPanel.node.append(el('p', 'Room closed. Existing records are read-only.')); const prompts = Object.values(decisions).sort((a, b) => b.id.localeCompare(a.id)); if (!prompts.length) promptPanel.node.append(el('p', 'No private choices are waiting.'));
    for (const prompt of prompts) {
      const panel = el('article'); panel.className = 'decision'; panel.append(el('h3', prompt.question));
      if (prompt.response) panel.append(badge(`Answered ${prompt.response.choice}`, 'admitted'));
      else if (!closed && !prompt.closed && prompt.sceneEpoch === scene?.epoch) {
        const choices = el('div'); choices.className = 'choice-grid'; for (const choice of ['A', 'B'] as const) choices.append(button(`${choice} · ${choice === 'A' ? prompt.a : prompt.b}`, () => run('Prompt response', { type: 'response.submit', commandId: commandId(), promptId: prompt.id, sceneEpoch: prompt.sceneEpoch, expectedRevision: prompt.revision, choice }), 'choice')); panel.append(choices);
      } else panel.append(badge(prompt.closed ? 'Closed' : 'Expired')); promptPanel.node.append(panel);
    }
    main.append(promptPanel.node); const character = section('character'); character.heading.textContent = 'Your character'; character.node.append(el('p', sheet?.name || 'Character name not set'), el('p', sheet?.playbookId ? `Playbook: ${sheet.playbookId}` : 'Playbook not selected'));
    const inventory = el('ul'); if (sheet?.inventory.length) for (const item of sheet.inventory) inventory.append(el('li', `${item.label} × ${item.quantity}`)); else inventory.append(el('li', 'Inventory is empty')); character.node.append(inventory); main.append(character.node);
    const privateNotes = section('private-notes'); privateNotes.heading.textContent = 'Private notes'; privateNotes.node.append(el('p', notes?.text || 'No private notes yet.')); main.append(privateNotes.node);
  };
  const renderPresenter = (main: HTMLElement) => { main.append(renderScene(true)); };
  const render = () => {
    if (!root) return; root.replaceChildren(); status.textContent = message; root.append(renderHeader()); if (accessLost) return;
    const pendingPanel = renderPending(); if (pendingPanel) { root.append(pendingPanel); return; }
    if (surface !== 'gm' && admission?.status !== 'admitted') {
      const main = el('main'); const join = section('join-room'); join.heading.textContent = surface === 'play' ? 'Join as a player' : 'Join as the presenter'; join.node.append(el('p', `Admission: ${admission?.status ?? 'not requested'}`));
      if (!admission || admission.status === 'denied') {
        const name = inputField('Display name', '', 200); join.node.append(name.label, button('Request admission', () => { const value = name.input.value.trim(); if (!value) { report('Enter a display name before requesting admission.'); return; } run('Admission request', { type: 'admission.request', commandId: commandId(), role: surface === 'play' ? 'player' : 'presenter', name: value }); }, 'primary'));
      }
      main.append(join.node); root.append(main); return;
    }
    const main = el('main'); if (surface === 'gm') renderGm(main); else if (surface === 'play') renderPlayer(main); else renderPresenter(main); root.append(main);
  };
  if (owner || admission) subscribe(); else connection = 'live';
  if (owner) void refreshStatus(); render();
  window.addEventListener('pagehide', () => { stop?.(); adapter.dispose(); }, { once: true });
}
