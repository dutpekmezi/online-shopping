import { readFile } from 'node:fs/promises';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

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

function getStorageBucketName() {
  return process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
}

async function getAdminApp() {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const serviceAccount = await loadServiceAccount();

  const storageBucket = getStorageBucketName();
  const appOptions = storageBucket ? { storageBucket } : undefined;

  if (serviceAccount) {
    return initializeApp({ credential: cert(serviceAccount), ...appOptions });
  }

  return initializeApp(appOptions);
}

export async function getAdminAuth() {
  const app = await getAdminApp();
  return getAuth(app);
}

export async function getAdminFirestore() {
  const app = await getAdminApp();
  return getFirestore(app);
}

export async function getAdminStorageBucket() {
  const app = await getAdminApp();
  return getStorage(app).bucket();
}

export { FieldValue };
