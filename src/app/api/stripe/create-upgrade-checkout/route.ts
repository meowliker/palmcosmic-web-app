import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Price IDs for subscription plans
const PRICE_IDS: Record<string, string> = {
  // New manage subscription plans
  "2week-plan": process.env.STRIPE_PRICE_2WEEK_PLAN!,  // $19.99 every 2 weeks
  "monthly-plan": process.env.STRIPE_PRICE_MONTHLY_PLAN!, // $29.99 monthly
  // Legacy plans (for backward compatibility)
  weekly: process.env.STRIPE_PRICE_WEEKLY!,
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
  // Trial plan mappings (if user somehow tries to upgrade to these)
  "1week": process.env.STRIPE_PRICE_2WEEK_PLAN!,
  "2week": process.env.STRIPE_PRICE_2WEEK_PLAN!,
  "4week": process.env.STRIPE_PRICE_MONTHLY_PLAN!,
};

// Upgrade checkout - NO trial period (user already has a subscription)
export async function POST(request: NextRequest) {
  try {
    const { plan, userId, email } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("Stripe not configured - skipping checkout");
      return NextResponse.json({ skip: true, message: "Stripe not configured" });
    }

    const priceId = PRICE_IDS[plan];
    
    if (!plan || !priceId) {
      return NextResponse.json(
        { error: `Price ID not configured for plan: ${plan}` },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://palmcosmic-web-app.vercel.app";

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/manage-subscription?upgraded=true&plan=${plan}`,
      cancel_url: `${baseUrl}/manage-subscription`,
      metadata: {
        userId: userId || "",
        plan,
        isUpgrade: "true",
      },
      // NO trial_period_days for upgrades
      subscription_data: {
        metadata: {
          userId: userId || "",
          plan,
          isUpgrade: "true",
        },
      },
    };

    if (email && email.includes("@")) {
      sessionParams.customer_email = email;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe upgrade checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
