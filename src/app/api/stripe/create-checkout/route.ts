import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS: Record<string, string> = {
  weekly: process.env.STRIPE_PRICE_WEEKLY!,
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
};

// Trial periods in days for each plan
const TRIAL_DAYS: Record<string, number> = {
  weekly: 3,    // 3-day trial
  monthly: 7,   // 1-week trial
  yearly: 14,   // 2-week trial
};

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, email } = await request.json();

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("Stripe not configured - skipping checkout");
      return NextResponse.json({ skip: true, message: "Stripe not configured" });
    }

    const priceId = PRICE_IDS[plan];
    if (!plan || !priceId) {
      console.log("Missing price ID for plan:", plan, "Available:", PRICE_IDS);
      return NextResponse.json(
        {
          error: `Price ID not configured for plan: ${plan}. Add STRIPE_PRICE_${plan.toUpperCase()} to .env.local`,
          debug: {
            plan,
            vercelEnv: process.env.VERCEL_ENV || null,
            nodeEnv: process.env.NODE_ENV || null,
            hasStripeSecretKey: !!process.env.STRIPE_SECRET_KEY,
            hasWeeklyPrice: !!process.env.STRIPE_PRICE_WEEKLY,
            hasMonthlyPrice: !!process.env.STRIPE_PRICE_MONTHLY,
            hasYearlyPrice: !!process.env.STRIPE_PRICE_YEARLY,
          },
        },
        { status: 400 }
      );
    }

    // Get the base URL - use request origin as fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://palmcosmic-web-app.vercel.app";

    const sessionParams: any = {
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true, // Enable promo code field in checkout
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/onboarding/step-18?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/onboarding/step-17`,
      metadata: {
        userId: userId || "",
        plan,
      },
      subscription_data: {
        trial_period_days: TRIAL_DAYS[plan],
        metadata: {
          userId: userId || "",
          plan,
        },
      },
    };

    // Only add customer_email if it's a valid email
    if (email && email.includes("@")) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
