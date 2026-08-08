#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit) — block a write to firebase-config.js
// that fills in real-looking Firebase key values. The committed file must
// stay the placeholder: `window.SB_FIREBASE_CONFIG = {}` with commented
// example fields. Real values are the sponsor's to paste locally, outside
// an agent-authored commit — see AGENTS.md.
import { basename } from 'node:path'

const GOOGLE_KEY_PATTERN = /AIza[0-9A-Za-z_-]{35}/
const FIELD_PATTERN =
  /^\s*(apiKey|authDomain|databaseURL|projectId|appId|messagingSenderId|storageBucket)\s*:\s*["'`]([^"'`]+)["'`]/gm

function suspiciousText(text) {
  if (GOOGLE_KEY_PATTERN.test(text)) return 'a Google API key pattern (AIza…)'
  for (const match of text.matchAll(FIELD_PATTERN)) {
    const [, field, value] = match
    if (value.trim().length > 0) return `a filled-in "${field}" value`
  }
  return null
}

function collectText(toolInput) {
  if (typeof toolInput.content === 'string') return toolInput.content
  if (typeof toolInput.new_string === 'string') return toolInput.new_string
  if (Array.isArray(toolInput.edits)) {
    return toolInput.edits.map((e) => e.new_string || '').join('\n')
  }
  return ''
}

let raw = ''
process.stdin.on('data', (d) => (raw += d))
process.stdin.on('end', () => {
  let input
  try {
    input = JSON.parse(raw)
  } catch {
    process.exit(0)
  }

  if (!['Edit', 'Write', 'MultiEdit'].includes(input.tool_name)) process.exit(0)
  const toolInput = input.tool_input ?? {}
  const filePath = toolInput.file_path ?? ''
  if (basename(filePath) !== 'firebase-config.js') process.exit(0)

  const text = collectText(toolInput)
  const reason = suspiciousText(text)
  if (reason) {
    console.error(
      `Blocked: this write to firebase-config.js looks like it contains ${reason}. ` +
        `firebase-config.js is committed as a public placeholder — real Firebase ` +
        `project values are the sponsor's to paste in locally, not something an ` +
        `agent commits. If this really is intentional (e.g. the sponsor asked you ` +
        `to paste their config), confirm with the user first.`,
    )
    process.exit(2)
  }
  process.exit(0)
})
