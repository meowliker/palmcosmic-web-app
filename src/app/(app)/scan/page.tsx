"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScanPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex-1 flex flex-col items-center justify-center p-6 min-h-screen"
    >
      <div className="w-full max-w-md">
        <div className="aspect-[3/4] bg-card rounded-3xl border border-border flex items-center justify-center mb-6">
          <div className="text-center">
            <Camera className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Camera preview will appear here</p>
          </div>
        </div>

        <Button className="w-full h-14 text-lg" size="lg">
          Capture Palm
        </Button>
      </div>
    </motion.div>
  );
}
