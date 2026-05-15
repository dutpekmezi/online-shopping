declare module 'stripe' {
  namespace Stripe {
    type Address = {
      city?: string | null;
      country?: string | null;
      line1?: string | null;
      line2?: string | null;
      postal_code?: string | null;
      state?: string | null;
    };

    namespace Checkout {
      type SessionCreateParams = {
        mode?: string;
        payment_method_types?: string[];
        line_items?: SessionCreateParams.LineItem[];
        success_url?: string;
        cancel_url?: string;
        client_reference_id?: string;
        customer_creation?: 'always' | 'if_required';
        billing_address_collection?: 'auto' | 'required';
        phone_number_collection?: { enabled: boolean };
        shipping_address_collection?: {
          allowed_countries: string[];
        };
        custom_text?: SessionCreateParams.CustomText;
        shipping_options?: SessionCreateParams.ShippingOption[];
        metadata?: Record<string, string>;
        customer_email?: string;
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

        type CustomText = {
          shipping_address?: {
            message: string;
          };
        };

        type ShippingOption = {
          shipping_rate_data?: {
            type?: 'fixed_amount';
            fixed_amount?: {
              amount?: number;
              currency?: string;
            };
            display_name?: string;
            delivery_estimate?: {
              minimum?: { unit?: 'business_day' | 'day' | 'hour' | 'month' | 'week'; value?: number };
              maximum?: { unit?: 'business_day' | 'day' | 'hour' | 'month' | 'week'; value?: number };
            };
          };
        };
      }

      type CustomerDetails = {
        address?: Stripe.Address | null;
        email?: string | null;
        name?: string | null;
        phone?: string | null;
      };

      type ShippingDetails = {
        address?: Stripe.Address | null;
        name?: string | null;
        phone?: string | null;
      };

      type TotalDetails = {
        amount_discount?: number | null;
        amount_shipping?: number | null;
        amount_tax?: number | null;
      };

      type Session = {
        id: string;
        url?: string | null;
        created?: number | null;
        customer_details?: CustomerDetails | null;
        customer_email?: string | null;
        shipping_details?: ShippingDetails | null;
        collected_information?: {
          shipping_details?: ShippingDetails | null;
        } | null;
        client_reference_id?: string | null;
        metadata?: Record<string, string> | null;
        amount_subtotal?: number | null;
        amount_total?: number | null;
        total_details?: TotalDetails | null;
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
        retrieve(sessionId: string, params?: { expand?: string[] }): Promise<Stripe.Checkout.Session>;
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
