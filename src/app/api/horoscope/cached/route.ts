import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const HOROSCOPE_API_BASE = "https://horoscope-app-api.vercel.app/api/v1";

const ZODIAC_SIGNS = [
  "aries", "taurus", "gemini", "cancer", "leo", "virgo",
  "libra", "scorpio", "sagittarius", "capricorn", "aquarius", "pisces"
];

// Get the current date in YYYY-MM-DD format (UTC to ensure consistency)
function getDateKey(offset: number = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Get the current week number (UTC)
function getWeekKey(): string {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  const weekNum = Math.floor(diff / oneWeek);
  return `${now.getUTCFullYear()}-W${weekNum}`;
}

// Get the current month key (UTC)
function getMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

// Fetch horoscope from external API
async function fetchHoroscopeFromAPI(sign: string, period: string, day: string = "TODAY") {
  let endpoint = "";
  let url = "";

  switch (period) {
    case "weekly":
      endpoint = "/get-horoscope/weekly";
      url = `${HOROSCOPE_API_BASE}${endpoint}?sign=${sign}`;
      break;
    case "monthly":
      endpoint = "/get-horoscope/monthly";
      url = `${HOROSCOPE_API_BASE}${endpoint}?sign=${sign}`;
      break;
    case "daily":
    default:
      endpoint = "/get-horoscope/daily";
      url = `${HOROSCOPE_API_BASE}${endpoint}?sign=${sign}&day=${day}`;
      break;
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  return response.json();
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sign = searchParams.get("sign")?.toLowerCase();
  const period = searchParams.get("period") || "daily";
  const day = searchParams.get("day") || "TODAY"; // TODAY or TOMORROW

  if (!sign || !ZODIAC_SIGNS.includes(sign)) {
    return NextResponse.json(
      { success: false, error: "Valid sign is required" },
      { status: 400 }
    );
  }

  try {
    // Determine the cache key based on period
    let cacheKey = "";
    let cacheDocId = "";
    let apiDay = "TODAY";
    
    switch (period) {
      case "weekly":
        cacheKey = getWeekKey();
        cacheDocId = `horoscope_weekly_${sign}_${cacheKey}`;
        break;
      case "monthly":
        cacheKey = getMonthKey();
        cacheDocId = `horoscope_monthly_${sign}_${cacheKey}`;
        break;
      case "daily":
      default:
        // For daily, use different cache keys for TODAY vs TOMORROW
        if (day === "TOMORROW") {
          cacheKey = getDateKey(1); // Tomorrow's date
          apiDay = "TOMORROW";
        } else {
          cacheKey = getDateKey(0); // Today's date
          apiDay = "TODAY";
        }
        cacheDocId = `horoscope_daily_${sign}_${cacheKey}`;
        break;
    }

    // Try to get cached horoscope from Firebase
    const cachedDoc = await getDoc(doc(db, "horoscopes", cacheDocId));
    
    if (cachedDoc.exists()) {
      const cachedData = cachedDoc.data();
      return NextResponse.json({
        success: true,
        data: cachedData.horoscope,
        period,
        sign,
        day: apiDay,
        cached: true,
        cacheKey,
      });
    }

    // No cache found - fetch from API
    const apiResponse = await fetchHoroscopeFromAPI(sign, period, apiDay);
    const horoscopeData = apiResponse.data;

    // Save to Firebase cache
    await setDoc(doc(db, "horoscopes", cacheDocId), {
      horoscope: horoscopeData,
      sign,
      period,
      cacheKey,
      fetchedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      data: horoscopeData,
      period,
      sign,
      cached: false,
      cacheKey,
    });
  } catch (error) {
    console.error("Horoscope API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch horoscope data" },
      { status: 500 }
    );
  }
}

// POST endpoint to pre-fetch horoscopes for all signs (can be called by a cron job)
export async function POST(request: NextRequest) {
  try {
    const { period = "daily", prefetchTomorrow = false } = await request.json();
    
    const results: Record<string, boolean> = {};
    
    for (const sign of ZODIAC_SIGNS) {
      try {
        // Determine cache key
        let cacheKey = "";
        let cacheDocId = "";
        let day = "TODAY";
        
        switch (period) {
          case "weekly":
            cacheKey = getWeekKey();
            cacheDocId = `horoscope_weekly_${sign}_${cacheKey}`;
            break;
          case "monthly":
            cacheKey = getMonthKey();
            cacheDocId = `horoscope_monthly_${sign}_${cacheKey}`;
            break;
          case "daily":
          default:
            if (prefetchTomorrow) {
              cacheKey = getDateKey(1); // Tomorrow
              day = "TOMORROW";
            } else {
              cacheKey = getDateKey();
            }
            cacheDocId = `horoscope_daily_${sign}_${cacheKey}`;
            break;
        }

        // Check if already cached
        const existingDoc = await getDoc(doc(db, "horoscopes", cacheDocId));
        if (existingDoc.exists()) {
          results[sign] = true; // Already cached
          continue;
        }

        // Fetch and cache
        const apiResponse = await fetchHoroscopeFromAPI(sign, period, day);
        await setDoc(doc(db, "horoscopes", cacheDocId), {
          horoscope: apiResponse.data,
          sign,
          period,
          cacheKey,
          fetchedAt: new Date().toISOString(),
        });
        
        results[sign] = true;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (err) {
        console.error(`Failed to fetch horoscope for ${sign}:`, err);
        results[sign] = false;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Pre-fetched ${period} horoscopes`,
      results,
    });
  } catch (error) {
    console.error("Horoscope prefetch error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to prefetch horoscopes" },
      { status: 500 }
    );
  }
}
