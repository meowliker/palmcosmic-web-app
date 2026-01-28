import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, deleteDoc, collection, query, where, getDocs } from "firebase/firestore";

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: "Email and OTP are required" },
        { status: 400 }
      );
    }

    // Get stored OTP
    const otpDoc = await getDoc(doc(db, "otp_codes", email.toLowerCase()));

    if (!otpDoc.exists()) {
      return NextResponse.json(
        { success: false, error: "No OTP found. Please request a new code." },
        { status: 404 }
      );
    }

    const otpData = otpDoc.data();

    // Check if OTP is expired
    if (new Date(otpData.expiresAt) < new Date()) {
      await deleteDoc(doc(db, "otp_codes", email.toLowerCase()));
      return NextResponse.json(
        { success: false, error: "OTP has expired. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify OTP
    if (otpData.otp !== otp) {
      return NextResponse.json(
        { success: false, error: "Invalid OTP. Please try again." },
        { status: 400 }
      );
    }

    // OTP is valid - get user data
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Delete used OTP
    await deleteDoc(doc(db, "otp_codes", email.toLowerCase()));

    return NextResponse.json({
      success: true,
      message: "OTP verified successfully",
      user: {
        id: userDoc.id,
        email: userData.email,
        name: userData.name,
        subscriptionPlan: userData.subscriptionPlan,
        coins: userData.coins,
      },
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
