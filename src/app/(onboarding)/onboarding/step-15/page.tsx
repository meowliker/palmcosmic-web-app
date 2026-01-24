"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Shield } from "lucide-react";

const readingStats = [
  { label: "Love", value: 89, color: "#EF6B6B" },
  { label: "Health", value: 85, color: "#4ECDC4" },
  { label: "Wisdom", value: 78, color: "#F5C542" },
  { label: "Career", value: 65, color: "#8B5CF6" },
];

export default function Step15Page() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const handleContinue = () => {
    // Store email if provided
    if (email) {
      localStorage.setItem("palmcosmic_email", email);
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
            {/* Palm image */}
            <div className="w-24 h-28 rounded-lg overflow-hidden flex-shrink-0">
              <Image
                src="/palm.png"
                alt="Your palm"
                width={96}
                height={112}
                className="w-full h-full object-cover"
              />
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
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-12 px-4 bg-primary/10 border border-primary/30 rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 mb-4"
          />

          <div className="flex items-start gap-2 text-xs text-muted-foreground mb-6">
            <Shield className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
            <p>
              Your personal data is safe with us. We&apos;ll use your email for updates, receipts, and subscription details.
            </p>
          </div>
        </motion.div>
      </div>

      <div className="p-6">
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
