// Run only against the isolated demo emulators and local Vite server.
// Set SB_PLAYWRIGHT_MODULE to an absolute Playwright index.mjs if not installed locally.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const modulePath = process.env.SB_PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(modulePath);
const base = process.env.SB_E2E_BASE || 'http://127.0.0.1:5173';
const databasePort = process.env.SB_E2E_DATABASE_PORT || '9001';
const room = `Privacy${Date.now()}`;
const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const executablePath = process.env.SB_CHROME_PATH || (existsSync(macChrome) ? macChrome : undefined);
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const clients = {};
const clientErrors = [];
try {
  const viewports = { gm: { width: 1024, height: 768 }, p1: { width: 390, height: 844 }, p2: { width: 360, height: 800 }, presenter: { width: 1920, height: 1080 } };
  for (const role of ['gm', 'p1', 'p2', 'presenter']) {
    const context = await browser.newContext({ viewport: viewports[role], reducedMotion: role === 'presenter' ? 'reduce' : 'no-preference' });
    const page = await context.newPage();
    page.on('pageerror', error => clientErrors.push(`${role} pageerror: ${error.message}`));
    page.on('console', message => { if (message.type() === 'error') clientErrors.push(`${role} console: ${message.text()}`); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const sockets = new Set();
    const inbound = [];
    cdp.on('Network.webSocketCreated', event => {
      if (event.url.includes(`127.0.0.1:${databasePort}`)) sockets.add(event.requestId);
    });
    cdp.on('Network.webSocketFrameReceived', event => {
      if (sockets.has(event.requestId)) inbound.push(event.response.payloadData);
    });
    clients[role] = { context, page, inbound };
  }
  const gm = clients.gm.page;
  const p1 = clients.p1.page;
  const p2 = clients.p2.page;
  const presenter = clients.presenter.page;
  const open = async (page, path) => {
    await page.goto(`${base}/beta/${path}/?room=${room}`);
    await page.getByText('Local emulator beta', { exact: false }).waitFor();
  };
  const uid = page => page.locator('.room-line').getAttribute('data-identity');
  await open(gm, 'gm');
  await gm.getByRole('button', { name: 'Create this room' }).click();
  await gm.getByRole('heading', { name: 'Admissions' }).waitFor();
  for (const [page, path, name] of [[p1, 'play', 'P1'], [p2, 'play', 'P2'], [presenter, 'present', 'Presenter']]) {
    await open(page, path);
    await page.getByLabel('Display name').fill(name);
    await page.getByRole('button', { name: 'Request admission' }).click();
    await page.getByText('Admission: pending').waitFor();
    await gm.locator('article.roster-row').filter({ hasText: name }).getByRole('button', { name: 'Admit' }).click();
    await page.getByText('Admission: pending').waitFor({ state: 'hidden' });
  }
  const p1Uid = await uid(p1);
  const p2Uid = await uid(p2);
  assert.ok(p1Uid && p2Uid && p1Uid !== p2Uid);
  await gm.getByLabel('New staged clue').fill('GM_STAGED_CLUE');
  await gm.getByRole('button', { name: 'Add to staging' }).click();
  const stagedClue = gm.locator('li.clue').filter({ hasText: 'GM_STAGED_CLUE' });
  await stagedClue.waitFor();
  for (const page of [p1, p2, presenter]) assert.doesNotMatch(await page.locator('#app').innerText(), /GM_STAGED_CLUE/);
  await stagedClue.getByRole('button', { name: 'Reveal' }).click();
  for (const page of [p1, p2, presenter]) await page.getByText('GM_STAGED_CLUE').waitFor();
  await stagedClue.getByRole('button', { name: 'Mark woven' }).click();
  for (const page of [p1, p2, presenter]) await page.locator('li.clue-woven').filter({ hasText: 'GM_STAGED_CLUE' }).waitFor();
  await gm.getByLabel('New staged clue').fill('GM_NEVER_PUBLIC');
  await gm.getByRole('button', { name: 'Add to staging' }).click();
  await gm.locator('li.clue-staged').filter({ hasText: 'GM_NEVER_PUBLIC' }).waitFor();
  for (const page of [p1, p2, presenter]) assert.doesNotMatch(await page.locator('#app').innerText(), /GM_NEVER_PUBLIC/);
  await gm.locator('.bleed-clock').getByRole('button', { name: '3', exact: true }).click();
  for (const page of [p1, p2, presenter]) await page.locator('.bleed-clock button[aria-pressed="true"]').filter({ hasText: /^3$/ }).waitFor();
  const gmUid = await uid(gm);
  const pendingKey = `SB:beta:pending:${room}:${gmUid}`;
  const sceneCommand = { type: 'scene.publish', commandId: `RetryScene${Date.now()}`, expectedEpoch: 0, title: 'PUBLIC_SCENE', body: 'PUBLIC_BODY' };
  await gm.evaluate(([key, command]) => sessionStorage.setItem(key, JSON.stringify({ label: 'Scene publication', command })), [pendingKey, sceneCommand]);
  await gm.reload();
  await gm.getByRole('button', { name: 'Retry exact pending command' }).click();
  await gm.getByRole('heading', { name: 'PUBLIC_SCENE' }).waitFor();
  // Simulate an acknowledged mutation whose acknowledgement was lost before the tab reloaded.
  await gm.evaluate(([key, command]) => sessionStorage.setItem(key, JSON.stringify({ label: 'Scene publication', command })), [pendingKey, sceneCommand]);
  await gm.reload();
  await gm.getByRole('button', { name: 'Retry exact pending command' }).click();
  await gm.getByText('Saved and confirmed.').waitFor();
  for (const page of [gm, p1, p2, presenter]) await page.getByRole('heading', { name: 'PUBLIC_SCENE' }).waitFor();
  assert.doesNotMatch(await presenter.locator('#app').innerText(), /identity [A-Za-z0-9_-]+/, 'presenter DOM exposed a participant identifier');
  await gm.getByLabel('Scene title').fill('PUBLIC_SCENE_NEXT');
  await gm.getByLabel('Scene body').fill('PUBLIC_BODY_NEXT');
  await gm.getByRole('button', { name: 'Preview scene' }).click();
  await gm.getByText('PREVIEW · NOT PUBLISHED').waitFor();
  assert.doesNotMatch(await presenter.locator('#app').innerText(), /PUBLIC_SCENE_NEXT/, 'presenter received an unpublished preview');
  await gm.getByLabel('Scene body').focus();
  await gm.getByLabel('Scene body').fill('EDITED_AFTER_PREVIEW');
  assert.equal(await gm.getByRole('button', { name: 'Publish previewed scene' }).count(), 0, 'editing after preview left publishing enabled');
  await assert.doesNotReject(gm.getByLabel('Scene body').evaluate(node => {
    if (document.activeElement !== node) throw new Error('scene editor lost focus during preview invalidation render');
  }));
  await gm.getByRole('button', { name: 'Preview scene' }).click();
  await gm.getByRole('button', { name: 'Publish previewed scene' }).click();
  for (const page of [gm, p1, p2, presenter]) await page.getByRole('heading', { name: 'PUBLIC_SCENE_NEXT' }).waitFor();
  const send = async (recipient, marker) => {
    await gm.getByLabel('Prompt recipient').selectOption(recipient);
    await gm.getByLabel('Question').fill(marker);
    await gm.getByLabel('Choice A').fill('Choice A');
    await gm.getByLabel('Choice B').fill('Choice B');
    await gm.getByRole('button', { name: 'Send private prompt' }).click();
    await gm.locator('article.response-row').filter({ hasText: marker }).waitFor();
  };
  await send(p1Uid, 'ONLY_PLAYER_ONE');
  await send(p2Uid, 'ONLY_PLAYER_TWO');
  await p1.getByText('ONLY_PLAYER_ONE').waitFor();
  await p2.getByText('ONLY_PLAYER_TWO').waitFor();
  for (const [role, page] of [['gm', gm], ['p1', p1], ['p2', p2], ['presenter', presenter]]) {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), true, `${role} viewport has horizontal overflow`);
  }
  for (const control of [p1.getByRole('button', { name: 'A · Choice A' }), gm.getByRole('button', { name: 'Send private prompt' })]) {
    const box = await control.boundingBox(); assert.ok(box && box.height >= 44 && box.width >= 44, 'interactive target is smaller than 44 × 44 CSS pixels');
  }
  assert.doesNotMatch(await p1.locator('#app').innerText(), /ONLY_PLAYER_TWO/);
  assert.doesNotMatch(await p2.locator('#app').innerText(), /ONLY_PLAYER_ONE/);
  assert.doesNotMatch(await presenter.locator('#app').innerText(), /ONLY_PLAYER_ONE|ONLY_PLAYER_TWO/);
  for (const [role, required, forbidden] of [['gm', 'ONLY_PLAYER_ONE|ONLY_PLAYER_TWO|GM_STAGED_CLUE|GM_NEVER_PUBLIC', ''], ['p1', 'ONLY_PLAYER_ONE|GM_STAGED_CLUE', 'ONLY_PLAYER_TWO|GM_NEVER_PUBLIC'], ['p2', 'ONLY_PLAYER_TWO|GM_STAGED_CLUE', 'ONLY_PLAYER_ONE|GM_NEVER_PUBLIC'], ['presenter', 'PUBLIC_SCENE|GM_STAGED_CLUE', 'ONLY_PLAYER_ONE|ONLY_PLAYER_TWO|GM_NEVER_PUBLIC']]) {
    const frames = clients[role].inbound.join('\n');
    assert.ok(frames.length > 0, `${role} received no RTDB websocket frames`);
    for (const marker of required.split('|')) assert.match(frames, new RegExp(marker), `${role} capture missed authorized marker ${marker}`);
    if (forbidden) assert.doesNotMatch(frames, new RegExp(forbidden), `${role} received another role's private marker`);
  }
  await p2.reload();
  await p2.getByText('ONLY_PLAYER_TWO').waitFor();
  await Promise.all([
    p1.getByRole('button', { name: 'A · Choice A' }).click(),
    p2.getByRole('button', { name: 'B · Choice B' }).click(),
  ]);
  await gm.locator('article.response-row').filter({ hasText: 'ONLY_PLAYER_ONE' }).getByText('Answered A').waitFor();
  await gm.locator('article.response-row').filter({ hasText: 'ONLY_PLAYER_TWO' }).getByText('Answered B').waitFor();
  await send(p1Uid, 'RACE_PLAYER_ONE');
  await p1.getByText('RACE_PLAYER_ONE').waitFor();
  let releaseResponse;
  let markResponseIntercepted;
  const responseReleased = new Promise(resolve => { releaseResponse = resolve; });
  const responseIntercepted = new Promise(resolve => { markResponseIntercepted = resolve; });
  await p1.route('**/betaRoomCommand', async route => {
    if (route.request().postData()?.includes('response.submit')) {
      markResponseIntercepted();
      await responseReleased;
    }
    await route.continue();
  });
  const delayedResponse = p1.locator('article.decision').filter({ hasText: 'RACE_PLAYER_ONE' }).getByRole('button', { name: 'A · Choice A' }).click();
  await responseIntercepted;
  await gm.locator('article.response-row').filter({ hasText: 'RACE_PLAYER_ONE' }).getByRole('button', { name: 'Close prompt' }).click();
  await gm.locator('article.response-row').filter({ hasText: 'RACE_PLAYER_ONE' }).getByText('Closed').waitFor();
  releaseResponse();
  await delayedResponse;
  await p1.getByText('Not saved: CLOSED').waitFor();
  await p1.unroute('**/betaRoomCommand');
  await clients.p2.context.setOffline(true);
  await p2.getByText('Disconnected · showing last-confirmed information').waitFor({ timeout: 20_000 });
  await clients.p2.context.setOffline(false);
  await p2.reload();
  await p2.getByText('Local emulator beta · changes confirmed').waitFor({ timeout: 20_000 });
  await p2.getByText('ONLY_PLAYER_TWO').waitFor();
  await gm.locator('article.roster-row').filter({ hasText: 'Presenter' }).getByRole('button', { name: 'Revoke' }).click();
  await presenter.getByText('Private views cleared.').waitFor();
  const freshPresenterContext = await browser.newContext({ viewport: viewports.presenter, reducedMotion: 'reduce' });
  const freshPresenter = await freshPresenterContext.newPage();
  freshPresenter.on('pageerror', error => clientErrors.push(`fresh presenter pageerror: ${error.message}`));
  freshPresenter.on('console', message => { if (message.type() === 'error') clientErrors.push(`fresh presenter console: ${message.text()}`); });
  await open(freshPresenter, 'present');
  await freshPresenter.getByLabel('Display name').fill('Fresh Presenter');
  await freshPresenter.getByRole('button', { name: 'Request admission' }).click();
  await gm.locator('article.roster-row').filter({ hasText: 'Fresh Presenter' }).getByRole('button', { name: 'Admit' }).click();
  await freshPresenter.getByRole('heading', { name: 'PUBLIC_SCENE_NEXT' }).waitFor();
  assert.doesNotMatch(await freshPresenter.locator('#app').innerText(), /ONLY_PLAYER_ONE|ONLY_PLAYER_TWO|RACE_PLAYER_ONE|identity [A-Za-z0-9_-]+/);
  await send(p2Uid, 'STALE_PLAYER_TWO');
  await p2.getByText('STALE_PLAYER_TWO').waitFor();
  await gm.getByLabel('Scene title').fill('PUBLIC_SCENE_FINAL');
  await gm.getByLabel('Scene body').fill('PUBLIC_BODY_FINAL');
  await gm.getByRole('button', { name: 'Preview scene' }).click();
  await gm.getByRole('button', { name: 'Publish previewed scene' }).click();
  await p2.getByRole('heading', { name: 'PUBLIC_SCENE_FINAL' }).waitFor();
  await p2.locator('article.decision').filter({ hasText: 'STALE_PLAYER_TWO' }).getByText('Expired').waitFor();
  assert.equal(await p2.locator('article.decision').filter({ hasText: 'STALE_PLAYER_TWO' }).getByRole('button').count(), 0);
  await gm.locator('article.roster-row').filter({ hasText: 'P1' }).getByRole('button', { name: 'Revoke' }).click();
  await p1.getByText('Private views cleared.').waitFor();
  assert.doesNotMatch(await p1.locator('#app').innerText(), /ONLY_PLAYER_ONE/);
  await p1.reload();
  await p1.getByText('Admission: revoked').waitFor();
  await p1.getByRole('button', { name: 'Request admission' }).waitFor();
  gm.once('dialog', dialog => dialog.accept());
  await gm.getByRole('button', { name: 'Close room (read-only)' }).click();
  await gm.getByText('Room closed. Existing records are read-only.').waitFor();
  await gm.reload();
  await gm.getByText('Room closed. Existing scene and private views remain readable; new commands are disabled.').waitFor();
  assert.equal(await gm.getByRole('button', { name: 'Publish previewed scene' }).count(), 0);
  assert.equal(await gm.getByRole('button', { name: 'Close room (read-only)' }).count(), 0);
  // Closed rooms stay read-only, not hidden: the roster remains visible without admit/revoke controls.
  await gm.getByRole('heading', { name: 'Admissions' }).waitFor();
  await gm.locator('article.roster-row').filter({ hasText: `P2` }).getByText(`Identity ${p2Uid}`).waitFor();
  assert.equal(await gm.locator('article.roster-row').filter({ hasText: `P2` }).getByRole('button').count(), 0);
  // The room.close receipt reaches every admitted member through their own admission record, without a reload or a failed submit attempt first.
  await p2.getByText('Room closed. Existing records are read-only.').waitFor();
  assert.equal(await p2.getByRole('button', { name: 'A · Choice A' }).count(), 0);
  await freshPresenterContext.close();

  const swContext = await browser.newContext();
  const swPage = await swContext.newPage();
  const swErrors = [];
  swPage.on('pageerror', error => swErrors.push(`service-worker probe pageerror: ${error.message}`));
  swPage.on('console', message => { if (message.type() === 'error') swErrors.push(`service-worker probe console: ${message.text()}`); });
  await swPage.goto(`${base}/`);
  await swPage.evaluate(async () => { await navigator.serviceWorker.register('/sw.js', { scope: '/' }); await navigator.serviceWorker.ready; });
  await swPage.reload();
  assert.equal(await swPage.evaluate(() => Boolean(navigator.serviceWorker.controller)), true, 'root alpha service worker did not control the probe page');
  swErrors.length = 0;
  await open(swPage, 'present');
  assert.equal(await swPage.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length), 0, 'beta did not unregister the root alpha service worker');
  assert.equal(await swPage.evaluate(() => navigator.serviceWorker.controller), null, 'beta remained controlled by the root alpha service worker');
  const cachedUrls = await swPage.evaluate(async () => (await Promise.all((await caches.keys()).map(async key => (await caches.open(key)).keys()))).flat().map(request => request.url));
  assert.equal(cachedUrls.some(url => /(?:9001|5101|9199|betaRooms)/.test(url)), false, 'root service-worker cache contains beta session transport');
  await swContext.close();
  clientErrors.push(...swErrors);
  assert.deepEqual(clientErrors, [], `unhandled browser errors:\n${clientErrors.join('\n')}`);
  console.log(`PASS four-client UI and RTDB inbound privacy: ${room}; all four identities simultaneously admitted before prompt delivery`);
} finally {
  await browser.close();
}
