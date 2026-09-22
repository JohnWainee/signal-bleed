// Transport-independent beta contract. These checks are NOT a security boundary.
// Firebase rules must enforce equivalent authorization before multiplayer ships.
const id = value => {
  if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(value)
      || ['__proto__', 'constructor', 'prototype'].includes(value)) throw new Error('Invalid identifier');
  return value;
};
const text = value => {
  if (typeof value !== 'string' || !value.trim() || value.length > 2000) throw new Error('Invalid text');
  return value;
};

export function createSession(gmUid) {
  return { version: 1, gmUid: id(gmUid), revision: 0, scene: null, prompts: {}, responses: {} };
}

// Actor identity must come from authentication, never from a submitted command.
// Persist changes with a transaction/CAS; do not write this entire object blindly.
export function applyCommand(state, actor, command) {
  id(actor.uid);
  if (actor.role === 'presenter') throw new Error('Presenter is read-only');
  if (!['gm', 'player'].includes(actor.role)) throw new Error('Unknown role');
  if (command.expectedRevision !== state.revision) throw new Error('Stale revision');
  const next = structuredClone(state);
  const isGM = actor.role === 'gm' && actor.uid === state.gmUid;
  switch (command.type) {
    case 'scene.set':
      if (!isGM) throw new Error('GM required');
      next.scene = { id: id(command.scene.id), title: text(command.scene.title), body: text(command.scene.body) };
      // A transition closes pending decisions; it must not accidentally reopen them.
      for (const prompt of Object.values(next.prompts)) prompt.open = false;
      break;
    case 'prompt.open': {
      if (!isGM) throw new Error('GM required');
      if (!next.scene) throw new Error('Scene required');
      const p = command.prompt;
      id(p.id);
      if (Object.hasOwn(next.prompts, p.id)) throw new Error('Prompt ID already used');
      next.prompts[p.id] = { id: p.id, sceneId: next.scene.id, recipientUid: id(p.recipientUid),
        question: text(p.question), a: text(p.a), b: text(p.b), open: true };
      break;
    }
    case 'prompt.close':
      if (!isGM) throw new Error('GM required');
      id(command.promptId);
      if (!Object.hasOwn(next.prompts, command.promptId)) throw new Error('Unknown prompt');
      next.prompts[command.promptId].open = false;
      break;
    case 'response.submit': {
      id(command.promptId);
      const p = Object.hasOwn(next.prompts, command.promptId) ? next.prompts[command.promptId] : null;
      if (actor.role !== 'player' || !p?.open || p.recipientUid !== actor.uid) throw new Error('Response denied');
      if (!['A', 'B'].includes(command.choice)) throw new Error('Invalid choice');
      if (Object.hasOwn(next.responses, p.id)) throw new Error('Already answered');
      next.responses[p.id] = { uid: actor.uid, choice: command.choice };
      break;
    }
    default: throw new Error('Unknown command');
  }
  next.revision++;
  return next;
}

// Allowlisted projection: GM notes, prompts, and responses never reach the TV.
// The transport must subscribe only to authorized paths, not fetch then hide data.
export function viewFor(state, actor) {
  id(actor.uid);
  const shared = { version: state.version, revision: state.revision,
    scene: state.scene ? { id: state.scene.id, title: state.scene.title, body: state.scene.body } : null };
  if (actor.role === 'presenter') return structuredClone(shared);
  if (actor.role === 'gm' && actor.uid === state.gmUid) return structuredClone(state);
  if (actor.role !== 'player') throw new Error('View denied');
  const prompts = Object.values(state.prompts).filter(p => p.recipientUid === actor.uid);
  const responses = Object.fromEntries(prompts.filter(p => Object.hasOwn(state.responses, p.id))
    .map(p => [p.id, state.responses[p.id]]));
  return structuredClone({ ...shared, prompts, responses });
}
