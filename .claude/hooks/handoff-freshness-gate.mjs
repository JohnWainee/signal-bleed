#!/usr/bin/env node
// Stop — local mirror of CI's handoff-freshness job: block ending a turn
// with tracked/untracked changes outside HANDOFF.md and no matching
// HANDOFF.md update alongside them. A stale handoff breaks the next
// session cold (see AGENTS.md → Session continuity).
//
// Escape hatches (required so this can't trap a session):
//   - stop_hook_active: true means this hook already blocked once this turn.
//   - CLAUDE_SKIP_HANDOFF_GATE=1 or a .claude/.skip-handoff-gate marker file
//     lets you intentionally pause mid-step (e.g. awaiting a user decision).
import { execSync } from 'node:child_process'
import { existsSync as fileExists } from 'node:fs'

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd()

let raw = ''
process.stdin.on('data', (d) => (raw += d))
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  if (input.stop_hook_active === true) process.exit(0)
  if (process.env.CLAUDE_SKIP_HANDOFF_GATE === '1') process.exit(0)
  if (fileExists(`${PROJECT_DIR}/.claude/.skip-handoff-gate`)) process.exit(0)

  let status
  try {
    status = execSync('git status --porcelain', {
      cwd: PROJECT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
    }).toString()
  } catch {
    process.exit(0) // not a git repo, or git unavailable — nothing to gate.
  }

  // Don't .trim() the whole blob first — that strips the leading status
  // column off only the first line and misaligns the fixed-width slice(3)
  // below. Split on newlines, then drop empty lines from the trailing \n.
  const paths = status
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => line.slice(3).trim())
    .filter(Boolean)

  const handoffChanged = paths.includes('HANDOFF.md')
  const others = paths.filter((p) => p !== 'HANDOFF.md')

  if (others.length === 0) process.exit(0) // only HANDOFF.md changed.
  if (handoffChanged) process.exit(0) // other changes, but the log was updated too.

  console.error(
    'Blocked: there are uncommitted changes outside HANDOFF.md, but HANDOFF.md ' +
      "was not updated this turn. Update the session log (see AGENTS.md → " +
      'Handoff protocol) before ending — a stale handoff breaks the next session. ' +
      'To intentionally pause here (e.g. awaiting a user decision), create ' +
      '.claude/.skip-handoff-gate or set CLAUDE_SKIP_HANDOFF_GATE=1.\n\n' +
      `Changed outside HANDOFF.md:\n${others.map((p) => `  ${p}`).join('\n')}`,
  )
  process.exit(2)
})
