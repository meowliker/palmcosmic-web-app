import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

function offersToUnlockedFeatures(offers: string[]) {
  const updates: Record<string, boolean> = {};

  for (const offer of offers) {
    if (offer === "ultra-pack") {
      updates["unlockedFeatures.prediction2026"] = true;
      updates["unlockedFeatures.birthChart"] = true;
      updates["unlockedFeatures.compatibilityTest"] = true;
      continue;
    }
    if (offer === "2026-predictions") updates["unlockedFeatures.prediction2026"] = true;
    if (offer === "birth-chart") updates["unlockedFeatures.birthChart"] = true;
    if (offer === "compatibility") updates["unlockedFeatures.compatibilityTest"] = true;
  }

  return updates;
}

function getPlanCoins(plan?: string | null) {
  if (plan === "weekly" || plan === "monthly") return 15;
  if (plan === "yearly") return 30;
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId } = await request.json();

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
    }

    const resolvedSessionId = typeof sessionId === "string" ? sessionId.trim() : "";
    if (!resolvedSessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(resolvedSessionId);
    const meta: any = (session as any).metadata || {};

    const resolvedUserId = (String(meta.userId || userId || "")).trim();
    if (!resolvedUserId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const paymentStatus = (session.payment_status || "").toLowerCase();
    if (paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
      return NextResponse.json(
        { error: `Checkout not paid (status=${session.payment_status})` },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const userRef = adminDb.collection("users").doc(resolvedUserId);

    // Idempotency: don't apply the same session twice.
    const userPaymentRef = userRef.collection("payments").doc(resolvedSessionId);
    const existing = await userPaymentRef.get();
    if (existing.exists && (existing.data() as any)?.fulfilledAt) {
      return NextResponse.json({ success: true, alreadyFulfilled: true });
    }

    const now = new Date().toISOString();

    // Persist payment record (and mark as fulfilled).
    const paymentRecord = {
      eventType: "fulfill.checkout.session",
      sessionId: session.id,
      userId: resolvedUserId,
      type: meta.type || null,
      plan: meta.plan || null,
      offers: meta.offers || null,
      feature: meta.feature || null,
      coins: meta.coins || null,
      customerEmail: session.customer_details?.email || session.customer_email || null,
      amountTotal: session.amount_total ?? null,
      currency: session.currency || null,
      paymentStatus: session.payment_status || null,
      createdAt: now,
      fulfilledAt: now,
    };

    await userPaymentRef.set(paymentRecord, { merge: true });
    await adminDb.collection("payments").doc(resolvedSessionId).set(paymentRecord, { merge: true });

    // Apply entitlements.
    const type = String(meta.type || "").trim();

    await userRef.set(
      {
        email: (session.customer_details?.email || session.customer_email || "").toLowerCase() || null,
        updatedAt: now,
      },
      { merge: true }
    );

    if (type === "upsell") {
      const offerList = String(meta.offers || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const unlockUpdates = offersToUnlockedFeatures(offerList);
      await userRef.set(
        {
          ...unlockUpdates,
          updatedAt: now,
        },
        { merge: true }
      );
    } else if (type === "report") {
      const feature = String(meta.feature || "").trim();
      if (feature) {
        await userRef.set(
          {
            [`unlockedFeatures.${feature}`]: true,
            updatedAt: now,
          },
          { merge: true }
        );
      }
    } else if (type === "coins") {
      const coinsToAdd = parseInt(String(meta.coins || "0"), 10) || 0;
      if (coinsToAdd > 0) {
        await userRef.set(
          {
            coins: FieldValue.increment(coinsToAdd),
            updatedAt: now,
          },
          { merge: true }
        );
      }
    } else {
      // Treat as subscription fulfillment.
      const plan = String(meta.plan || "").trim() || null;
      const coinsToAdd = getPlanCoins(plan);
      await userRef.set(
        {
          subscriptionPlan: plan,
          subscriptionStatus: "active",
          subscriptionStartedAt: now,
          subscriptionCancelled: false,
          stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
          stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
          updatedAt: now,
        },
        { merge: true }
      );
      if (coinsToAdd > 0) {
        await userRef.set(
          {
            coins: FieldValue.increment(coinsToAdd),
            updatedAt: now,
          },
          { merge: true }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fulfill checkout session error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fulfill checkout session" },
      { status: 500 }
    );
  }
}
