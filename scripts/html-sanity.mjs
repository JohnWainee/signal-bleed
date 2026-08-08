#!/usr/bin/env node
// Cheap sanity check for a no-build static site: every shipped HTML page
// parses, and every local href/src it references resolves to a real file
// in the repo. Catches typo'd paths and moved files without needing a
// browser or a build step.
import { JSDOM } from 'jsdom'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const PAGES = [
  'index.html',
  'table/index.html',
  'gm/index.html',
  'hours/index.html',
  'print/hours.html',
  'print/vespers.html',
]

const SKIP_PREFIX = /^(https?:|mailto:|tel:|data:|#|\/\/)/

let failed = false

for (const page of PAGES) {
  const path = resolve(process.cwd(), page)
  if (!existsSync(path)) {
    console.error(`FAIL ${page}: file does not exist`)
    failed = true
    continue
  }

  const html = readFileSync(path, 'utf8')
  let dom
  try {
    dom = new JSDOM(html)
  } catch (err) {
    console.error(`FAIL ${page}: failed to parse — ${err.message}`)
    failed = true
    continue
  }

  const doc = dom.window.document
  const refs = [...doc.querySelectorAll('[href], [src]')]
    .map((el) => el.getAttribute('href') || el.getAttribute('src'))
    .filter((ref) => ref && !SKIP_PREFIX.test(ref))

  const pageDir = dirname(path)
  const missing = []
  for (const ref of refs) {
    const target = resolve(pageDir, ref.split('?')[0].split('#')[0])
    if (!existsSync(target)) missing.push(ref)
  }

  if (missing.length) {
    console.error(`FAIL ${page}: broken local reference(s)`)
    for (const m of missing) console.error(`  - ${m}`)
    failed = true
  } else {
    console.log(`ok   ${page} (${refs.length} local reference(s) checked)`)
  }
}

process.exit(failed ? 1 : 0)
