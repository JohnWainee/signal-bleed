import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { onCall } from 'firebase-functions/v2/https';
import { submitRoomCommand } from './server/command.mjs';

const firebaseConfig = process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) : {};
const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || firebaseConfig.projectId;
if (!projectId) throw new Error('Firebase project identity is required');
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST && projectId !== 'signal-bleed') throw new Error('Refusing to connect the beta handler to a different production project');
const databaseURL = process.env.FIREBASE_DATABASE_EMULATOR_HOST
  ? `https://${projectId}-default-rtdb.firebaseio.com`
  : 'https://signal-bleed-default-rtdb.firebaseio.com';
initializeApp({ databaseURL });

export const betaRoomCommand = onCall({ region: 'us-central1', maxInstances: 10, memory: '256MiB', enforceAppCheck: process.env.FUNCTIONS_EMULATOR !== 'true' }, async request => {
  return submitRoomCommand(getDatabase(), request.auth?.uid, request.data);
});
