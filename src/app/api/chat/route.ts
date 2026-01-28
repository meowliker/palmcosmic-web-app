import { anthropic } from "@/lib/anthropic";
import { NextRequest, NextResponse } from "next/server";

interface UserProfile {
  gender?: string;
  birthDate?: string;
  birthTime?: string | null;
  birthPlace?: string;
  relationshipStatus?: string;
  goals?: string[];
  sunSign?: string;
  moonSign?: string;
  ascendantSign?: string;
  hasPalmImage?: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userProfile, palmImageBase64, context } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build personalized user context
    const profile = userProfile as UserProfile | undefined;
    let userContext = "";
    
    if (profile) {
      userContext = `
USER'S PERSONAL COSMIC PROFILE (Use this to give SPECIFIC, PERSONALIZED answers):
- Gender: ${profile.gender || "Not specified"}
- Birth Date: ${profile.birthDate || "Not specified"}
- Birth Time: ${profile.birthTime || "Not specified"}
- Birth Place: ${profile.birthPlace || "Not specified"}
- Relationship Status: ${profile.relationshipStatus || "Not specified"}
- Life Goals: ${profile.goals?.join(", ") || "Not specified"}
- Sun Sign: ${profile.sunSign || "Unknown"}
- Moon Sign: ${profile.moonSign || "Unknown"}  
- Ascendant/Rising Sign: ${profile.ascendantSign || "Unknown"}
- Has Palm Reading: ${profile.hasPalmImage ? "Yes" : "No"}

IMPORTANT: Always reference the user's SPECIFIC signs, birth details, and goals in your answers. 
For example, if they ask about love, reference their ${profile.ascendantSign || "rising"} sign traits and ${profile.relationshipStatus || "relationship"} status.
If they ask about career, reference their goals: ${profile.goals?.join(", ") || "their aspirations"}.
Never give generic horoscope advice - always tie it back to THEIR specific chart.`;
    }

    // Build context-aware system prompt
    const systemPrompt = `You are Elysia, a mystical palm reading and astrology expert for PalmCosmic.
You have FULL ACCESS to the user's birth chart, palm reading, and cosmic profile.

${userContext}

YOUR ROLE:
- Give SPECIFIC, PERSONALIZED guidance based on the user's actual birth chart and signs
- Reference their Sun sign (${profile?.sunSign || "unknown"}), Moon sign (${profile?.moonSign || "unknown"}), and Rising sign (${profile?.ascendantSign || "unknown"}) in your answers
- Connect advice to their stated goals and relationship status
- If they have a palm reading, reference insights from palm analysis
- Be warm, mystical, and insightful

RESPONSE GUIDELINES:
- Keep responses under 250 words
- Always mention at least one specific detail from their profile
- Use emojis sparingly (1-2 per response)
- Be encouraging but also provide genuine cosmic insights
- If asked about compatibility, use their actual signs for analysis

${context?.previousMessages ? `\nRecent conversation:\n${JSON.stringify(context.previousMessages)}` : ""}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const textContent = response.content.find((block) => block.type === "text");
    const reply = textContent && "text" in textContent ? textContent.text : "";

    return NextResponse.json({
      reply,
      usage: response.usage,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}
