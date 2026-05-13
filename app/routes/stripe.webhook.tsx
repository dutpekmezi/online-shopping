import type { Route } from './+types/stripe.webhook';

type StripeCheckoutSession = {
  id: string;
};

type StripeEvent = {
  type: string;
  data: { object: unknown };
};

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== 'POST') {
    return new Response('Method not allowed.', { status: 405 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret) {
    return new Response('Stripe webhook secret is not configured.', { status: 500 });
  }

  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return new Response('Missing Stripe signature.', { status: 400 });
  }

  const { createOrderFromCheckoutSession, getStripeClient } = await import('../lib/stripe-checkout.server');
  const stripe = getStripeClient();
  const rawBody = await request.text();
  let event: StripeEvent;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) as StripeEvent;
  } catch (error) {
    console.error('Stripe webhook signature verification failed.', error);
    return new Response('Invalid Stripe signature.', { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as StripeCheckoutSession;
    await createOrderFromCheckoutSession(session);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
