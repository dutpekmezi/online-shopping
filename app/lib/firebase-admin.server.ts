import { readFile } from 'node:fs/promises';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

async function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  }

  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccountRaw = await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, 'utf8');
    return JSON.parse(serviceAccountRaw);
  }

  return null;
}

async function getAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const serviceAccount = await loadServiceAccount();

  if (serviceAccount) {
    return initializeApp({ credential: cert(serviceAccount) });
  }

  return initializeApp();
}

export async function getAdminAuth() {
  const app = await getAdminApp();
  return getAuth(app);
}

export async function getAdminFirestore() {
  const app = await getAdminApp();
  return getFirestore(app);
}

export { FieldValue };
