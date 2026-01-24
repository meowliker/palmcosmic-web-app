"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Image from "next/image";

const predictionLabels = [
  { text: "Children", emoji: "👶", top: "15%", left: "20%", rotation: -15 },
  { text: "Marriage", emoji: "💕", top: "35%", left: "55%", rotation: 5 },
  { text: "Big change at", emoji: "✨", top: "55%", left: "15%", rotation: -10 },
];

export default function Step16Page() {
  const router = useRouter();

  const handleGetPrediction = () => {
    router.push("/onboarding/step-17");
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex-1 flex flex-col min-h-screen bg-background"
    >
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mb-2"
        >
          <span className="text-sm text-muted-foreground">PalmCosmic</span>
          <span className="text-lg">🔮</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-2xl md:text-3xl font-bold text-center mb-1"
        >
          Your Palm Reading
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-xl md:text-2xl font-bold text-primary mb-8"
        >
          Is Ready!
        </motion.p>

        {/* Palm with prediction labels */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="relative w-72 h-80 mb-8"
        >
          {/* Circular glow background */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-primary/20 via-primary/10 to-transparent blur-2xl" />
          
          {/* Dark circle container */}
          <div className="absolute inset-4 rounded-full bg-card/80 border border-border/50 overflow-hidden flex items-center justify-center">
            <Image
              src="/palm.png"
              alt="Your palm reading"
              width={200}
              height={240}
              className="object-contain opacity-80"
            />
          </div>

          {/* Prediction labels */}
          {predictionLabels.map((label, index) => (
            <motion.div
              key={label.text}
              initial={{ opacity: 0, scale: 0, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: 0.6 + index * 0.2, type: "spring", stiffness: 200 }}
              className="absolute bg-card/90 backdrop-blur-sm border border-border rounded-lg px-3 py-1.5 shadow-lg"
              style={{
                top: label.top,
                left: label.left,
                transform: `rotate(${label.rotation}deg)`,
              }}
            >
              <span className="text-sm font-medium flex items-center gap-1">
                {label.text} <span>{label.emoji}</span>
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <div className="p-6">
        <Button
          onClick={handleGetPrediction}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          Get My Prediction
        </Button>
      </div>
    </motion.div>
  );
}
