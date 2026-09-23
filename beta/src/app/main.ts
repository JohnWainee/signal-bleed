import '../ui/base.css';
import { fixtureSnapshot } from '../data/scaffold-fixture.ts';
import type { Surface, FixtureStatus } from '../data/scaffold-fixture.ts';

if (import.meta.env.VITE_SB_LIVE_BACKEND === '1') {
  void import('./live.ts').then(({ startLive }) => startLive()).catch(error => {
    const root = document.querySelector('#app');
    if (root) root.textContent = `Beta connection unavailable: ${error instanceof Error ? error.message : 'unknown error'}`;
  });
} else {

const app = document.querySelector<HTMLDivElement>('#app');
if (!app) throw new Error('Missing app root');
const root = app;
const route = document.body.dataset.surface;
if (route !== 'gm' && route !== 'play' && route !== 'present') throw new Error('Unknown surface');
const surface: Surface = route;
let status: FixtureStatus = 'live';
let answer: string | null = null;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '') {
  const node = document.createElement(tag);
  node.textContent = text;
  return node;
}
function render() {
  root.replaceChildren();
  const header = element('header');
  header.append(element('p', 'SIGNAL BLEED / HAWAIʻI'));
  const title = surface === 'gm' ? 'Direct the session' : surface === 'play' ? 'Your next move' : 'The shared scene';
  header.append(element('h1', title));
  header.append(element('p', 'Fixture preview · synthetic content · no live room or saved changes'));
  root.append(header);
  const nav = element('nav');
  nav.setAttribute('aria-label', 'Preview surfaces');
  for (const [path, label] of [['gm', 'GM'], ['play', 'Player'], ['present', 'Presenter']]) {
    const a = element('a', label); a.href = `/beta/${path}/`;
    if (surface === path) a.setAttribute('aria-current', 'page');
    nav.append(a);
  }
  root.append(nav);
  const main = element('main');
  const view = fixtureSnapshot(surface, status);
  const announcement = element('p', status === 'disconnected' ? 'Disconnected — showing the last fixture scene.' :
    status === 'loading' ? 'Loading scene…' : status === 'empty' ? 'Waiting for the GM to publish a scene.' : 'Scene ready');
  announcement.setAttribute('role', 'status'); main.append(announcement);
  if (view.scene) {
    const scene = element('section'); scene.className = 'scene';
    scene.append(element('p', 'SCENE / 01'), element('h2', view.scene.title), element('p', view.scene.body));
    main.append(scene);
  }
  if (surface === 'gm') {
    const panel = element('section'); panel.append(element('h2', 'Session controls'));
    panel.append(element('p', 'Preview the table states below. Scene publishing and targeted prompts arrive with the session adapter.'));
    const label = element('label', 'Preview state ');
    const select = element('select');
    for (const value of ['live', 'loading', 'empty', 'disconnected'] as const) {
      const option = element('option', value); option.value = value; select.append(option);
    }
    select.value = status;
    select.addEventListener('change', () => { status = select.value as FixtureStatus; render(); root.querySelector('select')?.focus(); });
    label.append(select); panel.append(label); main.append(panel);
  }
  if (view.decision) {
    const panel = element('section'); panel.append(element('h2', view.decision.question));
    const result = element('p', answer ? `Preview choice: ${answer}. Nothing was sent or saved.` : 'Try a choice. This demonstration resets on refresh.');
    result.setAttribute('role', 'status');
    for (const [choice, label] of [['A', view.decision.a], ['B', view.decision.b]]) {
      const button = element('button', `${choice} — ${label}`); button.type = 'button';
      button.addEventListener('click', () => {
        answer = choice ?? null;
        result.textContent = `Preview choice: ${choice}. Nothing was sent or saved.`;
      }); panel.append(button);
    }
    panel.append(result); main.append(panel);
  }
  if (surface === 'play') main.append(element('p', 'Your character, inventory and private notes will stay available here between scenes.'));
  root.append(main);
  const footer = element('footer');
  const reference = element('a', 'Open the existing GM reference'); reference.href = '/gm/';
  footer.append(reference); root.append(footer);
}
render();
}
