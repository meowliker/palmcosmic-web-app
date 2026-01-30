import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";

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
    
    // Fetch all users for subscriber data
    const usersSnapshot = await adminDb.collection("users").get();
    const users: any[] = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, ...doc.data() });
    });
    
    // Helper to get payment amount (amountTotal is in cents from Stripe)
    const getAmount = (p: any) => {
      const amt = p.amountTotal || p.amount || 0;
      // If amount is in cents (> 100), convert to dollars
      return amt > 100 ? amt / 100 : amt;
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
    
    // MRR calculation (active subscriptions)
    const activeSubscribers = users.filter(u => 
      u.subscriptionStatus === "active" && !u.subscriptionCancelled
    );
    
    const mrr = activeSubscribers.reduce((sum, u) => {
      if (u.subscriptionPlan === "weekly") return sum + (4.99 * 4); // Weekly to monthly
      if (u.subscriptionPlan === "monthly") return sum + 9.99;
      if (u.subscriptionPlan === "yearly") return sum + (49.99 / 12);
      return sum;
    }, 0);
    
    const arr = mrr * 12;
    
    // Revenue growth rate
    const momGrowth = revenueLastMonth > 0 
      ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth * 100).toFixed(1)
      : "N/A";
    
    // Revenue by plan tier
    const revenueByPlan = {
      weekly: payments.filter(p => p.plan === "weekly").reduce((sum, p) => sum + getAmount(p), 0),
      monthly: payments.filter(p => p.plan === "monthly").reduce((sum, p) => sum + getAmount(p), 0),
      yearly: payments.filter(p => p.plan === "yearly").reduce((sum, p) => sum + getAmount(p), 0),
    };
    
    // Revenue by type
    const revenueByType = {
      subscription: payments.filter(p => p.type === "subscription" || !p.type).reduce((sum, p) => sum + getAmount(p), 0),
      coins: payments.filter(p => p.type === "coins").reduce((sum, p) => sum + getAmount(p), 0),
      reports: payments.filter(p => p.type === "report").reduce((sum, p) => sum + getAmount(p), 0),
      upsells: payments.filter(p => p.type === "upsell").reduce((sum, p) => sum + getAmount(p), 0),
    };
    
    // Subscriber counts
    const totalActiveSubscribers = activeSubscribers.length;
    const newSubscribersThisMonth = users.filter(u => {
      const startedAt = u.subscriptionStartedAt ? new Date(u.subscriptionStartedAt) : null;
      return startedAt && startedAt >= startOfMonth && u.subscriptionStatus === "active";
    }).length;
    
    const churnedSubscribers = users.filter(u => u.subscriptionCancelled === true).length;
    
    // ARPU (Average Revenue Per User)
    const uniquePayingUsers = new Set(payments.map(p => p.userId)).size;
    const arpu = uniquePayingUsers > 0 ? (totalRevenue / uniquePayingUsers).toFixed(2) : "0";
    
    // LTV (simplified: ARPU * average subscription length)
    const avgSubscriptionMonths = 6; // Estimate
    const ltv = (parseFloat(arpu) * avgSubscriptionMonths).toFixed(2);
    
    // Churn rate
    const churnRate = totalActiveSubscribers + churnedSubscribers > 0
      ? ((churnedSubscribers / (totalActiveSubscribers + churnedSubscribers)) * 100).toFixed(1)
      : "0";
    
    const retentionRate = (100 - parseFloat(churnRate)).toFixed(1);
    
    // Payment status breakdown
    const successfulPayments = payments.filter(p => p.status === "succeeded" || !p.status).length;
    const failedPayments = payments.filter(p => p.status === "failed").length;
    const refunds = payments.filter(p => p.status === "refunded").length;
    
    // Trial conversions
    const trialsStarted = users.filter(u => u.trialStartedAt).length;
    const trialsConverted = users.filter(u => u.trialStartedAt && u.subscriptionStatus === "active").length;
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
    
    // Revenue over time (last 30 days)
    const revenueOverTime: { date: string; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayRevenue = payments
        .filter(p => p.createdAt && p.createdAt.startsWith(dateStr))
        .reduce((sum, p) => sum + getAmount(p), 0);
      revenueOverTime.push({ date: dateStr, revenue: dayRevenue });
    }
    
    // Subscription distribution
    const subscriptionDistribution = {
      weekly: users.filter(u => u.subscriptionPlan === "weekly" && u.subscriptionStatus === "active").length,
      monthly: users.filter(u => u.subscriptionPlan === "monthly" && u.subscriptionStatus === "active").length,
      yearly: users.filter(u => u.subscriptionPlan === "yearly" && u.subscriptionStatus === "active").length,
    };
    
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
      totalActiveSubscribers,
      newSubscribersThisMonth,
      churnedSubscribers,
      netSubscriberChange: newSubscribersThisMonth - churnedSubscribers,
      
      // Churn & Retention
      churnRate,
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
      
      // Meta
      totalPayments: payments.length,
      totalUsers: users.length,
      uniquePayingUsers,
    });
  } catch (error: any) {
    console.error("Admin revenue API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}
