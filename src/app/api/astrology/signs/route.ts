import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Generate a cache key from birth data
function generateCacheKey(birthMonth: string, birthDay: string, birthYear: string, birthHour?: string, birthMinute?: string, birthPeriod?: string, birthPlace?: string): string {
  const parts = [birthMonth, birthDay, birthYear, birthHour || "unknown", birthMinute || "00", birthPeriod || "unknown", birthPlace || "unknown"];
  return parts.join("_").toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

export async function POST(request: NextRequest) {
  try {
    const { birthMonth, birthDay, birthYear, birthHour, birthMinute, birthPeriod, birthPlace } = await request.json();

    if (!birthMonth || !birthDay || !birthYear) {
      return NextResponse.json(
        { success: false, error: "Birth date is required" },
        { status: 400 }
      );
    }

    // Check cache first
    const cacheKey = generateCacheKey(birthMonth, birthDay, birthYear, birthHour, birthMinute, birthPeriod, birthPlace);
    try {
      const cachedDoc = await getDoc(doc(db, "astrology_signs_cache", cacheKey));
      if (cachedDoc.exists()) {
        return NextResponse.json({
          success: true,
          ...cachedDoc.data(),
        });
      }
    } catch (cacheError) {
      console.error("Cache read error:", cacheError);
    }

    const birthTime = birthHour && birthPeriod 
      ? `${birthHour}:${birthMinute || '00'} ${birthPeriod}` 
      : "unknown";

    const prompt = `You are an expert astrologer. Calculate the Sun sign, Moon sign, and Ascendant (Rising sign) for a person born on:

Date: ${birthMonth} ${birthDay}, ${birthYear}
Time: ${birthTime}
Place: ${birthPlace || "unknown location"}

IMPORTANT: Respond with ONLY valid JSON, no markdown, no code fences.

For the Sun sign, use standard Western astrology date ranges.
For the Moon sign, approximate based on the lunar cycle for that date (if exact time unknown, give the most likely sign).
For the Ascendant, calculate based on birth time and location (if time unknown, use the Sun sign as a reasonable approximation).

Return this exact JSON structure:
{
  "sunSign": {
    "name": "Aries",
    "symbol": "♈",
    "element": "Fire",
    "description": "Brief 1-sentence description of this sun sign's core traits"
  },
  "moonSign": {
    "name": "Taurus",
    "symbol": "♉",
    "element": "Earth",
    "description": "Brief 1-sentence description of emotional nature with this moon sign"
  },
  "ascendant": {
    "name": "Gemini",
    "symbol": "♊",
    "element": "Air",
    "description": "Brief 1-sentence description of how others perceive this rising sign"
  },
  "modality": "Cardinal",
  "polarity": "Masculine",
  "rulingPlanet": "Mars",
  "cosmicInsight": "A personalized 2-sentence insight about this unique combination of signs"
}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json(
        { success: false, error: "No response from AI" },
        { status: 500 }
      );
    }

    let signs;
    try {
      let jsonText = textContent.text.trim();
      jsonText = jsonText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
      signs = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse signs:", textContent.text);
      return NextResponse.json(
        { success: false, error: "Failed to parse astrological data" },
        { status: 500 }
      );
    }

    // Cache the result for future requests
    try {
      await setDoc(doc(db, "astrology_signs_cache", cacheKey), {
        ...signs,
        cachedAt: new Date().toISOString(),
      });
    } catch (cacheWriteError) {
      console.error("Cache write error:", cacheWriteError);
    }

    return NextResponse.json({
      success: true,
      ...signs,
    });
  } catch (error) {
    console.error("Astrology signs API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to calculate signs" },
      { status: 500 }
    );
  }
}
