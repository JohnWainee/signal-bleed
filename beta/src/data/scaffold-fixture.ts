// SB-02 display fixture only. SB-03 replaces this with SessionAdapter.
// These synthetic strings are public test data, never real private records.
export type Surface = 'gm' | 'play' | 'present';
export type FixtureStatus = 'live' | 'loading' | 'empty' | 'disconnected';
export type FixtureView = {
  status: FixtureStatus;
  scene: { title: string; body: string } | null;
  decision: { question: string; a: string; b: string } | null;
};
export function fixtureSnapshot(surface: Surface, status: FixtureStatus): FixtureView {
  return {
    status,
    scene: status === 'empty' || status === 'loading' ? null : {
      title: 'Honolulu Harbor',
      body: 'A radio clicks twice. The next transmission is yours to follow.'
    },
    decision: surface === 'play' && status === 'live' ? {
      question: 'Where do you turn your attention?',
      a: 'Listen to the transmission', b: 'Examine the written log'
    } : null
  };
}
