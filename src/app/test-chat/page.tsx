"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Trash2, Upload } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
}

// Sample natal data for testing
const sampleNatalData = {
  planets: {
    Sun: { sign: "Pisces", degree: 8.5, house: 5, nakshatra: "Uttara Bhadrapada" },
    Moon: { sign: "Scorpio", degree: 15.2, house: 1, nakshatra: "Anuradha" },
    Mercury: { sign: "Aquarius", degree: 22.1, house: 4 },
    Venus: { sign: "Pisces", degree: 12.8, house: 5 },
    Mars: { sign: "Capricorn", degree: 5.3, house: 3 },
    Jupiter: { sign: "Sagittarius", degree: 18.7, house: 2 },
    Saturn: { sign: "Pisces", degree: 3.2, house: 5 },
    Rahu: { sign: "Aries", degree: 15.0, house: 6 },
    Ketu: { sign: "Libra", degree: 15.0, house: 12 },
  },
  ascendant: { sign: "Scorpio", degree: 12.5 },
  houses: {
    1: "Scorpio", 2: "Sagittarius", 3: "Capricorn", 4: "Aquarius",
    5: "Pisces", 6: "Aries", 7: "Taurus", 8: "Gemini",
    9: "Cancer", 10: "Leo", 11: "Virgo", 12: "Libra",
  },
  current_dasha: {
    mahadasha: "Jupiter",
    antardasha: "Venus",
    start_date: "2024-08-15",
    end_date: "2027-04-15",
  },
  transits: {
    Saturn: { sign: "Pisces", house: 5 },
    Jupiter: { sign: "Taurus", house: 7 },
    Rahu: { sign: "Pisces", house: 5 },
  },
};

// Sample palm data for testing
const samplePalmData = {
  hand_identification: { which_hand: "right", confidence: 0.95 },
  hand_shape: { type: "water", palm_shape: "rectangular", finger_length_relative: "long", skin_texture: "fine" },
  heart_line: { length: "long", curvature: "curved", depth: "deep", ending: "between_fingers", branches: "upward_branches" },
  head_line: { length: "medium", direction: "sloping_luna", origin: "separate_from_life", depth: "medium" },
  life_line: { length: "long", arc: "wide", depth: "deep", breaks: "none" },
  fate_line: { present: true, origin: "base_of_palm", continuity: "continuous", strength: "strong" },
  mounts: {
    jupiter: { development: "well_developed", prominence: "moderate" },
    saturn: { development: "moderate", prominence: "flat" },
    apollo: { development: "well_developed", prominence: "moderate" },
    mercury: { development: "moderate", prominence: "moderate" },
    venus: { development: "prominent", prominence: "high" },
    luna: { development: "prominent", prominence: "high" },
    mars_positive: { development: "moderate", prominence: "moderate" },
  },
  overall_assessment: {
    most_notable_features: [
      "Wide sweeping life line showing vitality and energy",
      "Head line curving toward Mount of Luna indicating imagination and creativity",
      "Prominent Mount of Venus and Luna suggesting emotional depth",
      "Wide finger spacing indicating independent thinking",
    ],
    dominant_element: "water",
    overall_confidence: 0.75,
  },
};

const suggestedQuestions = [
  "What does my chart say about my career path?",
  "When will I meet my life partner?",
  "What are my biggest strengths and weaknesses?",
  "How do my palm lines confirm my chart placements?",
  "What does my current Jupiter-Venus dasha mean?",
  "What should I focus on in 2026?",
];

export default function TestChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [natalData, setNatalData] = useState<any>(null);
  const [palmData, setPalmData] = useState<any>(null);
  const [showDataPanel, setShowDataPanel] = useState(true);
  const [totalUsage, setTotalUsage] = useState<Usage>({ input_tokens: 0, output_tokens: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSampleData = () => {
    setNatalData(sampleNatalData);
    setPalmData(samplePalmData);
  };

  const clearData = () => {
    setNatalData(null);
    setPalmData(null);
  };

  const clearChat = () => {
    setMessages([]);
    setTotalUsage({ input_tokens: 0, output_tokens: 0 });
  };

  const sendMessage = async (questionText?: string) => {
    const question = questionText || input.trim();
    if (!question || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Build chat history (last 6 messages for context)
      const chatHistory = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          natalData,
          palmData,
          userContext: { age: 29, gender: "unknown" },
          chatHistory,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (data.usage) {
          setTotalUsage((prev) => ({
            input_tokens: prev.input_tokens + data.usage.input_tokens,
            output_tokens: prev.output_tokens + data.usage.output_tokens,
          }));
        }
      } else {
        const errorMessage: Message = {
          role: "assistant",
          content: `Error: ${data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    } catch (error: any) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Connection error: ${error.message}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] text-white">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-[#0A0E1A]/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              🔮 Elysia Chat Test
            </h1>
            <p className="text-xs text-white/50">Master Astrologer & Palmist</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/40">
              Tokens: {totalUsage.input_tokens + totalUsage.output_tokens}
            </span>
            <button
              onClick={clearChat}
              className="p-2 text-white/50 hover:text-white/80 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-60px)]">
        {/* Data Panel */}
        {showDataPanel && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            className="border-b border-white/10 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white/70">Test Data</h2>
              <div className="flex gap-2">
                <button
                  onClick={loadSampleData}
                  className="px-3 py-1 text-xs bg-primary/20 text-primary rounded-lg hover:bg-primary/30 transition-colors"
                >
                  Load Sample Data
                </button>
                <button
                  onClick={clearData}
                  className="px-3 py-1 text-xs bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Clear Data
                </button>
                <button
                  onClick={() => setShowDataPanel(false)}
                  className="px-3 py-1 text-xs bg-white/10 text-white/60 rounded-lg hover:bg-white/20 transition-colors"
                >
                  Hide
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1A1F2E] rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/50 mb-1">📊 Natal Data</p>
                <p className={`text-xs ${natalData ? "text-green-400" : "text-white/30"}`}>
                  {natalData ? `✓ Loaded (${Object.keys(natalData.planets || {}).length} planets)` : "Not loaded"}
                </p>
                {natalData && (
                  <p className="text-xs text-white/40 mt-1">
                    {natalData.ascendant?.sign} Rising • {natalData.current_dasha?.mahadasha}-{natalData.current_dasha?.antardasha} Dasha
                  </p>
                )}
              </div>
              <div className="bg-[#1A1F2E] rounded-lg p-3 border border-white/10">
                <p className="text-xs text-white/50 mb-1">✋ Palm Data</p>
                <p className={`text-xs ${palmData ? "text-green-400" : "text-white/30"}`}>
                  {palmData ? `✓ Loaded (${palmData.overall_assessment?.dominant_element} hand)` : "Not loaded"}
                </p>
                {palmData && (
                  <p className="text-xs text-white/40 mt-1">
                    {palmData.hand_shape?.type} type • {Math.round((palmData.overall_assessment?.overall_confidence || 0) * 100)}% confidence
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {!showDataPanel && (
          <button
            onClick={() => setShowDataPanel(true)}
            className="mx-4 mt-2 px-3 py-1 text-xs bg-white/5 text-white/40 rounded-lg hover:bg-white/10 transition-colors self-start"
          >
            Show Data Panel
          </button>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔮</div>
              <h2 className="text-xl font-semibold mb-2">Ask Elysia Anything</h2>
              <p className="text-white/50 text-sm mb-6 max-w-md mx-auto">
                Test the master astrologer persona. Load sample data and ask questions about your chart and palm.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg mx-auto">
                {suggestedQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-2 text-xs bg-[#1A1F2E] border border-white/10 rounded-lg hover:border-primary/50 hover:bg-[#1A1F2E]/80 transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-white"
                      : "bg-[#1A1F2E] border border-white/10"
                  }`}
                >
                  {message.role === "assistant" && (
                    <p className="text-xs text-primary mb-2 font-semibold">✨ Elysia</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  <p className="text-xs text-white/30 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-[#1A1F2E] border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-sm text-white/60">Elysia is thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Ask Elysia about your chart or palm..."
              className="flex-1 bg-[#1A1F2E] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 placeholder:text-white/30"
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-gradient-to-r from-primary to-purple-600 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-white/30 mt-2 text-center">
            {!natalData && !palmData && "⚠️ Load sample data for better responses"}
          </p>
        </div>
      </div>
    </div>
  );
}
