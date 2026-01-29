"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Shield } from "lucide-react";
import { useHaptic } from "@/hooks/useHaptic";

// Generate random stats with some variation for authenticity
function generateRandomStats() {
  const baseStats = [
    { label: "Love", color: "#EF6B6B", min: 72, max: 95 },
    { label: "Health", color: "#4ECDC4", min: 68, max: 92 },
    { label: "Wisdom", color: "#F5C542", min: 65, max: 88 },
    { label: "Career", color: "#8B5CF6", min: 58, max: 85 },
  ];
  return baseStats.map((stat) => ({
    label: stat.label,
    color: stat.color,
    value: Math.floor(Math.random() * (stat.max - stat.min + 1)) + stat.min,
  }));
}

export default function Step15Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [palmImage, setPalmImage] = useState<string | null>(null);

  // Generate random stats once on mount
  const readingStats = useMemo(() => generateRandomStats(), []);

  // Load captured palm image from localStorage
  useEffect(() => {
    const savedImage = localStorage.getItem("palmcosmic_palm_image");
    if (savedImage) {
      setPalmImage(savedImage);
    }
  }, []);

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  };

  const { triggerLight } = useHaptic();
  const handleContinue = () => {
    triggerLight();
    const trimmed = email.trim();

    if (trimmed.length > 0 && !isValidEmail(trimmed)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    setEmailError(null);

    // Store email if provided
    if (trimmed.length > 0) {
      localStorage.setItem("palmcosmic_email", trimmed);
    }
    router.push("/onboarding/step-16");
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex-1 flex flex-col min-h-screen bg-background"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-8 overflow-y-auto">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-bold text-center mb-6"
          style={{ fontFamily: "var(--font-philosopher, serif)" }}
        >
          Your palm reading report is ready
        </motion.h1>

        {/* Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="w-full max-w-sm bg-card border border-border rounded-2xl p-4 mb-6"
        >
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            OVERVIEW
          </h2>

          <div className="flex gap-4 mb-4">
            {/* Palm image - use captured photo if available */}
            <div className="w-24 h-28 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
              {palmImage ? (
                <img
                  src={palmImage}
                  alt="Your palm"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  Palm
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-3">
              {readingStats.map((stat, index) => (
                <div key={stat.label} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="text-muted-foreground">{stat.value}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: stat.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${stat.value}%` }}
                      transition={{ delay: 0.5 + index * 0.15, duration: 0.8 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reading descriptions */}
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              Your <span className="text-[#EF6B6B] font-medium">Heart Line</span> shows that you are very passionate and freely express your thoughts and feelings.
            </p>
            <p>
              Your <span className="text-[#4ECDC4] font-medium">Life Line</span> means positive changes or recovery from illness in your future and overall completion of your life goals.
            </p>
          </div>
        </motion.div>

        {/* Email signup section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="w-full max-w-sm"
        >
          <h2 className="text-lg font-semibold text-center mb-4">
            Sign up to understand yourself better with PalmCosmic
          </h2>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError(null);
            }}
            className="w-full h-12 px-4 bg-white/10 border border-primary/30 rounded-lg text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-2"
          />

          {emailError && (
            <p className="text-red-400 text-sm mb-4 text-center">{emailError}</p>
          )}

          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-6">
            <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <p>
              Your personal data is safe with us. We&apos;ll use your email for updates, receipts, and subscription details.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="px-6 pb-24">
        <Button
          onClick={handleContinue}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );
}
