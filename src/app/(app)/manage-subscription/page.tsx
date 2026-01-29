"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Crown, Loader2, AlertTriangle, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/lib/user-store";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const subscriptionPlans = [
  {
    id: "weekly",
    name: "Weekly",
    price: "$4.99",
    period: "/week",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "$9.99",
    period: "/month",
    popular: true,
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "$39.99",
    period: "/year",
    description: "Best value - Save 67%",
    bestValue: true,
  },
];

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<{
    isCancelled: boolean;
    cycleEndDate: string | null;
    stripeSubscriptionId: string | null;
  }>({
    isCancelled: false,
    cycleEndDate: null,
    stripeSubscriptionId: null,
  });

  const { subscriptionPlan, setSubscriptionPlan } = useUserStore();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  const normalizePlan = (plan: any): "weekly" | "monthly" | "yearly" | null => {
    if (!plan) return null;
    const p = String(plan).toLowerCase().trim();
    if (p === "weekly" || p.includes("week")) return "weekly";
    if (p === "monthly" || p.includes("month")) return "monthly";
    if (p === "yearly" || p.includes("year") || p.includes("annual")) return "yearly";
    return null;
  };

  useEffect(() => {
    fetchSubscriptionStatus();
  }, []);

  useEffect(() => {
    const handlePageShow = () => {
      setIsProcessing(false);
      setSelectedPlan(null);
      fetchSubscriptionStatus();
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, []);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("upgraded") === "true") {
        fetchSubscriptionStatus();
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      const userId = localStorage.getItem("palmcosmic_user_id");
      if (!userId) return;

      const userDoc = await getDoc(doc(db, "users", userId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setSubscriptionStatus({
          isCancelled: data.subscriptionCancelled || false,
          cycleEndDate: data.subscriptionEndDate || null,
          stripeSubscriptionId: data.stripeSubscriptionId || null,
        });
        // Also get the subscription plan from Firebase
        const normalized = normalizePlan((data as any).subscriptionPlan);
        setCurrentPlan(normalized);
        setSubscriptionPlan(normalized);

        if (!normalized && (data as any).stripeSubscriptionId) {
          try {
            const res = await fetch("/api/stripe/resolve-subscription-plan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId, subscriptionId: (data as any).stripeSubscriptionId }),
            });

            const resolved = await res.json();
            if (res.ok) {
              const resolvedPlan = normalizePlan(resolved.plan);
              if (resolvedPlan) {
                setCurrentPlan(resolvedPlan);
                setSubscriptionPlan(resolvedPlan);
              }
            }
          } catch (err) {
            console.error("Failed to resolve subscription plan:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching subscription status:", error);
    }
  };

  const activePlan = currentPlan || normalizePlan(subscriptionPlan);

  const handleUpgrade = async (planId: string) => {
    if (planId === activePlan) return; // Already on this plan

    setError("");
    setIsProcessing(true);
    setSelectedPlan(planId);

    try {
      // Use upgrade checkout (no trial) for existing subscribers
      const response = await fetch("/api/stripe/create-upgrade-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: planId,
          userId: localStorage.getItem("palmcosmic_user_id") || "",
          email: localStorage.getItem("palmcosmic_email") || "",
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
        setIsProcessing(false);
        setSelectedPlan(null);
      } else {
        setError("Unable to start checkout. Please try again.");
        setIsProcessing(false);
        setSelectedPlan(null);
      }
    } catch (err) {
      console.error("Upgrade error:", err);
      setError("Something went wrong. Please try again.");
      setIsProcessing(false);
      setSelectedPlan(null);
    }
  };

  const getPlanStatus = (planId: string) => {
    if (planId === activePlan) return "current";
    
    const planOrder = ["weekly", "monthly", "yearly"];
    const currentIndex = planOrder.indexOf(activePlan || "");
    const planIndex = planOrder.indexOf(planId);
    
    if (currentIndex === -1) return "upgrade";
    if (planIndex > currentIndex) return "upgrade";
    return "downgrade";
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/cancel-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: localStorage.getItem("palmcosmic_user_id") || "",
          subscriptionId: subscriptionStatus.stripeSubscriptionId,
          email: localStorage.getItem("palmcosmic_email") || "",
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update local state
        setSubscriptionStatus({
          ...subscriptionStatus,
          isCancelled: true,
          cycleEndDate: data.cycleEndDate,
        });
        setShowCancelModal(false);
      } else {
        setError(data.error || "Failed to cancel subscription");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleResumeSubscription = async () => {
    setIsResuming(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/resume-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: localStorage.getItem("palmcosmic_user_id") || "",
          subscriptionId: subscriptionStatus.stripeSubscriptionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSubscriptionStatus({
          ...subscriptionStatus,
          isCancelled: false,
        });
      } else {
        setError(data.error || "Failed to resume subscription");
      }
    } catch (err) {
      console.error("Resume error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsResuming(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="w-full max-w-md h-screen bg-[#0A0E1A] overflow-hidden shadow-2xl shadow-black/50 flex flex-col relative">
        {/* Starry background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute w-0.5 h-0.5 bg-white/20 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </div>

        {/* Header */}
        <div className="sticky top-0 z-40 bg-[#0A0E1A]/95 backdrop-blur-sm">
          <div className="flex items-center justify-center px-4 py-3">
            <button
              onClick={() => router.push("/settings")}
              className="absolute left-4 w-10 h-10 flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-white text-xl font-semibold">Manage Subscription</h1>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto relative z-10">
          <div className="px-4 py-6 space-y-4">
            {/* Current Plan Info */}
            {activePlan && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-primary/20 to-purple-500/20 rounded-2xl p-4 border border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-white/60 text-sm">Current Plan</p>
                    <p className="text-primary text-lg font-bold capitalize">{activePlan}</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
              >
                <p className="text-red-400 text-sm text-center">{error}</p>
              </motion.div>
            )}

            {/* Plans */}
            <div className="space-y-3">
              {subscriptionPlans.map((plan, index) => {
                const status = getPlanStatus(plan.id);
                const isCurrent = status === "current";
                const isUpgrade = status === "upgrade";

                return (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`relative rounded-2xl p-4 border-2 transition-all ${
                      isCurrent
                        ? "bg-primary/10 border-primary"
                        : plan.popular
                        ? "bg-[#1A1F2E] border-primary"
                        : "bg-[#1A1F2E] border-white/10"
                    }`}
                  >
                    {/* Current Badge */}
                    {isCurrent && (
                      <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                        CURRENT PLAN
                      </div>
                    )}

                    {/* Popular Badge */}
                    {plan.popular && !isCurrent && (
                      <div className="absolute -top-3 left-4 px-3 py-1 bg-primary text-white text-xs font-bold rounded-full">
                        MOST POPULAR
                      </div>
                    )}

                    {/* Best Value Badge */}
                    {plan.bestValue && !isCurrent && (
                      <div className="absolute -top-3 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                        BEST VALUE
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div>
                        <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
                        {plan.description && <p className="text-white/50 text-sm">{plan.description}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-white text-2xl font-bold">{plan.price}</p>
                        <p className="text-white/50 text-sm">{plan.period}</p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="mt-4">
                      {isCurrent ? (
                        <div className="flex items-center justify-center gap-2 py-3 bg-primary/20 rounded-xl">
                          <Check className="w-5 h-5 text-primary" />
                          <span className="text-primary font-medium">Active</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleUpgrade(plan.id)}
                          disabled={isProcessing}
                          className={`w-full h-12 font-semibold ${
                            isUpgrade
                              ? "bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 text-white"
                              : "bg-white/10 hover:bg-white/20 text-white"
                          }`}
                        >
                          {isProcessing && selectedPlan === plan.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : isUpgrade ? (
                            "Upgrade"
                          ) : (
                            "Downgrade"
                          )}
                        </Button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Subscription Status Banner */}
            {subscriptionStatus.isCancelled && subscriptionStatus.cycleEndDate && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-4"
              >
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-orange-400 font-medium text-sm">Subscription Cancelled</p>
                    <p className="text-white/60 text-xs mt-1">
                      Your subscription will end on {formatDate(subscriptionStatus.cycleEndDate)}. 
                      You can continue using all features until then.
                    </p>
                    <Button
                      onClick={handleResumeSubscription}
                      disabled={isResuming}
                      size="sm"
                      className="mt-3 bg-orange-500 hover:bg-orange-600 text-white h-8 text-xs"
                    >
                      {isResuming ? (
                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                      ) : null}
                      Resume Subscription
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Cancel Subscription */}
            {activePlan && !subscriptionStatus.isCancelled && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-4"
              >
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 text-white/40 hover:text-red-400 text-sm transition-colors"
                >
                  Cancel Subscription
                </button>
              </motion.div>
            )}

            {/* Info */}
            <p className="text-white/30 text-xs text-center px-4">
              Changes to your subscription will take effect immediately. 
              You will be charged the prorated amount for the remaining billing period.
            </p>
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#1A1F2E] rounded-2xl w-full max-w-sm p-6 border border-white/10"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
              </div>

              <h2 className="text-white text-xl font-bold text-center mb-2">
                Cancel Subscription?
              </h2>
              <p className="text-white/60 text-center text-sm mb-2">
                Are you sure you want to cancel your subscription?
              </p>
              <p className="text-white/40 text-center text-xs mb-6">
                Your subscription will remain active until the end of your current billing cycle. 
                You won&apos;t be charged again after that.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleCancelSubscription}
                  disabled={isCancelling}
                  className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-semibold"
                >
                  {isCancelling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Yes, Cancel Subscription"
                  )}
                </Button>
                <Button
                  onClick={() => setShowCancelModal(false)}
                  variant="outline"
                  className="w-full h-12 border-white/20 text-white hover:bg-white/10"
                >
                  Keep My Subscription
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
