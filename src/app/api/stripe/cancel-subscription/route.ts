import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { userId, subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Subscription ID is required" },
        { status: 400 }
      );
    }

    // Cancel the subscription at period end (not immediately)
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    // Get the cycle end date
    const subData = subscription as any;
    const cycleEndDate = new Date(subData.current_period_end * 1000).toISOString();

    // Update Firebase with cancellation status
    if (userId) {
      await updateDoc(doc(db, "users", userId), {
        subscriptionCancelled: true,
        subscriptionEndDate: cycleEndDate,
        updatedAt: new Date().toISOString(),
      });
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
