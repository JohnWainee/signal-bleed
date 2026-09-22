import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { onCall } from 'firebase-functions/v2/https';
import { submitRoomCommand } from './server/command.mjs';

initializeApp();

export const betaRoomCommand = onCall({ region: 'us-central1', maxInstances: 10, memory: '256MiB', enforceAppCheck: false }, async request => {
  return submitRoomCommand(getDatabase(), request.auth?.uid, request.data);
});
