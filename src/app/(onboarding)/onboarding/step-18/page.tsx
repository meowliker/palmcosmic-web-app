"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import Image from "next/image";

const progressSteps = [
  { label: "Order submitted", completed: true },
  { label: "Special offer", active: true },
  { label: "Create account", completed: false },
  { label: "Access to the app", completed: false },
];

const upsellOffers = [
  {
    id: "palm-reading",
    name: "Palm Reading Report",
    price: "$6.99",
    originalPrice: "$9.99",
    discount: "30% OFF",
    icon: "/palm.png",
  },
  {
    id: "birth-chart",
    name: "Birth Chart Report",
    price: "$6.99",
    originalPrice: "$9.99",
    discount: "30% OFF",
    icon: "🌙",
  },
  {
    id: "compatibility",
    name: "Compatibility Report",
    price: "$6.99",
    originalPrice: "$9.99",
    discount: "30% OFF",
    icon: "🔮",
  },
  {
    id: "ultra-pack",
    name: "Ultra Pack 3 in 1",
    price: "$9.99",
    originalPrice: "$16.99",
    discount: "40% OFF",
    icon: "📦",
    recommended: true,
  },
];

export default function Step18Page() {
  const router = useRouter();
  const [selectedOffer, setSelectedOffer] = useState<string | null>("ultra-pack");

  const handleGetReport = () => {
    router.push("/onboarding/step-19");
  };

  const handleSkip = () => {
    router.push("/onboarding/step-19");
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex-1 flex flex-col min-h-screen bg-background"
    >
      {/* Progress indicator */}
      <div className="px-6 pt-6 pb-4">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-start">
            {progressSteps.map((step, index) => (
              <div key={step.label} className="flex items-center flex-1 last:flex-none">
                {/* Circle and label column */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                      step.completed
                        ? "bg-primary text-primary-foreground"
                        : step.active
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.completed ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span
                    className={`text-[10px] text-center mt-1 w-14 ${
                      step.active ? "text-primary font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {/* Connector line */}
                {index < progressSteps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 mt-3.5 ${
                      step.completed ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center px-6 py-4 overflow-y-auto">
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl md:text-2xl font-bold text-center mb-6"
        >
          Choose your sign-up offer!
        </motion.h1>

        {/* Offer cards */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          {upsellOffers.map((offer, index) => (
            <motion.button
              key={offer.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + index * 0.1 }}
              onClick={() => setSelectedOffer(offer.id)}
              className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                selectedOffer === offer.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg bg-card border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
                {offer.icon.startsWith("/") ? (
                  <Image
                    src={offer.icon}
                    alt={offer.name}
                    width={40}
                    height={40}
                    className="object-cover"
                  />
                ) : (
                  <span className="text-2xl">{offer.icon}</span>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 text-left">
                <h3 className="font-semibold text-sm">{offer.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold">{offer.price}</span>
                  <span className="text-muted-foreground text-xs line-through">
                    (was {offer.originalPrice})
                  </span>
                  <span className="text-primary text-xs font-semibold">
                    {offer.discount}
                  </span>
                </div>
              </div>

              {/* Selection indicator */}
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  selectedOffer === offer.id
                    ? "border-primary bg-primary"
                    : "border-muted-foreground"
                }`}
              >
                {selectedOffer === offer.id && (
                  <Check className="w-4 h-4 text-primary-foreground" />
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Bottom section */}
      <div className="p-6 space-y-3">
        <Button
          onClick={handleGetReport}
          className="w-full h-14 text-lg font-semibold"
          size="lg"
        >
          Get my PDF report *
        </Button>

        <button
          onClick={handleSkip}
          className="w-full text-muted-foreground text-sm underline hover:text-foreground transition-colors"
        >
          No, I don&apos;t want to get my reports
        </button>

        <p className="text-[10px] text-muted-foreground text-center leading-relaxed">
          Purchase the Ultra Pack 3 in 1 for $9.99, charged to your stored billing details.
          By clicking &quot;Get my PDF report&quot;, you confirm your purchase. The report will be
          delivered electronically after purchase. All sales are final, non-refundable, and
          withdrawal rights expire upon purchase.
        </p>
      </div>
    </motion.div>
  );
}
