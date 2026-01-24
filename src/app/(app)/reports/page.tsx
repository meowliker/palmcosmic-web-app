"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { Card } from "@/components/ui/card";
import { FileText, Download, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ReportsPage() {
  const reports = [
    { id: 1, title: "Full Palm Reading", date: "Jan 20, 2026", status: "ready" },
    { id: 2, title: "Life Line Analysis", date: "Jan 18, 2026", status: "ready" },
  ];

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="p-6 max-w-lg mx-auto"
    >
      <motion.h1
        variants={staggerItem}
        className="font-cormorant text-3xl font-bold mb-6"
      >
        Your Reports
      </motion.h1>

      <div className="space-y-4">
        {reports.map((report) => (
          <motion.div key={report.id} variants={staggerItem}>
            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{report.title}</p>
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Calendar className="w-3 h-3" />
                    <span>{report.date}</span>
                  </div>
                </div>
                <Button size="icon" variant="ghost">
                  <Download className="w-5 h-5" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
