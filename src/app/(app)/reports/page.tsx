"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronRight, Star, Sun, Moon, Sparkles, Loader2, Lock, MessageCircle } from "lucide-react";
import { getZodiacSign, getZodiacSymbol, getZodiacColor } from "@/lib/astrology-api";
import { useOnboardingStore } from "@/lib/onboarding-store";
import { useUserStore, UnlockedFeatures } from "@/lib/user-store";
import { UpsellPopup } from "@/components/UpsellPopup";
import { TrialStatusBanner } from "@/components/TrialStatusBanner";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { UserAvatar } from "@/components/UserAvatar";

interface DailyData {
  sunRiseSet?: { sunrise: string; sunset: string };
  rahuKalam?: { start: string; end: string };
  abhijitMuhurat?: { start: string; end: string };
  nakshatra?: any;
}

export default function DashboardPage() {
  const router = useRouter();
  const [dailyData, setDailyData] = useState<DailyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userZodiac, setUserZodiac] = useState({ sign: "Aries", symbol: "♈", color: "from-red-500 to-orange-500" });
  const [upsellPopup, setUpsellPopup] = useState<{ isOpen: boolean; feature: keyof UnlockedFeatures | null }>({
    isOpen: false,
    feature: null,
  });
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Get ascendant sign from onboarding store as fallback
  const { birthMonth: storeBirthMonth, birthDay: storeBirthDay, ascendantSign: storeAscendantSign } = useOnboardingStore();
  
  // Get unlocked features from user store
  const { unlockedFeatures, birthChartGenerating, birthChartReady } = useUserStore();

  useEffect(() => {
    loadUserZodiac();
    fetchDailyData();
  }, []);

  const loadUserZodiac = async () => {
    try {
      // Get userId - prefer Firebase Auth uid
      const authUid = auth.currentUser?.uid;
      const storedId = localStorage.getItem("palmcosmic_user_id");
      const userId = authUid || storedId;

      if (userId) {
        // Load ascendant sign from Firebase
        const userRef = doc(db, "users", userId);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const data = userSnap.data();
          
          // Load user name and email for avatar
          if (data.name) setUserName(data.name);
          if (data.email) setUserEmail(data.email);
          
          // Use ascendant sign for daily horoscope
          if (data.ascendantSign) {
            // Handle both object and string formats
            const signName = typeof data.ascendantSign === "string" 
              ? data.ascendantSign 
              : data.ascendantSign.name;
            if (signName) {
              setUserZodiac({
                sign: signName,
                symbol: getZodiacSymbol(signName),
                color: getZodiacColor(signName),
              });
            }
          }
        }
      }
      
      // Also try to get email from localStorage as fallback
      const storedEmail = localStorage.getItem("palmcosmic_email");
      if (storedEmail && !userEmail) {
        setUserEmail(storedEmail);
      }

      // Fallback to onboarding store ascendant sign
      if (storeAscendantSign?.name) {
        setUserZodiac({
          sign: storeAscendantSign.name,
          symbol: getZodiacSymbol(storeAscendantSign.name),
          color: getZodiacColor(storeAscendantSign.name),
        });
      }
    } catch (error) {
      console.error("Error loading user zodiac:", error);
    }
  };

  const fetchDailyData = async () => {
    try {
      const response = await fetch("/api/astrology/daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: 28.6139,
          longitude: 77.209,
          timezone: 5.5,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setDailyData(result.data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch daily data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      {/* Trial/Payment Status Banner */}
      <TrialStatusBanner />
      
      <div className="w-full max-w-md h-screen bg-[#0A0E1A] overflow-hidden shadow-2xl shadow-black/50 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#0A0E1A]/95 backdrop-blur-sm border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => router.push("/profile")}
              className="hover:opacity-80 transition-opacity"
            >
              <UserAvatar name={userName} email={userEmail} size="md" />
            </button>
            <h1 className="text-white text-xl font-semibold">Dashboard</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-4 space-y-6 pb-24">
            {/* Chat with Elysia */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative bg-gradient-to-br from-purple-600/20 via-pink-500/20 to-purple-600/20 rounded-2xl p-5 border-2 border-purple-500/30 cursor-pointer hover:border-purple-500/50 transition-all overflow-hidden group"
              onClick={() => router.push("/chat")}
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {/* Sparkle decorations */}
              <div className="absolute top-3 right-3 text-yellow-400 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              
              <div className="relative flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {/* Pulsing ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 animate-ping opacity-20" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/50">
                    <MessageCircle className="w-8 h-8 text-white" />
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-400 rounded-full border-2 border-[#0A0E1A]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-bold text-xl mb-1">
                    Chat with Elysia
                  </h3>
                  <p className="text-purple-200/80 text-sm">
                    Your personal cosmic guide & advisor
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-purple-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
            
            {/* Daily Horoscope */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-[#1A1F2E] to-[#252D3F] rounded-2xl overflow-hidden border border-white/10 cursor-pointer"
              onClick={() => router.push("/horoscope")}
            >
              <div className="p-4 border-b border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="w-5 h-5 text-yellow-400" />
                    <h2 className="text-white font-semibold text-lg">Daily Horoscope</h2>
                  </div>
                  <span className="text-white/40 text-xs">{new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                </div>
              </div>
              
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${userZodiac.color} flex items-center justify-center`}>
                    <span className="text-white text-lg">{userZodiac.symbol}</span>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{userZodiac.sign}</h3>
                    <p className="text-white/40 text-xs">Your daily reading</p>
                  </div>
                  {loading && <Loader2 className="w-4 h-4 text-white/40 animate-spin ml-auto" />}
                </div>
                
                <p className="text-white/70 text-sm mb-4">
                  Today brings exciting opportunities for personal growth. The stars align in your favor for creative endeavors and meaningful connections.
                </p>

                {/* Auspicious Times from API */}
                {dailyData && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {dailyData.sunRiseSet && (
                      <>
                        <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                          <Sun className="w-4 h-4 text-yellow-400" />
                          <div>
                            <p className="text-white/40 text-[10px]">Sunrise</p>
                            <p className="text-white text-xs">{dailyData.sunRiseSet.sunrise}</p>
                          </div>
                        </div>
                        <div className="bg-white/5 rounded-lg p-2 flex items-center gap-2">
                          <Moon className="w-4 h-4 text-orange-400" />
                          <div>
                            <p className="text-white/40 text-[10px]">Sunset</p>
                            <p className="text-white text-xs">{dailyData.sunRiseSet.sunset}</p>
                          </div>
                        </div>
                      </>
                    )}
                    {dailyData.abhijitMuhurat && (
                      <div className="bg-rose-500/10 rounded-lg p-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-rose-400" />
                        <div>
                          <p className="text-rose-400/60 text-[10px]">Lucky Time</p>
                          <p className="text-rose-400 text-xs">{dailyData.abhijitMuhurat.start} - {dailyData.abhijitMuhurat.end}</p>
                        </div>
                      </div>
                    )}
                    {dailyData.rahuKalam && (
                      <div className="bg-red-500/10 rounded-lg p-2 flex items-center gap-2">
                        <Star className="w-4 h-4 text-red-400" />
                        <div>
                          <p className="text-red-400/60 text-[10px]">Avoid</p>
                          <p className="text-red-400 text-xs">{dailyData.rahuKalam.start} - {dailyData.rahuKalam.end}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center mx-auto mb-2">
                      <Sparkles className="w-4 h-4 text-pink-400" />
                    </div>
                    <p className="text-white/40 text-xs">Love</p>
                    <p className="text-white text-xs mt-1 line-clamp-2">Romance is in the air</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-2">
                      <Star className="w-4 h-4 text-blue-400" />
                    </div>
                    <p className="text-white/40 text-xs">Career</p>
                    <p className="text-white text-xs mt-1 line-clamp-2">New opportunities await</p>
                  </div>
                  <div className="bg-white/5 rounded-xl p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-2">
                      <Moon className="w-4 h-4 text-green-400" />
                    </div>
                    <p className="text-white/40 text-xs">Health</p>
                    <p className="text-white text-xs mt-1 line-clamp-2">Focus on self-care</p>
                  </div>
                </div>
              </div>
            </motion.div>
            
            {/* Reports from Advisors */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-white font-semibold text-xl mb-4">Reports from Advisors</h2>
              
              <div className="space-y-3">
                {/* Palm Reading Report - Always unlocked with subscription */}
                <div 
                  onClick={() => router.push("/palm-reading")}
                  className="bg-[#1A2235] rounded-2xl border border-primary/20 p-3 cursor-pointer hover:border-primary/40 transition-colors relative"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-rose-500/30 to-pink-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                      <span className="text-3xl">🖐️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold">Palm Reading Report</h3>
                      <p className="text-white/50 text-xs mt-0.5">Discover your life path & destiny</p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40" />
                  </div>
                </div>

                {/* Prediction 2026 Report */}
                <div 
                  onClick={() => {
                    if (unlockedFeatures.prediction2026) {
                      router.push("/prediction-2026");
                    } else {
                      setUpsellPopup({ isOpen: true, feature: "prediction2026" });
                    }
                  }}
                  className="bg-[#1A2235] rounded-2xl border border-primary/20 p-3 cursor-pointer hover:border-primary/40 transition-colors relative"
                >
                  {!unlockedFeatures.prediction2026 && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-white/60" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                      <span className="text-3xl">🔮</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold">Prediction 2026 Report</h3>
                      <p className="text-white/50 text-xs mt-0.5">What the stars hold for your future</p>
                      {!unlockedFeatures.prediction2026 && (
                        <button className="mt-1 px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
                          Get Report
                        </button>
                      )}
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40" />
                  </div>
                </div>

                {/* Birth Chart Report */}
                <div 
                  onClick={() => {
                    if (unlockedFeatures.birthChart) {
                      if (!birthChartGenerating) {
                        router.push("/birth-chart");
                      }
                    } else {
                      setUpsellPopup({ isOpen: true, feature: "birthChart" });
                    }
                  }}
                  className="bg-[#1A2235] rounded-2xl border border-primary/20 p-3 cursor-pointer hover:border-primary/40 transition-colors relative"
                >
                  {!unlockedFeatures.birthChart && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-white/60" />
                    </div>
                  )}
                  {birthChartGenerating && (
                    <div className="absolute top-2 right-2">
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                      <span className="text-3xl">📊</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold">Birth Chart Report</h3>
                      <p className="text-white/50 text-xs mt-0.5">Your complete astrological blueprint</p>
                      {!unlockedFeatures.birthChart && (
                        <button className="mt-1 px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
                          Get Report
                        </button>
                      )}
                      {birthChartGenerating && (
                        <p className="text-white/50 text-xs mt-1">Generating your chart...</p>
                      )}
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40" />
                  </div>
                </div>

                {/* Compatibility Test */}
                <div 
                  onClick={() => {
                    if (unlockedFeatures.compatibilityTest) {
                      router.push("/compatibility");
                    } else {
                      setUpsellPopup({ isOpen: true, feature: "compatibilityTest" });
                    }
                  }}
                  className="bg-[#1A2235] rounded-2xl border border-primary/20 p-3 cursor-pointer hover:border-primary/40 transition-colors relative"
                >
                  {!unlockedFeatures.compatibilityTest && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center">
                      <Lock className="w-3 h-3 text-white/60" />
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-pink-500/30 to-rose-600/30 flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                      <span className="text-3xl">💕</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold">Compatibility Test</h3>
                      <p className="text-white/50 text-xs mt-0.5">Find your perfect cosmic match</p>
                      {!unlockedFeatures.compatibilityTest && (
                        <button className="mt-1 px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">
                          Get Report
                        </button>
                      )}
                    </div>
                    <ChevronRight className="w-6 h-6 text-white/40" />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Upsell Popup */}
        {upsellPopup.feature && (
          <UpsellPopup
            isOpen={upsellPopup.isOpen}
            onClose={() => setUpsellPopup({ isOpen: false, feature: null })}
            feature={upsellPopup.feature}
          />
        )}
      </div>
    </div>
  );
}
