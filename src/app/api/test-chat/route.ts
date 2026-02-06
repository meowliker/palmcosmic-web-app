import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "fs";
import { join } from "path";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Load the master reading prompt
let MASTER_PROMPT = "";
try {
  MASTER_PROMPT = readFileSync(
    join(process.cwd(), "prompts/master_reading_prompt.txt"),
    "utf-8"
  );
} catch (error) {
  console.error("Failed to load master prompt:", error);
}

export async function POST(request: NextRequest) {
  try {
    const { question, palmData, natalData, userContext, chatHistory } = await request.json();

    if (!question) {
      return NextResponse.json(
        { success: false, error: "Question is required" },
        { status: 400 }
      );
    }

    // Build context from available data
    let contextData = "";

    if (natalData) {
      contextData += `\n\n=== NATAL CHART DATA ===\n${JSON.stringify(natalData, null, 2)}`;
    }

    if (palmData) {
      contextData += `\n\n=== PALM ANALYSIS DATA ===\n${JSON.stringify(palmData, null, 2)}`;
    }

    if (userContext) {
      contextData += `\n\n=== USER CONTEXT ===\n${JSON.stringify(userContext, null, 2)}`;
    }

    // Build messages array with chat history
    const messages: Anthropic.MessageParam[] = [];

    // Add chat history if provided
    if (chatHistory && Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        messages.push({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        });
      }
    }

    // Add current question with full context
    const userMessage = `${MASTER_PROMPT}

${contextData}

USER'S QUESTION: ${question}

INSTRUCTIONS:
- Answer the user's specific question using the data provided above
- Follow ALL the rules in the master prompt (cite data points, give timing, cross-reference palm + chart)
- Be specific, not vague - cite exact degrees, houses, and palm features
- If you don't have enough data to answer accurately, say so
- Keep response focused and under 400 words unless the question requires more detail
- Cross-reference palm and chart data at least once in your answer`;

    messages.push({
      role: "user",
      content: userMessage,
    });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages,
    });

    const textContent = response.content.find((c) => c.type === "text");
    const answer = textContent && textContent.type === "text" ? textContent.text : "";

    return NextResponse.json({
      success: true,
      question,
      answer,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (error: any) {
    console.error("Test chat API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
