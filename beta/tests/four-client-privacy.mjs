// Run only against the isolated demo emulators and local Vite server.
// Set SB_PLAYWRIGHT_MODULE to an absolute Playwright index.mjs if not installed locally.
import assert from 'node:assert/strict';

const modulePath = process.env.SB_PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(modulePath);
const base = 'http://127.0.0.1:5173';
const room = `Privacy${Date.now()}`;
const browser = await chromium.launch({ headless: true, executablePath: process.env.SB_CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const clients = {};
try {
  for (const role of ['gm', 'p1', 'p2', 'presenter']) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    const sockets = new Set();
    const inbound = [];
    cdp.on('Network.webSocketCreated', event => {
      if (event.url.includes('127.0.0.1:9001')) sockets.add(event.requestId);
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
  const uid = async page => (await page.locator('#app > p').first().textContent()).match(/identity ([A-Za-z0-9_-]+)/)?.[1];
  await open(gm, 'gm');
  await gm.getByRole('button', { name: 'Create this room' }).click();
  await gm.getByRole('heading', { name: 'Admissions' }).waitFor();
  for (const [page, path, name] of [[p1, 'play', 'P1'], [p2, 'play', 'P2'], [presenter, 'present', 'Presenter']]) {
    await open(page, path);
    await page.getByLabel('Display name').fill(name);
    await page.getByRole('button', { name: 'Request admission' }).click();
    await page.getByText('Admission: pending').waitFor();
    await gm.locator('p').filter({ hasText: `${name} ·` }).getByRole('button', { name: 'Admit' }).click();
    await page.getByText('Admission: pending').waitFor({ state: 'hidden' });
  }
  const p1Uid = await uid(p1);
  const p2Uid = await uid(p2);
  assert.ok(p1Uid && p2Uid && p1Uid !== p2Uid);
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
  await gm.getByText('Saved.').waitFor();
  for (const page of [gm, p1, p2, presenter]) await page.getByRole('heading', { name: 'PUBLIC_SCENE' }).waitFor();
  const send = async (recipient, marker) => {
    await gm.getByLabel('Player UID').fill(recipient);
    await gm.getByLabel('Question').fill(marker);
    await gm.getByLabel('Choice A').fill('Choice A');
    await gm.getByLabel('Choice B').fill('Choice B');
    await gm.getByRole('button', { name: 'Send private prompt' }).click();
    await gm.getByText(`${recipient}: ${marker}`, { exact: false }).waitFor();
  };
  await send(p1Uid, 'ONLY_PLAYER_ONE');
  await send(p2Uid, 'ONLY_PLAYER_TWO');
  await p1.getByText('ONLY_PLAYER_ONE').waitFor();
  await p2.getByText('ONLY_PLAYER_TWO').waitFor();
  assert.doesNotMatch(await p1.locator('#app').innerText(), /ONLY_PLAYER_TWO/);
  assert.doesNotMatch(await p2.locator('#app').innerText(), /ONLY_PLAYER_ONE/);
  assert.doesNotMatch(await presenter.locator('#app').innerText(), /ONLY_PLAYER_ONE|ONLY_PLAYER_TWO/);
  for (const [role, required, forbidden] of [['gm', 'ONLY_PLAYER_ONE|ONLY_PLAYER_TWO', ''], ['p1', 'ONLY_PLAYER_ONE', 'ONLY_PLAYER_TWO'], ['p2', 'ONLY_PLAYER_TWO', 'ONLY_PLAYER_ONE'], ['presenter', 'PUBLIC_SCENE', 'ONLY_PLAYER_ONE|ONLY_PLAYER_TWO']]) {
    const frames = clients[role].inbound.join('\n');
    assert.ok(frames.length > 0, `${role} received no RTDB websocket frames`);
    for (const marker of required.split('|')) assert.match(frames, new RegExp(marker), `${role} capture missed authorized marker ${marker}`);
    if (forbidden) assert.doesNotMatch(frames, new RegExp(forbidden), `${role} received another role's private marker`);
  }
  await p1.getByRole('button', { name: 'A: Choice A' }).click();
  await gm.getByText(`${p1Uid}: ONLY_PLAYER_ONE · A`).waitFor();
  await gm.locator('p').filter({ hasText: `P1 · player · admitted · ${p1Uid}` }).getByRole('button', { name: 'Revoke' }).click();
  await p1.getByText('Private views cleared.').waitFor();
  assert.doesNotMatch(await p1.locator('#app').innerText(), /ONLY_PLAYER_ONE/);
  console.log(`PASS four-client UI and RTDB inbound privacy: ${room}; all four identities simultaneously admitted before prompt delivery`);
} finally {
  await browser.close();
}
