import type { Route } from "./+types/account.revoke-sessions";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  const authHeader = request.headers.get("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication is required." }, 401);
  }

  const token = authHeader.slice("Bearer ".length).trim();

  if (!token) {
    return jsonResponse({ error: "Authentication is required." }, 401);
  }

  try {
    const { getAdminAuth } = await import("../lib/firebase-admin.server");
    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    await adminAuth.revokeRefreshTokens(decodedToken.uid);

    return jsonResponse({ revoked: true });
  } catch (error) {
    console.error("Refresh tokens could not be revoked.", error);
    return jsonResponse({ error: "All-device sign out could not be completed." }, 500);
  }
}
