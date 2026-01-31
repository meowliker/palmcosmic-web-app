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
      // New trial-based pricing: create subscription with trial period and upfront fee
      const subscriptionPriceId = SUBSCRIPTION_PRICE_IDS[plan];
      const trialPriceId = TRIAL_PRICE_IDS[plan];
      
      if (!subscriptionPriceId || !trialPriceId) {
        console.log("Missing price IDs for plan:", plan);
        return NextResponse.json(
          {
            error: `Price IDs not configured for plan: ${plan}. Add the required STRIPE_PRICE env vars.`,
            debug: {
              plan,
              hasSubscriptionPrice: !!subscriptionPriceId,
              hasTrialPrice: !!trialPriceId,
            },
          },
          { status: 400 }
        );
      }

      // Use subscription mode with trial period and upfront trial fee
      // This creates the subscription atomically with payment - no webhook needed
      sessionParams = {
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: subscriptionPriceId,
            quantity: 1,
          },
        ],
        subscription_data: {
          trial_period_days: TRIAL_DAYS[plan],
          metadata: {
            userId: userId || "",
            plan,
          },
          // Add upfront trial fee as invoice item
          add_invoice_items: [
            {
              price: trialPriceId,
            },
          ],
        },
        success_url: `${baseUrl}/onboarding/step-18?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/onboarding/step-17`,
        metadata: {
          userId: userId || "",
          plan,
          type: "trial_subscription",
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
