import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const email = searchParams.get("email");

    if (!userId && !email) {
      return NextResponse.json(
        { error: "User ID or email is required" },
        { status: 400 }
      );
    }

    let userDoc;
    
    if (userId) {
      userDoc = await getDoc(doc(db, "users", userId));
    }

    if (!userDoc?.exists() && email) {
      // Try to find user by email in a different way if needed
      // For now, we'll just use the userId approach
    }

    if (!userDoc?.exists()) {
      return NextResponse.json({
        trialCompleted: false,
        hasSubscription: false,
        subscriptionStatus: null,
      });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      trialCompleted: userData.trialCompleted || false,
      trialEndedAt: userData.trialEndedAt || null,
      hasSubscription: !!userData.subscriptionPlan,
      subscriptionStatus: userData.subscriptionStatus || null,
      subscriptionCancelled: userData.subscriptionCancelled || false,
      paymentStatus: userData.paymentStatus || null,
    });
  } catch (error: any) {
    console.error("Check trial status error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to check trial status" },
      { status: 500 }
    );
  }
}
