"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fadeUp } from "@/lib/motion";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Check, Shield, Coins } from "lucide-react";
import { useUserStore, SubscriptionPlan } from "@/lib/user-store";
import { generateUserId } from "@/lib/user-profile";
import { pixelEvents } from "@/lib/pixel-events";

const pricingPlans = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$4.99",
    period: "/week",
    trialDays: 3,
    trialText: "3-day free trial",
    description: "Billed weekly after trial",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$9.99",
    period: "/month",
    trialDays: 7,
    trialText: "1-week free trial",
    description: "Billed monthly after trial",
    popular: true,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$39.99",
    period: "/year",
    trialDays: 14,
    trialText: "2-week free trial",
    description: "Best value - Save 67%",
    bestValue: true,
    bonusCoins: 30,
  },
];

export default function Step17Page() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>("monthly");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [promoData, setPromoData] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { purchaseSubscription, unlockAllFeatures, setCoins } = useUserStore();

  useEffect(() => {
    const handlePageShow = () => setIsProcessing(false);
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) {
      setPromoError("Please enter a promo code");
      return;
    }

    setIsValidating(true);
    setPromoError("");

    try {
      const response = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode }),
      });

      const result = await response.json();

      if (result.success) {
        setPromoSuccess(true);
        setPromoData(result.data);
        setPromoError("");
      } else {
        setPromoError(result.error || "Invalid promo code");
        setPromoSuccess(false);
      }
    } catch (error) {
      setPromoError("Failed to validate promo code");
      setPromoSuccess(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handlePromoActivate = () => {
    // Give access based on promo data from Firebase
    const plan = (promoData?.plan || "yearly") as SubscriptionPlan;
    const coins = promoData?.coins || 100;
    
    purchaseSubscription(plan);
    if (promoData?.unlockAll !== false) {
      unlockAllFeatures();
    }
    setCoins(coins);
    router.push("/onboarding/step-18");
  };

  const handleStartTrial = async () => {
    setPaymentError("");
    setIsProcessing(true);
    
    // Track trial initiation
    const planPrice = selectedPlan === "weekly" ? 4.99 : selectedPlan === "monthly" ? 9.99 : 49.99;
    pixelEvents.startTrial(planPrice);

    try {
      // Create Stripe checkout session
      const response = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: generateUserId(),
          email: localStorage.getItem("palmcosmic_email") || "",
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe Checkout
        window.location.href = data.url;
      } else if (data.error) {
        // Show error message on the paywall
        setPaymentError(data.error);
        setIsProcessing(false);
      } else {
        // No URL returned - show generic error
        setPaymentError("Unable to start checkout. Please try again.");
        setIsProcessing(false);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      setPaymentError("Something went wrong. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      className="flex-1 flex flex-col min-h-screen bg-background"
    >
      <div className="flex-1 flex flex-col items-center px-6 py-6 overflow-y-auto">
        {/* Complete Purchase Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mb-4 text-center"
        >
          <h2 className="text-muted-foreground text-sm uppercase tracking-wider">Unlock predictions</h2>
        </motion.div>

        {/* Unlock predictions heading */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl font-bold text-center mb-6"
        >
          Complete Your Purchase
        </motion.h1>

        {/* Pricing plans */}
        <div className="w-full max-w-sm space-y-3 mb-6">
          {pricingPlans.map((plan, index) => (
            <motion.button
              key={plan.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              onClick={() => setSelectedPlan(plan.id as SubscriptionPlan)}
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
                  <p className="text-xs text-primary mt-1">
                    {plan.trialText}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {plan.description}
                  </p>
                  {(plan as any).bestValue && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-semibold rounded-full">
                      Best Value
                    </span>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-2xl font-bold">{plan.price}</span>
                  <p className="text-xs text-muted-foreground">
                    {plan.period}
                  </p>
                  {(plan as any).bonusCoins && (
                    <div className="flex items-center gap-1 justify-end mt-1">
                      <span className="text-xs text-yellow-400 font-semibold">+{(plan as any).bonusCoins}</span>
                      <Coins className="w-3 h-3 text-yellow-400" />
                    </div>
                  )}
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
{/* Payment Error Message */}
          {paymentError && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-sm text-center">{paymentError}</p>
            </div>
          )}

          <Button
            onClick={handleStartTrial}
            disabled={!agreedToTerms || isProcessing}
            className="w-full h-14 text-lg font-semibold"
            size="lg"
          >
            {isProcessing ? "Processing..." : "Start Trial and Continue"}
          </Button>
          
          <button 
            onClick={() => setShowPromoInput(!showPromoInput)}
            className="mt-3 text-primary text-sm underline hover:text-primary/80 transition-colors"
          >
            Have a promo code?
          </button>

          {/* Promo Code Input */}
          {showPromoInput && (
            <div className="mt-4 space-y-3">
              {promoSuccess ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                  <p className="text-green-400 font-semibold mb-2">🎉 Promo code applied!</p>
                  <p className="text-green-300 text-sm mb-3">You get full access for FREE</p>
                  <Button
                    onClick={handlePromoActivate}
                    className="w-full bg-green-500 hover:bg-green-600"
                  >
                    Activate Free Access
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter promo code"
                    className="flex-1 bg-card border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                  <Button onClick={handleApplyPromo} variant="outline" disabled={isValidating}>
                    {isValidating ? "..." : "Apply"}
                  </Button>
                </div>
              )}
              {promoError && (
                <p className="text-red-400 text-sm">{promoError}</p>
              )}
            </div>
          )}
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
              Your free trial will begin immediately. After the trial period ends, you&apos;ll be automatically charged the subscription price until canceled.
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
