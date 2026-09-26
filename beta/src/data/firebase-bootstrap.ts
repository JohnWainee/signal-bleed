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
const emulatorHost = import.meta.env.VITE_SB_EMULATOR_HOST || '127.0.0.1';
const emulatorPort = (name: string, fallback: number) => {
  const value = Number(import.meta.env[name]);
  return Number.isInteger(value) && value > 0 && value <= 65535 ? value : fallback;
};
const authEmulatorPort = emulatorPort('VITE_SB_AUTH_EMULATOR_PORT', 9199);
const databaseEmulatorPort = emulatorPort('VITE_SB_DATABASE_EMULATOR_PORT', 9001);
const functionsEmulatorPort = emulatorPort('VITE_SB_FUNCTIONS_EMULATOR_PORT', 5101);
const privateEmulatorHost = /^(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/.test(emulatorHost);
const demoConfig: FirebaseOptions = {
  apiKey: 'fake-api-key', authDomain: 'demo-signal-bleed-beta.firebaseapp.com',
  databaseURL: 'https://demo-signal-bleed-beta-default-rtdb.firebaseio.com',
  projectId: 'demo-signal-bleed-beta', appId: '1:123:web:demo',
};

export async function bootstrapFirebase() {
  if (import.meta.env.VITE_SB_LIVE_BACKEND !== '1') throw new Error('Live beta backend is not enabled in this build');
  if (demo && (!privateEmulatorHost || location.hostname !== emulatorHost)) throw new Error('Emulator mode is limited to its explicit local-network host');
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
    connectAuthEmulator(auth, `http://${emulatorHost}:${authEmulatorPort}`, { disableWarnings: true });
    connectDatabaseEmulator(database, emulatorHost, databaseEmulatorPort);
    connectFunctionsEmulator(functions, emulatorHost, functionsEmulatorPort);
  }
  const credential = auth.currentUser ?? (await signInAnonymously(auth)).user;
  return { uid: credential.uid, database, adapter: new FirebaseSessionAdapter(auth, database, functions), demo };
}
