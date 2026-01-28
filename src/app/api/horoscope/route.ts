import { NextRequest, NextResponse } from "next/server";

const HOROSCOPE_API_BASE = "https://horoscope-app-api.vercel.app/api/v1";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sign = searchParams.get("sign");
  const period = searchParams.get("period") || "daily"; // daily, weekly, monthly
  const day = searchParams.get("day") || "TODAY"; // TODAY, TOMORROW, YESTERDAY, or YYYY-MM-DD

  if (!sign) {
    return NextResponse.json(
      { success: false, error: "Sign is required" },
      { status: 400 }
    );
  }

  // API requires lowercase sign names
  const signLower = sign.toLowerCase();

  try {
    let endpoint = "";
    let url = "";

    switch (period) {
      case "weekly":
        endpoint = "/get-horoscope/weekly";
        url = `${HOROSCOPE_API_BASE}${endpoint}?sign=${signLower}`;
        break;
      case "monthly":
        endpoint = "/get-horoscope/monthly";
        url = `${HOROSCOPE_API_BASE}${endpoint}?sign=${signLower}`;
        break;
      case "daily":
      default:
        endpoint = "/get-horoscope/daily";
        url = `${HOROSCOPE_API_BASE}${endpoint}?sign=${signLower}&day=${day}`;
        break;
    }

    const response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.data,
      period,
      sign,
    });
  } catch (error) {
    console.error("Horoscope API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch horoscope data" },
      { status: 500 }
    );
  }
}
