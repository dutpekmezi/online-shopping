import { readFile } from "node:fs/promises";
import process from "node:process";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

async function main() {
  const [targetEmail] = process.argv.slice(2);

  if (!targetEmail) {
    throw new Error("Usage: node scripts/set-admin-claim.mjs <email>");
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

  if (!serviceAccountPath) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH environment variable is required.");
  }

  const serviceAccountRaw = await readFile(serviceAccountPath, "utf8");
  const serviceAccount = JSON.parse(serviceAccountRaw);

  initializeApp({
    credential: cert(serviceAccount),
  });

  const userRecord = await getAuth().getUserByEmail(targetEmail);

  await getAuth().setCustomUserClaims(userRecord.uid, { admin: true });

  console.log(`Admin claim set for ${targetEmail} (${userRecord.uid}).`);
  console.log("User must refresh token (logout/login) to receive new claim.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
