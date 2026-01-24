"use client";

import { motion } from "framer-motion";
import { fadeUp } from "@/lib/motion";

export default function DashboardPage() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="p-6"
    >
      <h1 className="font-cormorant text-3xl font-bold mb-4">Dashboard</h1>
      <p className="text-muted-foreground">
        Your cosmic insights and palm readings will appear here.
      </p>
    </motion.div>
  );
}
