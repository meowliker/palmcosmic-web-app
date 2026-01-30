import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// New trial-based pricing structure
// Trial prices (one-time upfront payment)
const TRIAL_PRICE_IDS: Record<string, string> = {
  "1week": process.env.STRIPE_PRICE_1WEEK_TRIAL!, // $1 trial
  "2week": process.env.STRIPE_PRICE_2WEEK_TRIAL!, // $5.49 trial
  "4week": process.env.STRIPE_PRICE_4WEEK_TRIAL!, // $9.99 trial
};

// Recurring subscription prices (after trial ends)
const SUBSCRIPTION_PRICE_IDS: Record<string, string> = {
  "1week": process.env.STRIPE_PRICE_2WEEK_PLAN!,  // $19.99 every 2 weeks
  "2week": process.env.STRIPE_PRICE_2WEEK_PLAN!,  // $19.99 every 2 weeks
  "4week": process.env.STRIPE_PRICE_MONTHLY_PLAN!, // $29.99 monthly
};

// Trial periods in days for each plan
const TRIAL_DAYS: Record<string, number> = {
  "1week": 7,   // 1-week trial
  "2week": 14,  // 2-week trial
  "4week": 28,  // 4-week trial
};

// Legacy price IDs for backward compatibility
const LEGACY_PRICE_IDS: Record<string, string> = {
  weekly: process.env.STRIPE_PRICE_WEEKLY!,
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
};

export async function POST(request: NextRequest) {
  try {
    const { plan, userId, email } = await request.json();

    // Check if Stripe is configured
    if (!process.env.STRIPE_SECRET_KEY) {
      console.log("Stripe not configured - skipping checkout");
      return NextResponse.json({ skip: true, message: "Stripe not configured" });
    }

    // Check if it's a new trial plan or legacy plan
    const isNewTrialPlan = ["1week", "2week", "4week"].includes(plan);
    
    // Get the base URL - use request origin as fallback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "https://palmcosmic-web-app.vercel.app";

    let sessionParams: any;

    if (isNewTrialPlan) {
      // New trial-based pricing: charge upfront trial fee, then create subscription via webhook
      const subscriptionPriceId = SUBSCRIPTION_PRICE_IDS[plan];
      
      if (!subscriptionPriceId) {
        console.log("Missing subscription price ID for plan:", plan);
        return NextResponse.json(
          {
            error: `Subscription price not configured for plan: ${plan}. Add the required STRIPE_PRICE env vars.`,
            debug: {
              plan,
              has2WeekPlan: !!process.env.STRIPE_PRICE_2WEEK_PLAN,
              hasMonthlyPlan: !!process.env.STRIPE_PRICE_MONTHLY_PLAN,
            },
          },
          { status: 400 }
        );
      }

      // Trial fees in cents
      const trialFees: Record<string, number> = {
        "1week": 100,   // $1.00 in cents
        "2week": 549,   // $5.49 in cents
        "4week": 999,   // $9.99 in cents
      };

      // Use payment mode for the trial fee with setup_future_usage to save payment method
      // The subscription will be created via webhook after payment succeeds
      sessionParams = {
        mode: "payment",
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `${plan === "1week" ? "1-Week" : plan === "2week" ? "2-Week" : "4-Week"} Trial Access`,
                description: `Trial period access. After ${TRIAL_DAYS[plan]} days, you'll be charged ${plan === "4week" ? "$29.99/month" : "$19.99 every 2 weeks"}.`,
              },
              unit_amount: trialFees[plan],
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/onboarding/step-18?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/onboarding/step-17`,
        payment_intent_data: {
          setup_future_usage: "off_session",
          metadata: {
            userId: userId || "",
            plan,
            type: "trial_subscription",
            subscriptionPriceId,
            trialDays: TRIAL_DAYS[plan].toString(),
          },
        },
        metadata: {
          userId: userId || "",
          plan,
          type: "trial_subscription",
          subscriptionPriceId,
          trialDays: TRIAL_DAYS[plan].toString(),
        },
      };
    } else {
      // Legacy plan handling
      const priceId = LEGACY_PRICE_IDS[plan];
      if (!plan || !priceId) {
        console.log("Missing price ID for plan:", plan);
        return NextResponse.json(
          {
            error: `Price ID not configured for plan: ${plan}`,
            debug: {
              plan,
              hasWeeklyPrice: !!process.env.STRIPE_PRICE_WEEKLY,
              hasMonthlyPrice: !!process.env.STRIPE_PRICE_MONTHLY,
              hasYearlyPrice: !!process.env.STRIPE_PRICE_YEARLY,
            },
          },
          { status: 400 }
        );
      }

      sessionParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        allow_promotion_codes: true,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/onboarding/step-18?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/onboarding/step-17`,
        metadata: {
          userId: userId || "",
          plan,
          type: "subscription",
        },
        subscription_data: {
          trial_period_days: plan === "weekly" ? 3 : plan === "monthly" ? 7 : 14,
          metadata: {
            userId: userId || "",
            plan,
          },
        },
      };
    }

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
