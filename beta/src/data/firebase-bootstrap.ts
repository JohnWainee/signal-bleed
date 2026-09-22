import { initializeApp, type FirebaseOptions } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth';
import { getDatabase, connectDatabaseEmulator } from 'firebase/database';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { FirebaseSessionAdapter } from './firebase-session.ts';

declare global {
  interface Window { SB_FIREBASE_CONFIG?: FirebaseOptions }
}

const demo = import.meta.env.VITE_SB_EMULATORS === '1';
const demoConfig: FirebaseOptions = {
  apiKey: 'fake-api-key', authDomain: 'demo-signal-bleed-beta.firebaseapp.com',
  databaseURL: 'https://demo-signal-bleed-beta-default-rtdb.firebaseio.com',
  projectId: 'demo-signal-bleed-beta', appId: '1:123:web:demo',
};

export async function bootstrapFirebase() {
  if (import.meta.env.VITE_SB_LIVE_BACKEND !== '1') throw new Error('Live beta backend is not enabled in this build');
  if (demo && !['localhost', '127.0.0.1'].includes(location.hostname)) throw new Error('Emulator mode is local-only');
  const config = demo ? demoConfig : window.SB_FIREBASE_CONFIG;
  if (!config || (demo ? config.projectId !== 'demo-signal-bleed-beta' : config.projectId !== 'signal-bleed')) {
    throw new Error('Missing or unexpected Firebase project configuration');
  }
  const app = initializeApp(config, 'signal-bleed-beta');
  if (!demo) {
    const siteKey = import.meta.env.VITE_SB_APPCHECK_SITE_KEY;
    if (!siteKey) throw new Error('Production App Check site key is not configured');
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(siteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  const auth = getAuth(app);
  const database = getDatabase(app);
  const functions = getFunctions(app, 'us-central1');
  if (demo) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9199', { disableWarnings: true });
    connectDatabaseEmulator(database, '127.0.0.1', 9001);
    connectFunctionsEmulator(functions, '127.0.0.1', 5101);
  }
  const credential = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { uid: credential.uid, database, adapter: new FirebaseSessionAdapter(auth, database, functions), demo };
}
