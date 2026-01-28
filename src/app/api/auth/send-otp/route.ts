import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import nodemailer from "nodemailer";

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Create email transporter
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD, // App password for Gmail
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists in Firebase
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { success: false, error: "USER_NOT_FOUND", message: "No account found with this email" },
        { status: 404 }
      );
    }

    // Get user data
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firebase
    await setDoc(doc(db, "otp_codes", email.toLowerCase()), {
      otp,
      email: email.toLowerCase(),
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      verified: false,
    });

    // Send email with OTP
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      const transporter = createTransporter();
      
      await transporter.sendMail({
        from: `"PalmCosmic" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "Your PalmCosmic Verification Code",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; background-color: #0A0E1A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ffffff; font-size: 28px; margin: 0;">✨ PalmCosmic</h1>
                <p style="color: #9CA3AF; font-size: 14px; margin-top: 8px;">Your Cosmic Journey Awaits</p>
              </div>
              
              <div style="background: linear-gradient(135deg, #1A1F2E 0%, #0A0E1A 100%); border-radius: 16px; padding: 32px; border: 1px solid rgba(255,255,255,0.1);">
                <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 16px 0; text-align: center;">Your Verification Code</h2>
                <p style="color: #9CA3AF; font-size: 14px; text-align: center; margin-bottom: 24px;">
                  Enter this code to sign in to your PalmCosmic account
                </p>
                
                <div style="background: rgba(168, 85, 247, 0.1); border: 2px solid #A855F7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-size: 36px; font-weight: bold; color: #A855F7; letter-spacing: 8px;">${otp}</span>
                </div>
                
                <p style="color: #6B7280; font-size: 12px; text-align: center; margin: 0;">
                  This code expires in 10 minutes. If you didn't request this code, please ignore this email.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6B7280; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} PalmCosmic. All rights reserved.
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
    } else {
      // For development without email configured
      console.log(`OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent successfully",
      userId: userDoc.id,
    });
  } catch (error: any) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send OTP" },
      { status: 500 }
    );
  }
}
