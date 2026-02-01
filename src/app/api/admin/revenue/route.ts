import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    // Get session token from query params for admin check
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");
    
    if (!token) {
      return NextResponse.json({ error: "Unauthorized - No token provided" }, { status: 401 });
    }
    
    // Verify admin session token
    const sessionDoc = await adminDb.collection("admin_sessions").doc(token).get();
    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Unauthorized - Invalid session" }, { status: 401 });
    }
    
    const sessionData = sessionDoc.data();
    if (new Date(sessionData?.expiresAt) < new Date()) {
      // Session expired, delete it
      await adminDb.collection("admin_sessions").doc(token).delete();
      return NextResponse.json({ error: "Session expired - Please login again" }, { status: 401 });
    }
    
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // Fetch all payments
    const paymentsSnapshot = await adminDb.collection("payments").orderBy("createdAt", "desc").get();
    const payments: any[] = [];
    paymentsSnapshot.forEach(doc => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    // Fetch subscriptions directly from Stripe for accurate data
    // Fetch ALL statuses: active, trialing, canceled, past_due, unpaid, incomplete, incomplete_expired
    const stripeSubscriptions: Map<string, any> = new Map();
    try {
      // Fetch active/trialing subscriptions
      const activeSubscriptions = await stripe.subscriptions.list({
        limit: 100,
        expand: ["data.customer"],
      });
      
      // Fetch canceled subscriptions separately
      const canceledSubscriptions = await stripe.subscriptions.list({
        limit: 100,
        status: "canceled",
        expand: ["data.customer"],
      });
      
      // Combine all subscriptions
      const allSubscriptions = [...activeSubscriptions.data, ...canceledSubscriptions.data];
      
      for (const sub of allSubscriptions) {
        const customer = sub.customer as Stripe.Customer;
        if (customer && customer.email) {
          const email = customer.email.toLowerCase();
          // Only store if not already present (prefer active over canceled if duplicate)
          if (!stripeSubscriptions.has(email) || sub.status !== "canceled") {
            stripeSubscriptions.set(email, {
              id: sub.id,
              status: sub.status, // trialing, active, canceled, past_due, etc.
              plan: (sub as any).metadata?.plan || null,
              currentPeriodStart: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : null,
              currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
              trialStart: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
              trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
              created: new Date(sub.created * 1000).toISOString(),
              cancelAt: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
              canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
              cancelAtPeriodEnd: sub.cancel_at_period_end, // true if scheduled to cancel at period end
            });
          }
        }
      }
    } catch (stripeErr) {
      console.error("Failed to fetch Stripe subscriptions:", stripeErr);
    }
    
    // Fetch all users for subscriber data
    const usersSnapshot = await adminDb.collection("users").get();
    const users: any[] = [];
    const anonUsersWithSubscription: any[] = [];
    usersSnapshot.forEach(doc => {
      const userData = { id: doc.id, ...doc.data() };
      // Filter out anonymous users (they get migrated to real users after registration)
      // Anonymous users have IDs like "anon_123456" and should not be counted in metrics
      // to avoid double-counting the same subscriber
      if (!doc.id.startsWith("anon_")) {
        users.push(userData);
      } else if ((userData as any).subscriptionStatus === "active" || (userData as any).subscriptionStatus === "trialing") {
        // Track anonymous users who have subscriptions but haven't registered yet
        anonUsersWithSubscription.push(userData);
      }
    });
    
    // Helper to get payment amount (amountTotal is in cents from Stripe)
    const getAmount = (p: any) => {
      const amt = p.amountTotal || p.amount || 0;
      // Stripe amounts are ALWAYS in cents, so always convert to dollars
      return amt / 100;
    };
    
    // Calculate metrics
    const totalRevenue = payments.reduce((sum, p) => sum + getAmount(p), 0);
    
    // Revenue by period
    const revenueToday = payments
      .filter(p => new Date(p.createdAt) >= startOfToday)
      .reduce((sum, p) => sum + getAmount(p), 0);
    
    const revenueThisWeek = payments
      .filter(p => new Date(p.createdAt) >= startOfWeek)
      .reduce((sum, p) => sum + getAmount(p), 0);
    
    const revenueThisMonth = payments
      .filter(p => new Date(p.createdAt) >= startOfMonth)
      .reduce((sum, p) => sum + getAmount(p), 0);
    
    const revenueThisYear = payments
      .filter(p => new Date(p.createdAt) >= startOfYear)
      .reduce((sum, p) => sum + getAmount(p), 0);
    
    const revenueLastMonth = payments
      .filter(p => {
        const date = new Date(p.createdAt);
        return date >= startOfLastMonth && date <= endOfLastMonth;
      })
      .reduce((sum, p) => sum + getAmount(p), 0);
    
    // MRR calculation - only count ACTIVE (paying) subscribers, not trialing
    // Trialing users haven't converted yet, so they shouldn't inflate MRR
    const activePayingSubscribers = users.filter(u => 
      u.subscriptionStatus === "active" && !u.subscriptionCancelled
    );
    
    const trialingSubscribers = users.filter(u => 
      u.subscriptionStatus === "trialing" && !u.subscriptionCancelled
    );
    
    // Billing cycle conversion constants (mathematically correct)
    const WEEKLY_TO_MONTHLY = 52 / 12; // 4.333
    const BIWEEKLY_TO_MONTHLY = 26 / 12; // 2.1667
    const FOURWEEKLY_TO_MONTHLY = 13 / 12; // 1.0833
    
    // Calculate MRR from actual paying subscribers only
    const mrr = activePayingSubscribers.reduce((sum, u) => {
      // Legacy plans
      if (u.subscriptionPlan === "weekly") return sum + (4.99 * WEEKLY_TO_MONTHLY); // ~$21.65/month
      if (u.subscriptionPlan === "monthly") return sum + 9.99;
      if (u.subscriptionPlan === "yearly") return sum + (49.99 / 12);
      // New trial plans (after trial, they pay recurring)
      // Bi-weekly = 26 cycles/year, so monthly = price * (26/12) = price * 2.1667
      if (u.subscriptionPlan === "1week" || u.subscriptionPlan === "2week") return sum + (19.99 * BIWEEKLY_TO_MONTHLY); // ~$43.31/month
      if (u.subscriptionPlan === "4week") return sum + (29.99 * FOURWEEKLY_TO_MONTHLY); // ~$32.49/month
      return sum;
    }, 0);
    
    // Projected MRR includes trialing users (if they all convert)
    const projectedMrr = trialingSubscribers.reduce((sum, u) => {
      if (u.subscriptionPlan === "1week" || u.subscriptionPlan === "2week") return sum + (19.99 * BIWEEKLY_TO_MONTHLY);
      if (u.subscriptionPlan === "4week") return sum + (29.99 * FOURWEEKLY_TO_MONTHLY);
      return sum;
    }, mrr);
    
    const arr = mrr * 12;
    const projectedArr = projectedMrr * 12;
    
    // Revenue growth rate
    const momGrowth = revenueLastMonth > 0 
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
      : "N/A";
    
    // Revenue by plan tier (including new trial plans)
    const revenueByPlan = {
      weekly: payments.filter(p => p.plan === "weekly").reduce((sum, p) => sum + getAmount(p), 0),
      monthly: payments.filter(p => p.plan === "monthly").reduce((sum, p) => sum + getAmount(p), 0),
      yearly: payments.filter(p => p.plan === "yearly").reduce((sum, p) => sum + getAmount(p), 0),
      "1week": payments.filter(p => p.plan === "1week").reduce((sum, p) => sum + getAmount(p), 0),
      "2week": payments.filter(p => p.plan === "2week").reduce((sum, p) => sum + getAmount(p), 0),
      "4week": payments.filter(p => p.plan === "4week").reduce((sum, p) => sum + getAmount(p), 0),
    };
    
    // Revenue by type (trial_subscription and trial_payment count as subscription)
    const revenueByType = {
      subscription: payments.filter(p => p.type === "subscription" || p.type === "trial_subscription" || p.type === "trial_payment" || !p.type).reduce((sum, p) => sum + getAmount(p), 0),
      coins: payments.filter(p => p.type === "coins").reduce((sum, p) => sum + getAmount(p), 0),
      reports: payments.filter(p => p.type === "report").reduce((sum, p) => sum + getAmount(p), 0),
      upsells: payments.filter(p => p.type === "upsell").reduce((sum, p) => sum + getAmount(p), 0),
    };
    
    // Subscriber counts (includes both paying and trialing)
    const totalActiveSubscribers = activePayingSubscribers.length + trialingSubscribers.length;
    const newSubscribersThisMonth = users.filter(u => {
      const startedAt = u.subscriptionStartedAt ? new Date(u.subscriptionStartedAt) : null;
      return startedAt && startedAt >= startOfMonth && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing");
    }).length;
    
    const churnedSubscribersCount = users.filter(u => u.subscriptionCancelled === true).length;
    
    // ARPU (Average Revenue Per User)
    const uniquePayingUsers = new Set(payments.map(p => p.userId)).size;
    const arpu = uniquePayingUsers > 0 ? (totalRevenue / uniquePayingUsers).toFixed(2) : "0";
    
    // LTV (simplified: ARPU * average subscription length)
    const avgSubscriptionMonths = 6; // Estimate
    const ltv = (parseFloat(arpu) * avgSubscriptionMonths).toFixed(2);
    
    // Churn rate
    const churnRate = totalActiveSubscribers + churnedSubscribersCount > 0
      ? ((churnedSubscribersCount / (totalActiveSubscribers + churnedSubscribersCount)) * 100).toFixed(1)
      : "0";
    
    const retentionRate = (100 - parseFloat(churnRate)).toFixed(1);
    
    // Payment status breakdown
    const successfulPayments = payments.filter(p => p.status === "succeeded" || !p.status).length;
    const failedPayments = payments.filter(p => p.status === "failed").length;
    const refunds = payments.filter(p => p.status === "refunded").length;
    
    // Trial conversions - use trialEndsAt since trialStartedAt may not be set
    const trialsStarted = users.filter(u => u.trialEndsAt || u.trialStartedAt).length;
    const trialsConverted = users.filter(u => (u.trialEndsAt || u.trialStartedAt) && u.subscriptionStatus === "active").length;
    const trialConversionRate = trialsStarted > 0 
      ? ((trialsConverted / trialsStarted) * 100).toFixed(1)
      : "0";
    
    // Upsell analytics - breakdown by offer type
    const upsellPayments = payments.filter(p => p.type === "upsell");
    const upsellAnalytics: { [key: string]: { count: number; revenue: number } } = {};
    
    upsellPayments.forEach(p => {
      const offers = p.offers ? p.offers.split(",").map((s: string) => s.trim()) : ["unknown"];
      const amount = getAmount(p);
      
      offers.forEach((offer: string) => {
        if (!upsellAnalytics[offer]) {
          upsellAnalytics[offer] = { count: 0, revenue: 0 };
        }
        upsellAnalytics[offer].count += 1;
        upsellAnalytics[offer].revenue += amount / offers.length; // Split revenue among offers
      });
    });
    
    // Sort upsells by revenue (highest first)
    const upsellBreakdown = Object.entries(upsellAnalytics)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
    
    // Revenue over time (last 30 days) - use proper date comparison
    const revenueOverTime: { date: string; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const dayStart = new Date(date);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dateStr = dayStart.toISOString().split("T")[0];
      const dayRevenue = payments
        .filter(p => {
          if (!p.createdAt) return false;
          const paymentDate = new Date(p.createdAt);
          return paymentDate >= dayStart && paymentDate <= dayEnd;
        })
        .reduce((sum, p) => sum + getAmount(p), 0);
      revenueOverTime.push({ date: dateStr, revenue: dayRevenue });
    }
    
    // Subscription distribution - include new trial-based plans
    const subscriptionDistribution = {
      // Legacy plans
      weekly: users.filter(u => u.subscriptionPlan === "weekly" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") && !u.subscriptionCancelled).length,
      monthly: users.filter(u => u.subscriptionPlan === "monthly" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") && !u.subscriptionCancelled).length,
      yearly: users.filter(u => u.subscriptionPlan === "yearly" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") && !u.subscriptionCancelled).length,
      // New trial-based plans
      "1week": users.filter(u => u.subscriptionPlan === "1week" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") && !u.subscriptionCancelled).length,
      "2week": users.filter(u => u.subscriptionPlan === "2week" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") && !u.subscriptionCancelled).length,
      "4week": users.filter(u => u.subscriptionPlan === "4week" && (u.subscriptionStatus === "active" || u.subscriptionStatus === "trialing") && !u.subscriptionCancelled).length,
    };
    
    // Cancelled subscribers list
    const cancelledSubscribers = users.filter(u => u.subscriptionCancelled === true);
    
    // Monthly churn rate (users who cancelled THIS MONTH)
    const churnedThisMonth = users.filter(u => {
      if (!u.subscriptionEndedAt || !u.subscriptionCancelled) return false;
      const endedAt = new Date(u.subscriptionEndedAt);
      return endedAt >= startOfMonth;
    }).length;
    const subscribersAtStartOfMonth = totalActiveSubscribers + churnedThisMonth;
    const monthlyChurnRate = subscribersAtStartOfMonth > 0 
      ? ((churnedThisMonth / subscribersAtStartOfMonth) * 100).toFixed(1)
      : "0";
    
    // Subscriber lists for tabs - merge Firebase data with Stripe data for accuracy
    // First, enrich user data with Stripe subscription info
    const enrichedUsers = users.map(u => {
      const email = (u.email || "").toLowerCase();
      const stripeSub = stripeSubscriptions.get(email);
      
      if (stripeSub) {
        // Use Stripe data as source of truth for subscription status and dates
        return {
          ...u,
          subscriptionStatus: stripeSub.status, // trialing, active, canceled, etc.
          subscriptionStartedAt: u.subscriptionStartedAt || stripeSub.created,
          trialEndsAt: stripeSub.trialEnd || u.trialEndsAt,
          currentPeriodEnd: stripeSub.currentPeriodEnd || u.currentPeriodEnd,
          stripeSubscriptionId: stripeSub.id,
          subscriptionPlan: u.subscriptionPlan || stripeSub.plan,
          cancelAtPeriodEnd: stripeSub.cancelAtPeriodEnd, // scheduled to cancel
          canceledAt: stripeSub.canceledAt, // when it was actually canceled
          subscriptionCancelled: stripeSub.status === "canceled", // override Firebase with Stripe truth
        };
      }
      return u;
    });
    
    // Recalculate counts with enriched data
    // IMPORTANT: Only include users who have a verified Stripe subscription
    // This prevents showing users with stale Firebase data who don't exist in Stripe
    
    // Active = status is "active" AND exists in Stripe
    const enrichedActivePayingSubscribers = enrichedUsers.filter(u => {
      const email = (u.email || "").toLowerCase();
      const hasStripeSubscription = stripeSubscriptions.has(email);
      return hasStripeSubscription && u.subscriptionStatus === "active";
    });
    
    // Trialing = status is "trialing" AND exists in Stripe
    const enrichedTrialingSubscribers = enrichedUsers.filter(u => {
      const email = (u.email || "").toLowerCase();
      const hasStripeSubscription = stripeSubscriptions.has(email);
      return hasStripeSubscription && u.subscriptionStatus === "trialing";
    });
    
    // Cancelled = status is "canceled" AND exists in Stripe
    const enrichedCancelledSubscribers = enrichedUsers.filter(u => {
      const email = (u.email || "").toLowerCase();
      const hasStripeSubscription = stripeSubscriptions.has(email);
      return hasStripeSubscription && u.subscriptionStatus === "canceled";
    });
    
    const activeSubscribersList = enrichedActivePayingSubscribers.map(u => ({
      id: u.id,
      email: u.email || "Unknown",
      name: u.name || "",
      plan: u.subscriptionPlan || "Unknown",
      status: u.subscriptionStatus,
      startedAt: u.subscriptionStartedAt || null,
      currentPeriodEnd: u.currentPeriodEnd || null,
    }));
    
    const trialingSubscribersList = enrichedTrialingSubscribers.map(u => ({
      id: u.id,
      email: u.email || "Unknown",
      name: u.name || "",
      plan: u.subscriptionPlan || "Unknown",
      status: u.subscriptionStatus,
      startedAt: u.subscriptionStartedAt || null,
      trialEndsAt: u.trialEndsAt || null,
    }));
    
    const cancelledSubscribersList = enrichedCancelledSubscribers.map(u => ({
      id: u.id,
      email: u.email || "Unknown",
      name: u.name || "",
      plan: u.subscriptionPlan || "Unknown",
      status: "cancelled",
      startedAt: u.subscriptionStartedAt || null,
      cancelledAt: u.canceledAt || u.subscriptionEndedAt || null,
    }));
    
    // Create a map of userId to user data for quick lookup
    const userMap = new Map<string, { email?: string; name?: string }>();
    users.forEach(u => {
      userMap.set(u.id, { email: u.email, name: u.name });
    });
    
    // Recent transactions (last 50) with user email/name
    const recentTransactions = payments.slice(0, 50).map(p => {
      const userData = userMap.get(p.userId) || {};
      return {
        id: p.id,
        date: p.createdAt,
        userId: p.userId,
        userEmail: userData.email || p.customerEmail || "Unknown",
        userName: userData.name || "Unknown",
        amount: getAmount(p),
        plan: p.plan,
        type: p.type,
        status: p.paymentStatus || p.status || "succeeded",
      };
    });
    
    return NextResponse.json({
      // Primary KPIs
      mrr: mrr.toFixed(2),
      arr: arr.toFixed(2),
      projectedMrr: projectedMrr.toFixed(2),
      projectedArr: projectedArr.toFixed(2),
      activePayingSubscribers: enrichedActivePayingSubscribers.length,
      trialingSubscribers: enrichedTrialingSubscribers.length,
      totalRevenue: totalRevenue.toFixed(2),
      revenueToday: revenueToday.toFixed(2),
      revenueThisWeek: revenueThisWeek.toFixed(2),
      revenueThisMonth: revenueThisMonth.toFixed(2),
      revenueThisYear: revenueThisYear.toFixed(2),
      revenueLastMonth: revenueLastMonth.toFixed(2),
      momGrowth,
      
      // Subscription breakdown
      revenueByPlan,
      revenueByType,
      arpu,
      ltv,
      
      // Subscriber counts
      totalActiveSubscribers: enrichedActivePayingSubscribers.length + enrichedTrialingSubscribers.length,
      newSubscribersThisMonth,
      churnedSubscribers: enrichedCancelledSubscribers.length,
      netSubscriberChange: newSubscribersThisMonth - enrichedCancelledSubscribers.length,
      
      // Churn & Retention
      churnRate,
      monthlyChurnRate,
      retentionRate,
      
      // Transaction activity
      successfulPayments,
      failedPayments,
      refunds,
      trialsStarted,
      trialsConverted,
      trialConversionRate,
      
      // Charts data
      revenueOverTime,
      subscriptionDistribution,
      
      // Upsell analytics
      upsellBreakdown,
      totalUpsellRevenue: upsellPayments.reduce((sum, p) => sum + getAmount(p), 0),
      totalUpsellCount: upsellPayments.length,
      
      // Recent transactions
      recentTransactions,
      
      // Subscriber lists for tabs
      activeSubscribersList,
      trialingSubscribersList,
      cancelledSubscribersList,
      
      // Meta
      totalPayments: payments.length,
      totalUsers: users.length,
      uniquePayingUsers,
      
      // Debug: Anonymous users with active subscriptions (paid but not registered)
      unregisteredSubscribers: anonUsersWithSubscription.length,
      
      // Stripe sync info
      stripeSubscriptionsCount: stripeSubscriptions.size,
    });
  } catch (error: any) {
    console.error("Admin revenue API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}
