"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, ChevronDown, Loader2 } from "lucide-react";
import { getZodiacSign, getZodiacSymbol } from "@/lib/astrology-api";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";

const ZODIAC_SIGNS = [
  { sign: "Aries", symbol: "♈" },
  { sign: "Taurus", symbol: "♉" },
  { sign: "Gemini", symbol: "♊" },
  { sign: "Cancer", symbol: "♋" },
  { sign: "Leo", symbol: "♌" },
  { sign: "Virgo", symbol: "♍" },
  { sign: "Libra", symbol: "♎" },
  { sign: "Scorpio", symbol: "♏" },
  { sign: "Sagittarius", symbol: "♐" },
  { sign: "Capricorn", symbol: "♑" },
  { sign: "Aquarius", symbol: "♒" },
  { sign: "Pisces", symbol: "♓" },
];

const PERIODS = [
  { id: "today", label: "Today", day: "TODAY" },
  { id: "tomorrow", label: "Tomorrow", day: "TOMORROW" },
  { id: "week", label: "Week", period: "weekly" },
  { id: "month", label: "Month", period: "monthly" },
];

interface HoroscopeData {
  horoscope_data: string;
  date?: string;
  week?: string;
  month?: string;
  challenging_days?: string;
  standout_days?: string;
}

export default function HoroscopePage() {
  const router = useRouter();
  const [selectedSign, setSelectedSign] = useState("Aries");
  const [selectedPeriod, setSelectedPeriod] = useState("today");
  const [showSignPicker, setShowSignPicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | null>(null);

  // Get birth date from onboarding store as fallback
  const { birthMonth: storeBirthMonth, birthDay: storeBirthDay } = useOnboardingStore();

  useEffect(() => {
    loadUserSign();
  }, []);

  const loadUserSign = async () => {
    try {
      // Get userId - prefer Firebase Auth uid
      const authUid = auth.currentUser?.uid;
      const storedId = localStorage.getItem("palmcosmic_user_id");
      const userId = authUid || storedId;

      if (userId) {
        // Load birth date from Firebase
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.birthMonth && data.birthDay) {
            const month = Number(data.birthMonth);
            const day = Number(data.birthDay);
            const sign = getZodiacSign(month, day);
            setSelectedSign(sign);
            return;
          }
        }
      }

      // Fallback to onboarding store
      if (storeBirthMonth && storeBirthDay) {
        const month = Number(storeBirthMonth);
        const day = Number(storeBirthDay);
        const sign = getZodiacSign(month, day);
        setSelectedSign(sign);
      }
    } catch (error) {
      console.error("Error loading user sign:", error);
    }
  };

  useEffect(() => {
    fetchHoroscope();
  }, [selectedSign, selectedPeriod]);

  const fetchHoroscope = async () => {
    setLoading(true);
    try {
      const periodConfig = PERIODS.find((p) => p.id === selectedPeriod);
      const period = periodConfig?.period || "daily";
      const day = periodConfig?.day || "TODAY";

      // Use cached endpoint which stores horoscopes in Firebase
      // Pass day parameter for daily horoscopes (TODAY vs TOMORROW)
      const response = await fetch(
        `/api/horoscope/cached?sign=${selectedSign}&period=${period}&day=${day}`
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setHoroscopeData(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch horoscope:", error);
    } finally {
      setLoading(false);
    }
  };

  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  // Generate deterministic Focus and Troubles based on sign and period
  const generateInsights = (sign: string, period: string) => {
    const focusWords = ["Growth", "Optimism", "Creativity", "Balance", "Communication", "Love", "Career", "Health"];
    const troubleWords = ["Conflict", "Misunderstanding", "Tension", "Doubt", "Stress", "Impatience"];
    
    // Create a deterministic seed from sign and period
    const seed = (sign + period).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    
    // Deterministic selection based on seed
    const focusIndices = [seed % 8, (seed + 3) % 8, (seed + 5) % 8];
    const troubleIndices = [seed % 6, (seed + 2) % 6, (seed + 4) % 6];
    
    const selectedFocus = [...new Set(focusIndices)].slice(0, 3).map(i => focusWords[i]);
    const selectedTroubles = [...new Set(troubleIndices)].slice(0, 3).map(i => troubleWords[i]);
    
    return { focus: selectedFocus, troubles: selectedTroubles };
  };

  const insights = generateInsights(selectedSign, selectedPeriod);

  // Extract a title from the horoscope text (first sentence or phrase)
  const getTitle = (text: string, sign: string, period: string) => {
    if (!text) return "Your Horoscope";
    const sentences = text.split(/[.!?]/);
    if (sentences[0] && sentences[0].length < 50) {
      return sentences[0].trim();
    }
    // Generate a deterministic title based on sign and period
    const titles = [
      "Harness your potential now",
      "Embrace New Opportunities",
      "Navigate with Confidence",
      "Trust Your Intuition",
      "A Day of Discovery",
    ];
    const seed = (sign + period).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return titles[seed % titles.length];
  };

  // Generate a tip from the horoscope
  const getTip = (text: string) => {
    if (!text) return "";
    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 20);
    if (sentences.length > 2) {
      return sentences[sentences.length - 1].trim() + ".";
    }
    return "Stay adaptable and embrace change; this could lead to unexpected benefits.";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-full max-w-md min-h-screen bg-gradient-to-b from-[#1a2235] to-[#0A0E1A] overflow-hidden shadow-2xl shadow-black/50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-white/60 text-sm">Horoscope</span>
            <span className="text-white/40">•</span>
            <span className="text-white/60 text-sm">{currentDate}</span>
          </div>
          <button
            onClick={() => router.push("/reports")}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Period Tabs */}
        <div className="flex gap-1 px-4 py-3 bg-black/20">
          {PERIODS.map((period) => (
            <button
              key={period.id}
              onClick={() => setSelectedPeriod(period.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                selectedPeriod === period.id
                  ? "bg-white/20 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {/* Sign Selector */}
          <button
            onClick={() => setShowSignPicker(true)}
            className="flex items-center gap-2 mb-4 group"
          >
            <span className="text-white/60 text-lg">{selectedSign}</span>
            <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-white/40 animate-spin" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              key={`${selectedSign}-${selectedPeriod}`}
            >
              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-6" style={{ fontFamily: "serif" }}>
                {getTitle(horoscopeData?.horoscope_data || "", selectedSign, selectedPeriod)}
              </h1>

              {/* Transits Badge */}
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5 mb-6">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-orange-400 to-red-500" />
                  <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400" />
                </div>
                <span className="text-white/80 text-sm">Transits influencing: 4</span>
              </div>

              {/* Focus & Troubles */}
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <h3 className="text-[#9ACD32] font-semibold mb-3">Focus</h3>
                  <ul className="space-y-1">
                    {insights.focus.map((item, idx) => (
                      <li key={idx} className="text-white/80">{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-red-400 font-semibold mb-3">Troubles</h3>
                  <ul className="space-y-1">
                    {insights.troubles.map((item, idx) => (
                      <li key={idx} className="text-white/80">{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Main Horoscope Text */}
              <div className="space-y-6 mb-8">
                <div>
                  <h3 className="text-white font-bold text-lg mb-2">Embrace New Opportunities</h3>
                  <p className="text-white/70 leading-relaxed">
                    {horoscopeData?.horoscope_data?.split(".").slice(0, 3).join(".") + "."}
                  </p>
                </div>

                {horoscopeData?.horoscope_data && horoscopeData.horoscope_data.split(".").length > 3 && (
                  <div>
                    <h3 className="text-white font-bold text-lg mb-2">Navigate Relationship Challenges</h3>
                    <p className="text-white/70 leading-relaxed">
                      {horoscopeData.horoscope_data.split(".").slice(3, 6).join(".") + "."}
                    </p>
                  </div>
                )}
              </div>

              {/* Tip Card */}
              <div className="bg-[#1A1F2E] rounded-2xl p-4 border border-white/10">
                <h3 className="text-white font-bold mb-2">Tip</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {getTip(horoscopeData?.horoscope_data || "")}
                </p>
              </div>

              {/* Weekly/Monthly specific info */}
              {horoscopeData?.challenging_days && (
                <div className="mt-4 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <p className="text-red-400 text-sm">
                    <span className="font-semibold">Challenging days:</span> {horoscopeData.challenging_days}
                  </p>
                </div>
              )}

              {horoscopeData?.standout_days && (
                <div className="mt-2 bg-green-500/10 rounded-xl p-3 border border-green-500/20">
                  <p className="text-green-400 text-sm">
                    <span className="font-semibold">Standout days:</span> {horoscopeData.standout_days}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sign Picker Modal */}
        <AnimatePresence>
          {showSignPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 z-50 flex items-end justify-center"
              onClick={() => setShowSignPicker(false)}
            >
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-[#1A1F2E] rounded-t-3xl p-6"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
                <h2 className="text-white text-xl font-bold mb-4 text-center">Select Your Sign</h2>
                <div className="grid grid-cols-3 gap-3">
                  {ZODIAC_SIGNS.map((zodiac) => (
                    <button
                      key={zodiac.sign}
                      onClick={() => {
                        setSelectedSign(zodiac.sign);
                        setShowSignPicker(false);
                      }}
                      className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-colors ${
                        selectedSign === zodiac.sign
                          ? "bg-primary/20 border border-primary/50"
                          : "bg-white/5 hover:bg-white/10"
                      }`}
                    >
                      <span className="text-2xl">{zodiac.symbol}</span>
                      <span className="text-white/80 text-sm">{zodiac.sign}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
