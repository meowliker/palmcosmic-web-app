"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";

type Step = "capture" | "birth-data" | "analyzing" | "result";
type TabKey = "overview" | "timing" | "palm" | "guidance";

interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  place: string;
}

interface ReadingMetadata {
  big_three?: {
    sun?: { sign: string; house: number; degree: string };
    moon?: { sign: string; house: number; degree: string; nakshatra: string };
    rising?: { sign: string; degree: string };
  };
  current_dasha?: {
    mahadasha: string;
    antardasha: string;
    label: string;
  };
}

const TAB_LABELS: Record<TabKey, string> = {
  overview: "Overview",
  timing: "Timing",
  palm: "Palm",
  guidance: "Guidance",
};

// Helper function to extract sections from the reading text
function extractSection(text: string | null, startMarker: string, endMarker: string | null): string | null {
  if (!text) return null;
  
  const startIdx = text.indexOf(startMarker);
  if (startIdx === -1) return null;
  
  const contentStart = startIdx + startMarker.length;
  
  if (endMarker === null) {
    return text.slice(contentStart).trim();
  }
  
  const endIdx = text.indexOf(endMarker, contentStart);
  if (endIdx === -1) {
    return text.slice(contentStart).trim();
  }
  
  return text.slice(contentStart, endIdx).trim();
}

export default function TestReadingPage() {
  const [step, setStep] = useState<Step>("capture");
  const [palmImage, setPalmImage] = useState<string | null>(null);
  const [birthData, setBirthData] = useState<BirthData>({
    year: 1995,
    month: 3,
    day: 22,
    hour: 14,
    minute: 30,
    place: "New Delhi, India",
  });
  const [palmAnalysis, setPalmAnalysis] = useState<any>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ReadingMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showCamera, setShowCamera] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setPalmImage(imageData);
      setStep("birth-data");
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Camera access denied. Please use upload instead.");
      setShowCamera(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    const imageData = canvas.toDataURL("image/jpeg", 0.9);
    
    // Stop camera
    if (video.srcObject) {
      const tracks = (video.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
    
    setPalmImage(imageData);
    setShowCamera(false);
    setStep("birth-data");
  };

  const generateReading = async () => {
    if (!palmImage) return;
    
    setStep("analyzing");
    setError(null);
    
    try {
      // Step 1: Analyze palm
      setProgress("Analyzing palm image with Claude Vision...");
      const palmResponse = await fetch("/api/palm-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: palmImage }),
      });
      
      if (!palmResponse.ok) {
        const err = await palmResponse.json();
        throw new Error(err.error || "Palm analysis failed");
      }
      
      const palmResult = await palmResponse.json();
      setPalmAnalysis(palmResult.analysis);
      
      // Step 2: Generate reading
      setProgress("Generating personalized reading with astrology + palmistry...");
      const readingResponse = await fetch("/api/generate-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthData: {
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: 0,
            place: birthData.place,
          },
          palmData: palmResult.analysis,
          userContext: {
            age: new Date().getFullYear() - birthData.year,
            gender: "unknown",
            relationship_status: "not specified",
            primary_concern: "general life reading",
          },
        }),
      });
      
      if (!readingResponse.ok) {
        const err = await readingResponse.json();
        throw new Error(err.error || "Reading generation failed");
      }
      
      const readingResult = await readingResponse.json();
      setReading(readingResult.reading);
      setMetadata(readingResult.metadata);
      setStep("result");
      
    } catch (err) {
      console.error("Error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStep("birth-data");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-2">
          🔮 Palm Reading Test
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Test the full palm analysis + astrology reading flow
        </p>

        {/* Step 1: Capture Palm */}
        {step === "capture" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Step 1: Capture Palm Image</h2>
              
              {showCamera ? (
                <div className="space-y-4">
                  <div className="relative aspect-[3/4] max-w-sm mx-auto bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={capturePhoto}
                      className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium"
                    >
                      📸 Capture
                    </button>
                    <button
                      onClick={() => {
                        if (videoRef.current?.srcObject) {
                          const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                          tracks.forEach((track) => track.stop());
                        }
                        setShowCamera(false);
                      }}
                      className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <button
                    onClick={startCamera}
                    className="w-full py-4 bg-primary text-primary-foreground rounded-lg font-medium text-lg"
                  >
                    📷 Take Photo
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-4 bg-muted text-foreground rounded-lg font-medium text-lg"
                  >
                    📁 Upload Image
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 2: Birth Data */}
        {step === "birth-data" && palmImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-xl p-6">
              <h2 className="text-xl font-semibold mb-4">Step 2: Birth Data</h2>
              
              {/* Palm preview */}
              <div className="mb-6">
                <p className="text-sm text-muted-foreground mb-2">Palm Image:</p>
                <img
                  src={palmImage}
                  alt="Captured palm"
                  className="w-32 h-32 object-cover rounded-lg border border-border"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Year</label>
                  <input
                    type="number"
                    value={birthData.year}
                    onChange={(e) => setBirthData({ ...birthData, year: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Month</label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={birthData.month}
                    onChange={(e) => setBirthData({ ...birthData, month: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Day</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={birthData.day}
                    onChange={(e) => setBirthData({ ...birthData, day: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Hour (24h)</label>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={birthData.hour}
                    onChange={(e) => setBirthData({ ...birthData, hour: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Minute</label>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={birthData.minute}
                    onChange={(e) => setBirthData({ ...birthData, minute: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm text-muted-foreground mb-1">Birth Place</label>
                  <input
                    type="text"
                    value={birthData.place}
                    onChange={(e) => setBirthData({ ...birthData, place: e.target.value })}
                    className="w-full px-3 py-2 bg-muted border border-border rounded-lg"
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setPalmImage(null);
                    setStep("capture");
                  }}
                  className="px-6 py-3 bg-muted text-muted-foreground rounded-lg font-medium"
                >
                  ← Back
                </button>
                <button
                  onClick={generateReading}
                  className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-medium text-lg"
                >
                  Generate Reading ✨
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Analyzing */}
        {step === "analyzing" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-card border border-border rounded-xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="text-3xl"
                >
                  🔮
                </motion.div>
              </div>
              <h2 className="text-xl font-semibold mb-2">Generating Your Reading</h2>
              <p className="text-muted-foreground mb-4">{progress}</p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 30, ease: "linear" }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                This may take 30-60 seconds...
              </p>
            </div>
          </motion.div>
        )}

        {/* Step 4: Result - Styled like existing palm-reading page */}
        {step === "result" && reading && (
          <div className="min-h-screen bg-[#0A0E1A]">
            {/* Header */}
            <div className="sticky top-0 z-40 bg-[#0A0E1A]/95 backdrop-blur-sm border-b border-white/10">
              <div className="flex items-center justify-between px-4 py-3">
                <button 
                  onClick={() => {
                    setPalmImage(null);
                    setPalmAnalysis(null);
                    setReading(null);
                    setMetadata(null);
                    setStep("capture");
                  }}
                  className="px-4 py-2 bg-white/10 rounded-full border border-white/20"
                >
                  <span className="text-white text-sm">← New Reading</span>
                </button>
                <h1 className="text-white text-lg font-bold">Your Reading</h1>
                <div className="w-24" />
              </div>
            </div>

            <div className="px-4 py-6 space-y-4">
              {/* Big Three Card */}
              {metadata?.big_three && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-2xl p-5 border border-primary/30"
                >
                  <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                    ✦ Your Big Three
                  </h2>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <span className="text-3xl">☀️</span>
                      <p className="text-white font-bold mt-1">{metadata.big_three.sun?.sign}</p>
                      <p className="text-white/50 text-xs">Sun</p>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl">🌙</span>
                      <p className="text-white font-bold mt-1">{metadata.big_three.moon?.sign}</p>
                      <p className="text-white/50 text-xs">Moon</p>
                    </div>
                    <div className="text-center">
                      <span className="text-3xl">⬆️</span>
                      <p className="text-white font-bold mt-1">{metadata.big_three.rising?.sign}</p>
                      <p className="text-white/50 text-xs">Rising</p>
                    </div>
                  </div>
                  {metadata.big_three.moon?.nakshatra && (
                    <div className="mt-4 pt-3 border-t border-white/10">
                      <p className="text-white/70 text-sm text-center">
                        Moon Nakshatra: <span className="text-primary font-semibold">{metadata.big_three.moon.nakshatra}</span>
                      </p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Current Dasha Period */}
              {metadata?.current_dasha && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-[#1A1F2E] rounded-2xl p-4 border border-white/10"
                >
                  <h3 className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                    🕐 Current Life Phase
                  </h3>
                  <p className="text-primary font-semibold">{metadata.current_dasha.label}</p>
                </motion.div>
              )}

              {/* Palm Image */}
              {palmImage && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="bg-[#1A1F2E] rounded-2xl p-4 border border-white/10"
                >
                  <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                    🖐️ Your Palm
                  </h3>
                  <div className="relative rounded-xl overflow-hidden">
                    <img
                      src={palmImage}
                      alt="Your palm"
                      className="w-full h-48 object-cover rounded-xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  </div>
                </motion.div>
              )}

              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 bg-white/5 rounded-xl border border-white/10">
                {(["overview", "timing", "palm", "guidance"] as TabKey[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === key
                        ? "bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {TAB_LABELS[key]}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  {activeTab === "overview" && (
                    <div className="bg-[#1A1F2E] rounded-2xl p-5 border border-white/10">
                      <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                        🔮 Core Nature & Insight
                      </h3>
                      <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                        {extractSection(reading, "OPENING INSIGHT", "YOUR CORE NATURE") ||
                         extractSection(reading, "🔮", "☀️") ||
                         reading?.split("\n\n").slice(0, 3).join("\n\n")}
                      </div>
                    </div>
                  )}

                  {activeTab === "timing" && (
                    <div className="space-y-4">
                      <div className="bg-[#1A1F2E] rounded-2xl p-5 border border-white/10">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                          🕐 Current Life Phase & Timing
                        </h3>
                        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                          {extractSection(reading, "YOUR CURRENT LIFE PHASE", "PRIMARY CONCERN") ||
                           extractSection(reading, "🕐", "💡") ||
                           extractSection(reading, "TIMING PREDICTIONS", "GROWTH INSIGHT") ||
                           extractSection(reading, "📅", "🌱")}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "palm" && (
                    <div className="space-y-4">
                      <div className="bg-[#1A1F2E] rounded-2xl p-5 border border-white/10">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                          ✋ Palm Analysis Details
                        </h3>
                        {palmAnalysis && (
                          <div className="space-y-4">
                            {/* Major Lines */}
                            <div>
                              <h4 className="text-white font-semibold text-sm mb-2">Major Lines</h4>
                              <div className="grid grid-cols-1 gap-3">
                                <div className="bg-black/20 rounded-lg p-3">
                                  <p className="text-primary font-semibold text-sm">❤️ Heart Line</p>
                                  <p className="text-white/70 text-xs mt-1">
                                    {palmAnalysis.heart_line?.length} length • {palmAnalysis.heart_line?.curvature} curve • {palmAnalysis.heart_line?.depth} depth
                                  </p>
                                </div>
                                <div className="bg-black/20 rounded-lg p-3">
                                  <p className="text-primary font-semibold text-sm">🧠 Head Line</p>
                                  <p className="text-white/70 text-xs mt-1">
                                    {palmAnalysis.head_line?.direction} • {palmAnalysis.head_line?.length} length • Origin: {palmAnalysis.head_line?.origin}
                                  </p>
                                </div>
                                <div className="bg-black/20 rounded-lg p-3">
                                  <p className="text-primary font-semibold text-sm">🌿 Life Line</p>
                                  <p className="text-white/70 text-xs mt-1">
                                    {palmAnalysis.life_line?.arc} arc • {palmAnalysis.life_line?.depth} depth • {palmAnalysis.life_line?.length} length
                                  </p>
                                </div>
                                {palmAnalysis.fate_line?.present && (
                                  <div className="bg-black/20 rounded-lg p-3">
                                    <p className="text-primary font-semibold text-sm">⚡ Fate Line</p>
                                    <p className="text-white/70 text-xs mt-1">
                                      Present • {palmAnalysis.fate_line?.continuity}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Hand Shape */}
                            <div>
                              <h4 className="text-white font-semibold text-sm mb-2">Hand Characteristics</h4>
                              <div className="bg-black/20 rounded-lg p-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-white/50">Element:</span>
                                    <span className="text-white ml-1 capitalize">{palmAnalysis.hand_shape?.type}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/50">Palm Shape:</span>
                                    <span className="text-white ml-1 capitalize">{palmAnalysis.hand_shape?.palm_shape}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/50">Fingers:</span>
                                    <span className="text-white ml-1 capitalize">{palmAnalysis.hand_shape?.finger_length_relative}</span>
                                  </div>
                                  <div>
                                    <span className="text-white/50">Texture:</span>
                                    <span className="text-white ml-1 capitalize">{palmAnalysis.hand_shape?.skin_texture}</span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Notable Features */}
                            {palmAnalysis.overall_assessment?.most_notable_features?.length > 0 && (
                              <div>
                                <h4 className="text-white font-semibold text-sm mb-2">Notable Features</h4>
                                <div className="space-y-2">
                                  {palmAnalysis.overall_assessment.most_notable_features.map((feature: string, idx: number) => (
                                    <div key={idx} className="flex gap-2 text-xs">
                                      <span className="text-primary">✦</span>
                                      <span className="text-white/70">{feature}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Confidence */}
                            <div className="pt-3 border-t border-white/10">
                              <div className="flex justify-between items-center">
                                <span className="text-white/50 text-xs">Analysis Confidence</span>
                                <span className="text-primary font-bold">
                                  {Math.round((palmAnalysis.overall_assessment?.overall_confidence || 0) * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Palm + Chart Cross-Reference */}
                      <div className="bg-[#1A1F2E] rounded-2xl p-5 border border-white/10">
                        <h3 className="text-white font-bold text-sm mb-3">✋ Palm + Chart Confirmation</h3>
                        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                          {extractSection(reading, "PALM CONFIRMATION", "TIMING PREDICTIONS") ||
                           extractSection(reading, "✋", "📅")}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === "guidance" && (
                    <div className="space-y-4">
                      <div className="bg-[#1A1F2E] rounded-2xl p-5 border border-white/10">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                          🌱 Growth & Guidance
                        </h3>
                        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                          {extractSection(reading, "GROWTH INSIGHT", "CLOSING GUIDANCE") ||
                           extractSection(reading, "🌱", "🙏")}
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-2xl p-5 border border-primary/30">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                          🙏 Closing Guidance
                        </h3>
                        <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                          {extractSection(reading, "CLOSING GUIDANCE", null) ||
                           extractSection(reading, "🙏", null) ||
                           reading?.split("\n\n").slice(-2).join("\n\n")}
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Full Reading Expandable */}
              <div className="bg-[#1A1F2E] rounded-2xl border border-white/10 overflow-hidden">
                <button
                  onClick={() => setExpandedSection(expandedSection === "full" ? null : "full")}
                  className="w-full p-4 flex items-center justify-between"
                >
                  <span className="text-white font-semibold">📜 View Full Reading</span>
                  <span className="text-white/50 text-sm">
                    {expandedSection === "full" ? "▲ Collapse" : "▼ Expand"}
                  </span>
                </button>
                {expandedSection === "full" && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap border-t border-white/10 pt-4">
                      {reading}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Start New Reading Button */}
              <button
                onClick={() => {
                  setPalmImage(null);
                  setPalmAnalysis(null);
                  setReading(null);
                  setMetadata(null);
                  setActiveTab("overview");
                  setExpandedSection(null);
                  setStep("capture");
                }}
                className="w-full py-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold"
              >
                ✨ Start New Reading
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
