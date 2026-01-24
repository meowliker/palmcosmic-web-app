"use client";

import { motion } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check, Crown, Sparkles } from "lucide-react";

export default function PaywallPage() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="min-h-screen p-6 flex flex-col"
    >
      <motion.div variants={staggerItem} className="text-center mb-8">
        <Crown className="w-12 h-12 text-accent mx-auto mb-4" />
        <h1 className="font-cormorant text-3xl md:text-4xl font-bold mb-2">
          Unlock Premium
        </h1>
        <p className="text-muted-foreground">
          Get unlimited access to all cosmic features
        </p>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-4 mb-8">
        <Card className="p-6 border-primary bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-lg">Yearly</p>
              <p className="text-muted-foreground text-sm">Best value</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">$49.99</p>
              <p className="text-muted-foreground text-sm">/year</p>
            </div>
          </div>
          <Button className="w-full" size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Free Trial
          </Button>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-semibold text-lg">Monthly</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">$9.99</p>
              <p className="text-muted-foreground text-sm">/month</p>
            </div>
          </div>
          <Button variant="secondary" className="w-full" size="lg">
            Subscribe Monthly
          </Button>
        </Card>
      </motion.div>

      <motion.div variants={staggerItem} className="space-y-3">
        {[
          "Unlimited palm readings",
          "AI-powered insights",
          "Daily horoscope",
          "Priority support",
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-3">
            <Check className="w-5 h-5 text-primary" />
            <span>{feature}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
}
