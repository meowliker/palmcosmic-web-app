"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Check, Shield } from "lucide-react";
import Image from "next/image";

const pricingPlans = [
  {
    id: "1-week",
    name: "1-Week Trial",
    price: "$1",
    originalPrice: "$4.99",
    period: "1-WEEK trial",
    description: "then 2-Week Plan $19.99",
  },
  {
    id: "2-week",
    name: "2-Week Trial",
    price: "$5.49",
    originalPrice: "$18.99",
    period: "2-WEEK trial",
    description: "then 2-Week Plan $19.99",
    popular: true,
  },
  {
    id: "4-week",
    name: "4-Week Trial",
    price: "$9.99",
    originalPrice: "$19.99",
    period: "4-WEEK trial",
    description: "then 1-Month Plan $29.99",
  },
];

export default function Step17Page() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("2-week");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const handleStartTrial = () => {
    // In a real app, this would initiate payment
    router.push("/onboarding/step-18");
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex-1 flex flex-col min-h-screen bg-background"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-6 overflow-y-auto">
        {/* Get My Prediction button at top */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mb-6"
        >
          <Button
            variant="outline"
            className="w-full h-12 text-base font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground"
            size="lg"
          >
            Get My Prediction
          </Button>
        </motion.div>

        {/* Unlock predictions heading */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-center mb-6"
        >
          Unlock predictions
        </motion.h1>

        {/* Pricing plans */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          {pricingPlans.map((plan, index) => (
            <motion.button
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => setSelectedPlan(plan.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all relative ${
                selectedPlan === plan.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-4 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most popular
                </span>
              )}

              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="font-semibold text-base">{plan.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-primary font-bold">{plan.price}</span>
                    <span className="text-muted-foreground line-through text-sm">
                      {plan.originalPrice}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {plan.description}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <p className="text-xs text-muted-foreground uppercase">
                    {plan.period}
                  </p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Start Trial button */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-sm mb-4"
        >
          <Button
            onClick={handleStartTrial}
            disabled={!agreedToTerms}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            Start Trial and Continue
          </Button>
        </motion.div>

        {/* Terms checkbox */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="w-full max-w-sm mb-4"
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <button
              onClick={() => setAgreedToTerms(!agreedToTerms)}
              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                agreedToTerms
                  ? "bg-primary border-primary"
                  : "border-muted-foreground"
              }`}
            >
              {agreedToTerms && <Check className="w-3 h-3 text-primary-foreground" />}
            </button>
            <span className="text-xs text-muted-foreground leading-relaxed">
              I confirm that I have read and agree to the{" "}
              <a href="#" className="text-primary underline">Terms of Use</a>,{" "}
              <a href="#" className="text-primary underline">Billing Terms</a> and{" "}
              <a href="#" className="text-primary underline">Money-back Policy</a>.
              Start your 14-day trial for $5.49. After the trial, you&apos;ll be charged $19.99 every 2 weeks starting from February 7 until canceled.
              By completing your purchase, you consent to us securely storing your payment details for future charges. No refunds for partial periods. You can cancel subscription anytime via account settings or by contacting support at support@palmcosmic.app.
            </span>
          </label>
        </motion.div>

        {/* Safe checkout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col items-center gap-2"
        >
          <div className="flex items-center gap-2 text-muted-foreground">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm">Guaranteed safe checkout</span>
          </div>

          {/* Payment icons */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-6 bg-[#1A1F71] rounded flex items-center justify-center">
              <span className="text-white text-xs font-bold">VISA</span>
            </div>
            <div className="w-10 h-6 bg-[#EB001B] rounded flex items-center justify-center">
              <div className="flex">
                <div className="w-3 h-3 bg-[#EB001B] rounded-full" />
                <div className="w-3 h-3 bg-[#F79E1B] rounded-full -ml-1" />
              </div>
            </div>
            <div className="w-10 h-6 bg-[#006FCF] rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">AMEX</span>
            </div>
            <div className="w-10 h-6 bg-[#003087] rounded flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">PayPal</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
