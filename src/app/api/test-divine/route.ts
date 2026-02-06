import { NextRequest, NextResponse } from "next/server";

// Simple test endpoint to verify Divine API is working
export async function GET(request: NextRequest) {
  const DIVINE_API_KEY = process.env.DIVINE_API_KEY || "";
  
  if (!DIVINE_API_KEY) {
    return NextResponse.json({
      success: false,
      error: "Divine API key not configured",
      message: "Please add DIVINE_API_KEY to your .env.local file",
    });
  }

  try {
    // Test with a simple daily horoscope request
    const response = await fetch("https://horoscopeapi-1.divineapi.com/api/v2/daily-horoscope", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${DIVINE_API_KEY}`,
      },
      body: JSON.stringify({
        sign: "aries",
        day: "today",
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: "Divine API request failed",
        status: response.status,
        message: data.message || data.error || "Unknown error",
        details: data,
      });
    }

    return NextResponse.json({
      success: true,
      message: "✅ Divine API is working correctly!",
      apiKeyConfigured: true,
      testEndpoint: "daily-horoscope",
      testSign: "aries",
      responsePreview: {
        prediction: data.prediction?.substring(0, 100) + "..." || "No prediction",
        date: data.date || "No date",
      },
      fullResponse: data,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: "Failed to connect to Divine API",
      message: error.message,
      details: error.toString(),
    });
  }
}
