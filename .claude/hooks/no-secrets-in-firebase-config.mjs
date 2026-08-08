#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit) — block a write to firebase-config.js that
// pastes a GENUINE server-side secret (a service-account key, private key, or
// OAuth client secret). The Firebase *web* config (apiKey, authDomain,
// databaseURL, projectId, storageBucket, messagingSenderId, appId) is PUBLIC
// BY DESIGN: it ships to every browser and is gated by firebase.rules.json,
// not by secrecy — so committing those values is an expected deploy step
// (see HANDOFF.md) and is deliberately NOT blocked here. See AGENTS.md.
import { basename } from 'node:path'

// Markers of a real secret that must never land in a committed file. A normal
// Firebase web config contains none of these; a service-account JSON, a PEM
// private key, or an OAuth credential does.
const SECRET_PATTERNS = [
  [/-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, 'a PEM private key block'],
  [/["']?type["']?\s*:\s*["']service_account["']/, 'a service-account credential ("type": "service_account")'],
  [/["']?private_key["']?\s*:/, 'a "private_key" field'],
  [/["']?private_key_id["']?\s*:/, 'a "private_key_id" field'],
  [/[a-z0-9._-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com/i, 'a service-account email (…iam.gserviceaccount.com)'],
  [/["']?client_secret["']?\s*:/, 'an OAuth "client_secret"'],
  [/["']?refresh_token["']?\s*:/, 'a "refresh_token"'],
]

function suspiciousText(text) {
  for (const [pattern, label] of SECRET_PATTERNS) {
    if (pattern.test(text)) return label
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
        `That is a genuine server-side secret and must never be committed — this ` +
        `file only ever holds the public Firebase web config (apiKey, authDomain, ` +
        `databaseURL, projectId, storageBucket, messagingSenderId, appId), which is ` +
        `safe to commit. Keep secrets in the Firebase console / RTDB rules, not the ` +
        `client. If you believe this is a false positive, confirm with the user first.`,
    )
    process.exit(2)
  }
  process.exit(0)
})
