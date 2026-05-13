declare module 'stripe' {
  namespace Stripe {
    namespace Checkout {
      type SessionCreateParams = {
        mode?: string;
        payment_method_types?: string[];
        line_items?: SessionCreateParams.LineItem[];
        success_url?: string;
        cancel_url?: string;
        client_reference_id?: string;
        metadata?: Record<string, string>;
      };

      namespace SessionCreateParams {
        type LineItem = {
          quantity?: number;
          price_data?: {
            currency?: string;
            unit_amount?: number;
            product_data?: {
              name?: string;
              description?: string;
              images?: string[];
              metadata?: Record<string, string>;
            };
          };
        };
      }

      type Session = {
        id: string;
        url?: string | null;
        created?: number | null;
        customer_details?: { email?: string | null } | null;
        customer_email?: string | null;
        client_reference_id?: string | null;
        metadata?: Record<string, string> | null;
        amount_subtotal?: number | null;
        amount_total?: number | null;
        currency?: string | null;
        payment_status?: string | null;
        payment_intent?: string | { id?: string } | null;
      };
    }

    type Product = {
      name?: string;
      metadata?: Record<string, string>;
    };

    type Price = {
      unit_amount?: number | null;
      product?: string | Product | ({ deleted: true } & Record<string, unknown>) | null;
    };

    type LineItem = {
      description?: string | null;
      quantity?: number | null;
      amount_subtotal?: number | null;
      amount_total?: number | null;
      price?: Price | null;
    };

    type Event = {
      type: string;
      data: { object: unknown };
    };
  }

  class Stripe {
    constructor(secretKey: string);
    checkout: {
      sessions: {
        create(params: Stripe.Checkout.SessionCreateParams): Promise<Stripe.Checkout.Session>;
        listLineItems(
          sessionId: string,
          params?: { limit?: number; expand?: string[] },
        ): Promise<{ data: Stripe.LineItem[] }>;
      };
    };
    webhooks: {
      constructEvent(payload: string | Buffer, signature: string, secret: string): Stripe.Event;
    };
  }

  export default Stripe;
}
