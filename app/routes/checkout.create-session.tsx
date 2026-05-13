import type { Route } from './+types/checkout.create-session';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function verifyOptionalAuthToken(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return null;
  }

  const { getAdminAuth } = await import('../lib/firebase-admin.server');
  const adminAuth = await getAdminAuth();
  const decodedToken = await adminAuth.verifyIdToken(token).catch(() => null);

  return decodedToken?.uid ?? null;
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const { CheckoutError, createCheckoutSession } = await import('../lib/stripe-checkout.server');

  try {
    const payload = await request.json();
    const userId = await verifyOptionalAuthToken(request.headers.get('Authorization'));
    const session = await createCheckoutSession(request, payload, userId);

    return jsonResponse(session);
  } catch (error) {
    if (error instanceof CheckoutError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error('Checkout session request failed.', error);
    return jsonResponse({ error: 'Checkout could not be started. Please try again.' }, 500);
  }
}
