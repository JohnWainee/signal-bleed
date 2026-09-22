import { get, ref } from 'firebase/database';
import { bootstrapFirebase } from '../data/firebase-bootstrap.ts';
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
  let message = demo ? 'Local emulator beta · no production connection' : 'Beta room connected';
  let stop: (() => void) | null = null;
  let accessLost = false;
  let busy = false;
  let pending: { label: string; execute: () => Promise<{ ok: boolean; code?: string }> } | null = null;
  const status = el('p'); status.setAttribute('role', 'status');
  const report = (value: string) => { message = value; render(); };
  const retry = async () => {
    if (!pending || busy || accessLost) return;
    busy = true; render();
    try {
      const result = await pending.execute();
      if (result.ok || result.code !== 'DISCONNECTED') pending = null;
      report(result.ok ? 'Saved.' : `Not saved: ${result.code ?? 'unknown error'}`);
    } catch { report('Connection interrupted. Retry the exact pending command.'); }
    finally { busy = false; render(); }
  };
  const run = (label: string, execute: () => Promise<{ ok: boolean; code?: string }>) => {
    if (pending || busy || accessLost) return;
    pending = { label, execute }; void retry();
  };
  const subscribe = () => {
    stop?.();
    stop = adapter.watch(roomId, (event: SessionEvent) => {
      if (event.type === 'accessLost') {
        accessLost = true; pending = null; admission = null;
        scene = null; roster = {}; gmDecisions = {}; decisions = {}; sheet = null; notes = null;
        report(`Access lost: ${event.code}. Private views cleared.`); return;
      }
      if (event.type === 'admission') admission = event.value;
      if (event.type === 'scene') scene = event.data.value;
      if (event.type === 'gmRoster') roster = event.data.value ?? {};
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
        run('Room creation', async () => {
          const result = await adapter.createRoom(roomId, id);
          if (result.ok) location.reload();
          return result;
        });
      }));
      return;
    }
    if (surface !== 'gm' && admission?.status !== 'admitted') {
      root.append(el('p', `Admission: ${admission?.status ?? 'not requested'}`));
      if (!admission || admission.status === 'denied') {
        const { wrap, input } = field('Display name'); root.append(wrap);
        root.append(button('Request admission', () => {
          const name = input.value.trim(); const id = commandId();
          run('Admission request', async () => {
            const result = await adapter.requestAdmission(roomId, surface === 'play' ? 'player' : 'presenter', name, id);
            if (result.ok) subscribe();
            return result;
          });
        }));
      }
      return;
    }
    root.append(el('h2', scene?.title ?? 'Waiting for a published scene'));
    if (scene) root.append(el('p', scene.body));
    if (surface === 'gm') {
      const title = field('Scene title'); const body = field('Scene body'); root.append(title.wrap, body.wrap);
      root.append(button('Publish scene', () => {
        const command = { type: 'scene.publish' as const, commandId: commandId(), expectedEpoch: scene?.epoch ?? 0,
          title: title.input.value, body: body.input.value };
        run('Scene publication', () => adapter.send(roomId, command));
      }));
      const rosterSection = el('section'); rosterSection.append(el('h2', 'Admissions'));
      for (const [memberUid, record] of Object.entries(roster)) {
        const row = el('p', `${record.name} · ${record.role} · ${record.status} · ${memberUid}`);
        if (record.status === 'pending') row.append(button('Admit', () => {
          const id = commandId(); run('Admission decision', () => adapter.decideAdmission(roomId, memberUid, 'admit', record.revision, id));
        }));
        if (record.status === 'admitted') row.append(button('Revoke', () => {
          const id = commandId(); run('Revocation', () => adapter.revoke(roomId, memberUid, record.revision, id));
        }));
        rosterSection.append(row);
      }
      root.append(rosterSection);
      const recipient = field('Player UID'); const question = field('Question'); const a = field('Choice A'); const b = field('Choice B');
      root.append(recipient.wrap, question.wrap, a.wrap, b.wrap);
      root.append(button('Send private prompt', () => {
        const command = { type: 'prompt.open' as const, commandId: commandId(), recipientUid: recipient.input.value.trim(),
          promptId: commandId(), sceneEpoch: scene?.epoch ?? 0,
          question: question.input.value, a: a.input.value, b: b.input.value };
        run('Private prompt', () => adapter.send(roomId, command));
      }));
      for (const [recipientUid, prompts] of Object.entries(gmDecisions)) {
        for (const prompt of Object.values(prompts)) {
          const row = el('p', `${recipientUid}: ${prompt.question} · ${prompt.response?.choice ?? (prompt.closed ? 'closed' : 'unanswered')}`);
          if (!prompt.closed && !prompt.response) row.append(button('Close prompt', () => {
            const id = commandId(); run('Prompt closure', () => adapter.send(roomId, {
              type: 'prompt.close', commandId: id, recipientUid, promptId: prompt.id, expectedRevision: prompt.revision,
            }));
          }));
          root.append(row);
        }
      }
    }
    if (surface === 'play') {
      root.append(el('h2', 'Your private prompts'));
      for (const prompt of Object.values(decisions).sort((a, b) => a.id.localeCompare(b.id))) {
        const panel = el('section'); panel.append(el('p', prompt.question));
        if (prompt.response) panel.append(el('p', `Answered ${prompt.response.choice}`));
        else if (!prompt.closed && prompt.sceneEpoch === scene?.epoch) {
          for (const choice of ['A', 'B'] as const) panel.append(button(`${choice}: ${choice === 'A' ? prompt.a : prompt.b}`, () => {
            const command = { type: 'response.submit' as const, commandId: commandId(), promptId: prompt.id,
              sceneEpoch: prompt.sceneEpoch, expectedRevision: prompt.revision, choice };
            run('Prompt response', () => adapter.send(roomId, command));
          }));
        } else panel.append(el('p', 'Closed or expired'));
        root.append(panel);
      }
      root.append(el('p', `Character: ${sheet?.name || 'not set'} · private notes: ${notes?.text || 'empty'}`));
    }
  };
  if (owner || admission) subscribe();
  render();
  window.addEventListener('pagehide', () => { stop?.(); adapter.dispose(); }, { once: true });
}
