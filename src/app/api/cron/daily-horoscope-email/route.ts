import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { sendTemplateEmail, BREVO_TEMPLATES } from "@/lib/brevo";

/**
 * GET /api/cron/daily-horoscope-email
 *
 * Cron job that sends daily horoscope/tip emails to active subscribers.
 * Should be called once daily (e.g., 8:00 AM IST via Vercel Cron or Railway Cron).
 *
 * Protected by CRON_SECRET to prevent unauthorized access.
 *
 * Flow:
 *   1. Query Firestore for all users with subscriptionStatus === "active"
 *   2. Group users by their sun sign
 *   3. Fetch today's horoscope for each sign
 *   4. Send personalized email via Brevo template
 */

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// Daily tip themes that rotate by day of week
const DAILY_THEMES: Record<number, { theme: string; emoji: string }> = {
  0: { theme: "Weekly Reflection", emoji: "🌟" },
  1: { theme: "Love & Relationships", emoji: "💕" },
  2: { theme: "Career & Money", emoji: "💼" },
  3: { theme: "Health & Wellness", emoji: "🌿" },
  4: { theme: "Personal Growth", emoji: "✨" },
  5: { theme: "Weekend Preview", emoji: "🎯" },
  6: { theme: "Spiritual Insight", emoji: "🔮" },
};

function extractSignName(sign: any): string | null {
  if (!sign) return null;
  if (typeof sign === "string") return sign;
  if (sign.name) return sign.name;
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminDb = getAdminDb();
    const today = new Date();
    const dayOfWeek = today.getDay();
    const theme = DAILY_THEMES[dayOfWeek] || DAILY_THEMES[4];
    const dateStr = today.toISOString().split("T")[0];

    // 1. Get all active subscribers
    const usersSnapshot = await adminDb
      .collection("users")
      .where("subscriptionStatus", "==", "active")
      .get();

    if (usersSnapshot.empty) {
      return NextResponse.json({
        success: true,
        message: "No active subscribers found",
        sent: 0,
      });
    }

    // 2. Group users by sun sign and collect emails
    const signGroups: Record<string, Array<{ email: string; name?: string }>> = {};

    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const email = data.email;
      if (!email) continue;

      let sunSign = extractSignName(data.sunSign);

      // Fallback: check user_profiles
      if (!sunSign) {
        try {
          const profileSnap = await adminDb.collection("user_profiles").doc(doc.id).get();
          if (profileSnap.exists) {
            sunSign = extractSignName(profileSnap.data()?.sunSign);
          }
        } catch (_) {}
      }

      // Last resort: skip users without a sign (we can't personalize)
      if (!sunSign || !ZODIAC_SIGNS.includes(sunSign)) continue;

      if (!signGroups[sunSign]) signGroups[sunSign] = [];
      signGroups[sunSign].push({ email, name: data.name });
    }

    // 3. Fetch horoscope for each sign that has subscribers
    const horoscopes: Record<string, string> = {};

    for (const sign of Object.keys(signGroups)) {
      try {
        // Try to get cached horoscope from Firestore first
        const cacheKey = `${sign.toLowerCase()}_daily_${dateStr}`;
        const cacheSnap = await adminDb.collection("horoscopes").doc(cacheKey).get();

        if (cacheSnap.exists) {
          const cacheData = cacheSnap.data();
          horoscopes[sign] = cacheData?.horoscope_data || cacheData?.text || `Today brings new energy for ${sign}. Stay open to opportunities.`;
        } else {
          // Fetch fresh horoscope from the horoscope API
          const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
          const response = await fetch(`${baseUrl}/api/horoscope/cached?sign=${sign}&period=daily`, {
            method: "GET",
          });

          if (response.ok) {
            const result = await response.json();
            horoscopes[sign] = result.horoscope_data || result.data?.horoscope_data || `Today brings new energy for ${sign}. Stay open to opportunities.`;
          } else {
            horoscopes[sign] = `Today brings new energy for ${sign}. Stay open to opportunities and trust your intuition.`;
          }
        }
      } catch (err) {
        console.error(`[Cron] Failed to fetch horoscope for ${sign}:`, err);
        horoscopes[sign] = `Today brings new energy for ${sign}. Stay open to opportunities and trust your intuition.`;
      }
    }

    // 4. Send emails to each subscriber
    let sentCount = 0;
    let errorCount = 0;

    for (const [sign, users] of Object.entries(signGroups)) {
      const horoscope = horoscopes[sign] || "";

      for (const user of users) {
        try {
          await sendTemplateEmail(
            { email: user.email, name: user.name },
            BREVO_TEMPLATES.DAILY_HOROSCOPE,
            {
              SUN_SIGN: sign,
              HOROSCOPE: horoscope,
              THEME: theme.theme,
              THEME_EMOJI: theme.emoji,
              DATE: today.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              FIRSTNAME: user.name || "Cosmic Soul",
              APP_URL: process.env.NEXT_PUBLIC_APP_URL || "https://palmcosmic.com",
            }
          );
          sentCount++;
        } catch (err) {
          errorCount++;
          console.error(`[Cron] Failed to send email to ${user.email}:`, err);
        }
      }
    }

    console.log(`[Cron] Daily horoscope emails sent: ${sentCount}, errors: ${errorCount}`);

    return NextResponse.json({
      success: true,
      date: dateStr,
      theme: theme.theme,
      sent: sentCount,
      errors: errorCount,
      signs: Object.keys(signGroups).length,
    });
  } catch (error: any) {
    console.error("[Cron] daily-horoscope-email error:", error);
    return NextResponse.json(
      { error: error.message || "Cron job failed" },
      { status: 500 }
    );
  }
}
