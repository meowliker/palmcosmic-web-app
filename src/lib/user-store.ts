"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SubscriptionPlan = "1week" | "2week" | "4week" | "weekly" | "monthly" | "yearly" | null;

export interface UnlockedFeatures {
  palmReading: boolean;
  prediction2026: boolean;
  birthChart: boolean;
  compatibilityTest: boolean;
}

interface UserState {
  // Subscription & Purchase State
  subscriptionPlan: SubscriptionPlan;
  unlockedFeatures: UnlockedFeatures;
  coins: number;
  
  // Firebase user ID (set after registration)
  firebaseUserId: string | null;
  
  // Birth chart generation state
  birthChartGenerating: boolean;
  birthChartReady: boolean;
  
  // Actions
  setSubscriptionPlan: (plan: SubscriptionPlan) => void;
  unlockFeature: (feature: keyof UnlockedFeatures) => void;
  unlockAllFeatures: () => void;
  setCoins: (coins: number) => void;
  deductCoins: (amount: number) => boolean;
  addCoins: (amount: number) => void;
  setFirebaseUserId: (id: string) => void;
  setBirthChartGenerating: (generating: boolean) => void;
  setBirthChartReady: (ready: boolean) => void;
  
  // Purchase actions (will integrate with Stripe later)
  purchaseSubscription: (plan: SubscriptionPlan) => void;
  purchaseUpsell: (feature: keyof UnlockedFeatures) => void;
  purchaseAllUpsells: () => void;
  
  // Reset for testing
  resetUserState: () => void;
}

const initialUnlockedFeatures: UnlockedFeatures = {
  palmReading: true, // Always unlocked with base subscription
  prediction2026: false,
  birthChart: false,
  compatibilityTest: false,
};

const initialState = {
  subscriptionPlan: null as SubscriptionPlan,
  unlockedFeatures: initialUnlockedFeatures,
  coins: 0,
  firebaseUserId: null as string | null,
  birthChartGenerating: false,
  birthChartReady: false,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setSubscriptionPlan: (plan) => set({ subscriptionPlan: plan }),

      unlockFeature: (feature) =>
        set((state) => ({
          unlockedFeatures: {
            ...state.unlockedFeatures,
            [feature]: true,
          },
        })),

      unlockAllFeatures: () =>
        set({
          unlockedFeatures: {
            palmReading: true,
            prediction2026: true,
            birthChart: true,
            compatibilityTest: true,
          },
        }),

      setCoins: (coins) => set({ coins }),

      deductCoins: (amount) => {
        const currentCoins = get().coins;
        if (currentCoins >= amount) {
          set({ coins: currentCoins - amount });
          return true;
        }
        return false;
      },

      addCoins: (amount) => set((state) => ({ coins: state.coins + amount })),

      setFirebaseUserId: (id) => set({ firebaseUserId: id }),

      setBirthChartGenerating: (generating) => set({ birthChartGenerating: generating }),

      setBirthChartReady: (ready) => set({ birthChartReady: ready }),

      // Purchase subscription - sets coins based on plan
      purchaseSubscription: (plan) => {
        let coins = 0;
        if (plan === "weekly") {
          coins = 15;
        } else if (plan === "monthly") {
          coins = 30;
        } else if (plan === "yearly") {
          coins = 100;
        }
        set({
          subscriptionPlan: plan,
          coins,
          unlockedFeatures: {
            ...initialUnlockedFeatures,
            palmReading: true, // Base subscription includes palm reading
          },
        });
      },

      // Purchase individual upsell
      purchaseUpsell: (feature) =>
        set((state) => ({
          unlockedFeatures: {
            ...state.unlockedFeatures,
            [feature]: true,
          },
        })),

      // Purchase pack of 3 (all upsells)
      purchaseAllUpsells: () =>
        set({
          unlockedFeatures: {
            palmReading: true,
            prediction2026: true,
            birthChart: true,
            compatibilityTest: true,
          },
        }),

      // Reset for testing
      resetUserState: () => set(initialState),
    }),
    {
      name: "palmcosmic-user",
    }
  )
);

// Helper to check if a feature is accessible
export const isFeatureUnlocked = (
  feature: keyof UnlockedFeatures,
  unlockedFeatures: UnlockedFeatures
): boolean => {
  return unlockedFeatures[feature];
};

// Feature names for display
export const featureNames: Record<keyof UnlockedFeatures, string> = {
  palmReading: "Palm Reading Report",
  prediction2026: "2026 Predictions",
  birthChart: "Birth Chart",
  compatibilityTest: "Compatibility Test",
};

// Feature prices
export const featurePrices: Record<keyof UnlockedFeatures, number> = {
  palmReading: 6.99,
  prediction2026: 6.99,
  birthChart: 6.99,
  compatibilityTest: 6.99,
};
