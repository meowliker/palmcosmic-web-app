import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAdminDb } from "@/lib/firebase-admin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId, subscriptionId } = await request.json();

    let resolvedSubscriptionId: string | null = subscriptionId || null;

    let resolvedCustomerId: string | null = null;

    if (!resolvedSubscriptionId && userId) {
      const adminDb = getAdminDb();
      const snap = await adminDb.collection("users").doc(userId).get();
      if (snap.exists) {
        resolvedSubscriptionId = ((snap.data() as any)?.stripeSubscriptionId as string) || null;
        resolvedCustomerId = ((snap.data() as any)?.stripeCustomerId as string) || null;
      }
    }

    if (!resolvedSubscriptionId && resolvedCustomerId) {
      const subs = await stripe.subscriptions.list({
        customer: resolvedCustomerId,
        status: "all",
        limit: 10,
      });

      const preferred = subs.data.find((s) => ["active", "trialing", "past_due"].includes((s as any).status)) || subs.data[0];
      if (preferred?.id) {
        resolvedSubscriptionId = preferred.id;

        if (userId) {
          const adminDb = getAdminDb();
          await adminDb.collection("users").doc(userId).set(
            {
              stripeSubscriptionId: preferred.id,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );
        }
      }
    }

    if (!resolvedSubscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Cancel the subscription at period end (not immediately)
    const subscription = await stripe.subscriptions.update(resolvedSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Get the cycle end date
    const subData = subscription as any;
    const cycleEndDate = new Date(subData.current_period_end * 1000).toISOString();

    // Update Firebase with cancellation status
    if (userId) {
      const adminDb = getAdminDb();
      const now = new Date().toISOString();
      await adminDb.collection("users").doc(userId).set(
        {
          subscriptionCancelled: true,
          subscriptionEndDate: cycleEndDate,
          stripeSubscriptionId: subscription.id,
          updatedAt: now,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      cycleEndDate,
      message: "Subscription will be cancelled at the end of the billing period",
    });
  } catch (error: any) {
    console.error("Cancel subscription error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
