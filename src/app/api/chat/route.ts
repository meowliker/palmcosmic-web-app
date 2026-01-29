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
  palmReading?: any;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userProfile, palmImageBase64, palmReading, context } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build personalized user context
    const profile = userProfile as UserProfile | undefined;
    let userContext = "";
    let palmContext = "";
    
    if (profile) {
      userContext = `
USER'S COSMIC PROFILE:
- Gender: ${profile.gender || "Not specified"}
- Birth Date: ${profile.birthDate || "Not specified"}
- Birth Time: ${profile.birthTime || "Not specified"}
- Birth Place: ${profile.birthPlace || "Not specified"}
- Relationship Status: ${profile.relationshipStatus || "Not specified"}
- Life Goals: ${profile.goals?.join(", ") || "Not specified"}
- Sun Sign: ${profile.sunSign || "Unknown"}
- Moon Sign: ${profile.moonSign || "Unknown"}  
- Rising Sign: ${profile.ascendantSign || "Unknown"}`;
    }

    // Add palm reading context if available
    if (palmReading) {
      palmContext = `
PALM READING INSIGHTS:
${palmReading.cosmicInsight ? `- Cosmic Insight: ${palmReading.cosmicInsight}` : ""}
${palmReading.tabs?.love?.summary ? `- Love Line: ${palmReading.tabs.love.summary}` : ""}
${palmReading.tabs?.wealth?.summary ? `- Wealth Line: ${palmReading.tabs.wealth.summary}` : ""}
${palmReading.tabs?.ageTimeline?.stages ? `- Life Timeline: User has ${palmReading.tabs.ageTimeline.stages.length} life stages mapped` : ""}`;
    }

    // Build context-aware system prompt
    const systemPrompt = `You are Elysia, a warm and intuitive cosmic guide at PalmCosmic. You feel like a trusted friend who happens to have deep mystical knowledge.

${userContext}
${palmContext}

PERSONALITY:
- You're warm, genuine, and conversational - like texting a wise friend
- You speak naturally, not overly formal or mystical
- You're empathetic and pick up on emotional undertones
- You occasionally use casual language ("honestly", "I think", "you know")
- You ask follow-up questions to show you care

CONVERSATION STYLE:
- Keep responses concise (100-150 words usually, unless they ask for detail)
- Don't start every response with "Ah" or mystical greetings
- Reference their specific signs/details naturally, not forced
- If they share something personal, acknowledge it before giving advice
- Use 1-2 emojis max, and only when it feels natural
- Sometimes just listen and validate before offering cosmic insights

TIMING & PREDICTIONS:
- When asked "when" questions (marriage, job, success, etc.), ALWAYS provide specific timeframes
- Use their birth chart and current planetary transits to give time periods (e.g., "late 2026", "within the next 18 months", "around age 28-30")
- Reference astrological timing: transits, progressions, or life stages from their palm reading
- Be specific but realistic - give ranges like "Q3 2026" or "between March-July 2027"
- If multiple favorable periods exist, mention the strongest 2-3 windows
- Example: "Based on your chart, I see strong career opportunities in late 2026 when Jupiter enters your 10th house, and again in spring 2027."

WHAT TO AVOID:
- Don't be preachy or lecture them
- Don't give generic horoscope advice
- Don't overuse mystical language ("cosmic", "celestial", "destiny" in every sentence)
- Don't ignore their emotional state
- Don't give vague timing like "soon" or "when the time is right" - be specific with years/months

${context?.previousMessages ? `\nRecent messages for context:\n${context.previousMessages.slice(-3).map((m: any) => `${m.role}: ${m.content}`).join("\n")}` : ""}`;

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
