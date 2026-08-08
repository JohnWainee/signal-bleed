#!/usr/bin/env node
// Validate every cases/*.json against the schema documented in
// rules/signal-bleed-case-format.md. Parse errors and missing required
// fields both fail the run; this is deliberately structural (keys present,
// right JSON types) rather than a full content lint.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const CASES_DIR = join(process.cwd(), 'cases')
const REQUIRED_TOP_LEVEL = [
  'format', 'version', 'title', 'depth', 'job', 'wrongDetail',
  'locations', 'npcs', 'clues', 'artifacts', 'puzzles', 'rings', 'notes',
]
const REQUIRED_JOB_FIELDS = ['client', 'brief', 'pay', 'deadline']
const REQUIRED_RING_FIELDS = ['terrors', 'temptations']

function validateCase(name, data) {
  const errors = []

  for (const field of REQUIRED_TOP_LEVEL) {
    if (!(field in data)) errors.push(`missing field "${field}"`)
  }
  if (data.format !== 'signal-bleed-case') {
    errors.push(`format must be "signal-bleed-case", got ${JSON.stringify(data.format)}`)
  }
  if (typeof data.version !== 'number') errors.push('version must be a number')
  if (typeof data.depth !== 'number') errors.push('depth must be a number')

  if (data.job && typeof data.job === 'object') {
    for (const field of REQUIRED_JOB_FIELDS) {
      if (!(field in data.job)) errors.push(`job.${field} missing`)
    }
  } else if ('job' in data) {
    errors.push('job must be an object')
  }

  for (const field of ['locations', 'npcs', 'clues', 'artifacts', 'puzzles']) {
    if (field in data && !Array.isArray(data[field])) errors.push(`${field} must be an array`)
  }

  if (data.rings && typeof data.rings === 'object') {
    for (const field of REQUIRED_RING_FIELDS) {
      if (!(field in data.rings)) errors.push(`rings.${field} missing`)
      else if (!Array.isArray(data.rings[field])) errors.push(`rings.${field} must be an array`)
    }
  } else if ('rings' in data) {
    errors.push('rings must be an object')
  }

  return errors
}

const files = readdirSync(CASES_DIR).filter((f) => f.endsWith('.json'))
if (files.length === 0) {
  console.error(`No .json files found in ${CASES_DIR}`)
  process.exit(1)
}

let failed = false
for (const file of files) {
  const path = join(CASES_DIR, file)
  const raw = readFileSync(path, 'utf8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (err) {
    console.error(`FAIL ${file}: invalid JSON — ${err.message}`)
    failed = true
    continue
  }
  const errors = validateCase(file, data)
  if (errors.length) {
    console.error(`FAIL ${file}:`)
    for (const e of errors) console.error(`  - ${e}`)
    failed = true
  } else {
    console.log(`ok   ${file}`)
  }
}

process.exit(failed ? 1 : 0)
