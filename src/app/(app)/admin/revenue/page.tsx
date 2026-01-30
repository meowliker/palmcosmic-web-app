"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  CreditCard,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  ShieldAlert,
  Calendar,
  PieChart,
  Activity,
  UserMinus,
  UserPlus,
  Repeat,
  XCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { generateUserId } from "@/lib/user-profile";

interface RevenueData {
  mrr: string;
  arr: string;
  totalRevenue: string;
  revenueToday: string;
  revenueThisWeek: string;
  revenueThisMonth: string;
  revenueThisYear: string;
  revenueLastMonth: string;
  momGrowth: string;
  revenueByPlan: { weekly: number; monthly: number; yearly: number };
  revenueByType: { subscription: number; coins: number; reports: number; upsells: number };
  arpu: string;
  ltv: string;
  totalActiveSubscribers: number;
  newSubscribersThisMonth: number;
  churnedSubscribers: number;
  netSubscriberChange: number;
  churnRate: string;
  retentionRate: string;
  successfulPayments: number;
  failedPayments: number;
  refunds: number;
  trialsStarted: number;
  trialsConverted: number;
  trialConversionRate: string;
  revenueOverTime: { date: string; revenue: number }[];
  subscriptionDistribution: { weekly: number; monthly: number; yearly: number };
  recentTransactions: {
    id: string;
    date: string;
    userId: string;
    amount: number;
    plan: string;
    type: string;
    status: string;
  }[];
  totalPayments: number;
  totalUsers: number;
  uniquePayingUsers: number;
}

export default function AdminRevenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RevenueData | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setRefreshing(true);
      const userId = generateUserId();
      const response = await fetch(`/api/admin/revenue?userId=${userId}`);
      
      if (response.status === 403) {
        setError("Access denied. Admin privileges required.");
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error("Failed to fetch revenue data");
      }
      
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading revenue data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-white text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <button
            onClick={() => router.push("/reports")}
            className="px-6 py-2 bg-primary text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const maxRevenue = Math.max(...data.revenueOverTime.map(d => d.revenue), 1);

  return (
    <div className="min-h-screen bg-[#0A0E1A] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#1A1F2E] to-transparent px-4 pt-12 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-white">Revenue Dashboard</h1>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              <RefreshCw className={`w-5 h-5 text-white ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
          <p className="text-white/50 text-sm">Real-time revenue analytics and metrics</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 space-y-6">
        {/* Primary KPIs */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Primary KPIs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="MRR"
              value={formatCurrency(data.mrr)}
              subtitle="Monthly Recurring"
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-green-400"
            />
            <KPICard
              title="ARR"
              value={formatCurrency(data.arr)}
              subtitle="Annual Recurring"
              icon={<TrendingUp className="w-4 h-4" />}
              color="text-blue-400"
            />
            <KPICard
              title="Total Revenue"
              value={formatCurrency(data.totalRevenue)}
              subtitle="All time"
              icon={<DollarSign className="w-4 h-4" />}
              color="text-purple-400"
            />
            <KPICard
              title="MoM Growth"
              value={data.momGrowth === "N/A" ? "N/A" : `${data.momGrowth}%`}
              subtitle="vs last month"
              icon={parseFloat(data.momGrowth) >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              color={parseFloat(data.momGrowth) >= 0 ? "text-green-400" : "text-red-400"}
            />
          </div>
        </section>

        {/* Revenue by Period */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" /> Revenue by Period
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Today" value={formatCurrency(data.revenueToday)} />
            <MetricCard title="This Week" value={formatCurrency(data.revenueThisWeek)} />
            <MetricCard title="This Month" value={formatCurrency(data.revenueThisMonth)} />
            <MetricCard title="This Year" value={formatCurrency(data.revenueThisYear)} />
          </div>
        </section>

        {/* Subscription Breakdown */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Subscription Breakdown
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue by Plan */}
            <div className="bg-[#1A2235] rounded-xl p-4 border border-white/10">
              <h3 className="text-white/60 text-xs mb-3">Revenue by Plan</h3>
              <div className="space-y-3">
                <PlanBar label="Weekly" value={data.revenueByPlan.weekly} total={data.revenueByPlan.weekly + data.revenueByPlan.monthly + data.revenueByPlan.yearly} color="bg-blue-500" />
                <PlanBar label="Monthly" value={data.revenueByPlan.monthly} total={data.revenueByPlan.weekly + data.revenueByPlan.monthly + data.revenueByPlan.yearly} color="bg-purple-500" />
                <PlanBar label="Yearly" value={data.revenueByPlan.yearly} total={data.revenueByPlan.weekly + data.revenueByPlan.monthly + data.revenueByPlan.yearly} color="bg-green-500" />
              </div>
            </div>

            {/* Revenue by Type */}
            <div className="bg-[#1A2235] rounded-xl p-4 border border-white/10">
              <h3 className="text-white/60 text-xs mb-3">Revenue by Type</h3>
              <div className="space-y-3">
                <PlanBar label="Subscriptions" value={data.revenueByType.subscription} total={data.revenueByType.subscription + data.revenueByType.coins + data.revenueByType.reports + data.revenueByType.upsells} color="bg-indigo-500" />
                <PlanBar label="Coins" value={data.revenueByType.coins} total={data.revenueByType.subscription + data.revenueByType.coins + data.revenueByType.reports + data.revenueByType.upsells} color="bg-amber-500" />
                <PlanBar label="Reports" value={data.revenueByType.reports} total={data.revenueByType.subscription + data.revenueByType.coins + data.revenueByType.reports + data.revenueByType.upsells} color="bg-pink-500" />
                <PlanBar label="Upsells" value={data.revenueByType.upsells} total={data.revenueByType.subscription + data.revenueByType.coins + data.revenueByType.reports + data.revenueByType.upsells} color="bg-cyan-500" />
              </div>
            </div>
          </div>

          {/* ARPU & LTV */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <MetricCard title="ARPU" value={formatCurrency(data.arpu)} subtitle="Avg Revenue Per User" />
            <MetricCard title="LTV" value={formatCurrency(data.ltv)} subtitle="Lifetime Value" />
          </div>
        </section>

        {/* Subscriber Counts */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" /> Subscriber Counts
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KPICard
              title="Active Subscribers"
              value={data.totalActiveSubscribers.toString()}
              icon={<Users className="w-4 h-4" />}
              color="text-green-400"
            />
            <KPICard
              title="New This Month"
              value={data.newSubscribersThisMonth.toString()}
              icon={<UserPlus className="w-4 h-4" />}
              color="text-blue-400"
            />
            <KPICard
              title="Churned"
              value={data.churnedSubscribers.toString()}
              icon={<UserMinus className="w-4 h-4" />}
              color="text-red-400"
            />
            <KPICard
              title="Net Change"
              value={data.netSubscriberChange >= 0 ? `+${data.netSubscriberChange}` : data.netSubscriberChange.toString()}
              icon={data.netSubscriberChange >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              color={data.netSubscriberChange >= 0 ? "text-green-400" : "text-red-400"}
            />
          </div>
        </section>

        {/* Churn & Retention */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Repeat className="w-4 h-4" /> Churn & Retention
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricCard title="Churn Rate" value={`${data.churnRate}%`} color="text-red-400" />
            <MetricCard title="Retention Rate" value={`${data.retentionRate}%`} color="text-green-400" />
            <MetricCard title="Trials Started" value={data.trialsStarted.toString()} />
            <MetricCard title="Trial Conversion" value={`${data.trialConversionRate}%`} color="text-blue-400" />
          </div>
        </section>

        {/* Transaction Activity */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" /> Transaction Activity
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPICard
              title="Successful"
              value={data.successfulPayments.toString()}
              icon={<CheckCircle className="w-4 h-4" />}
              color="text-green-400"
            />
            <KPICard
              title="Failed"
              value={data.failedPayments.toString()}
              icon={<XCircle className="w-4 h-4" />}
              color="text-red-400"
            />
            <KPICard
              title="Refunds"
              value={data.refunds.toString()}
              icon={<RefreshCw className="w-4 h-4" />}
              color="text-amber-400"
            />
            <KPICard
              title="Conversions"
              value={data.trialsConverted.toString()}
              icon={<ArrowUpRight className="w-4 h-4" />}
              color="text-blue-400"
            />
          </div>
        </section>

        {/* Revenue Over Time Chart */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" /> Revenue Over Time (Last 30 Days)
          </h2>
          <div className="bg-[#1A2235] rounded-xl p-4 border border-white/10">
            <div className="flex items-end gap-1 h-40">
              {data.revenueOverTime.map((day, i) => (
                <div
                  key={day.date}
                  className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t relative group"
                  style={{ height: `${Math.max((day.revenue / maxRevenue) * 100, 2)}%` }}
                >
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/80 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {day.date}: {formatCurrency(day.revenue)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-white/40">
              <span>{data.revenueOverTime[0]?.date}</span>
              <span>{data.revenueOverTime[data.revenueOverTime.length - 1]?.date}</span>
            </div>
          </div>
        </section>

        {/* Subscription Distribution */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <PieChart className="w-4 h-4" /> Active Subscription Distribution
          </h2>
          <div className="bg-[#1A2235] rounded-xl p-4 border border-white/10">
            <div className="flex items-center justify-center gap-8">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {(() => {
                    const total = data.subscriptionDistribution.weekly + data.subscriptionDistribution.monthly + data.subscriptionDistribution.yearly;
                    if (total === 0) return <circle cx="18" cy="18" r="15.9" fill="none" stroke="#374151" strokeWidth="3" />;
                    
                    const weeklyPct = (data.subscriptionDistribution.weekly / total) * 100;
                    const monthlyPct = (data.subscriptionDistribution.monthly / total) * 100;
                    const yearlyPct = (data.subscriptionDistribution.yearly / total) * 100;
                    
                    let offset = 0;
                    return (
                      <>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#3B82F6" strokeWidth="3" strokeDasharray={`${weeklyPct} ${100 - weeklyPct}`} strokeDashoffset={-offset} />
                        {(() => { offset += weeklyPct; return null; })()}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#8B5CF6" strokeWidth="3" strokeDasharray={`${monthlyPct} ${100 - monthlyPct}`} strokeDashoffset={-offset} />
                        {(() => { offset += monthlyPct; return null; })()}
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#22C55E" strokeWidth="3" strokeDasharray={`${yearlyPct} ${100 - yearlyPct}`} strokeDashoffset={-offset} />
                      </>
                    );
                  })()}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white text-lg font-semibold">
                    {data.subscriptionDistribution.weekly + data.subscriptionDistribution.monthly + data.subscriptionDistribution.yearly}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-white/70 text-sm">Weekly: {data.subscriptionDistribution.weekly}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500" />
                  <span className="text-white/70 text-sm">Monthly: {data.subscriptionDistribution.monthly}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-white/70 text-sm">Yearly: {data.subscriptionDistribution.yearly}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Recent Transactions */}
        <section>
          <h2 className="text-white/70 text-sm font-medium mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Transactions
          </h2>
          <div className="bg-[#1A2235] rounded-xl border border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-white/50 text-xs font-medium px-4 py-3">Date</th>
                    <th className="text-left text-white/50 text-xs font-medium px-4 py-3">User ID</th>
                    <th className="text-left text-white/50 text-xs font-medium px-4 py-3">Type</th>
                    <th className="text-left text-white/50 text-xs font-medium px-4 py-3">Plan</th>
                    <th className="text-right text-white/50 text-xs font-medium px-4 py-3">Amount</th>
                    <th className="text-center text-white/50 text-xs font-medium px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-white/40 py-8">
                        No transactions yet
                      </td>
                    </tr>
                  ) : (
                    data.recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="text-white/70 text-sm px-4 py-3">{formatDate(tx.date)}</td>
                        <td className="text-white/50 text-xs px-4 py-3 font-mono">{tx.userId?.slice(0, 12)}...</td>
                        <td className="text-white/70 text-sm px-4 py-3 capitalize">{tx.type || "subscription"}</td>
                        <td className="text-white/70 text-sm px-4 py-3 capitalize">{tx.plan || "-"}</td>
                        <td className="text-white text-sm px-4 py-3 text-right font-medium">{formatCurrency(tx.amount || 0)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                            tx.status === "succeeded" ? "bg-green-500/20 text-green-400" :
                            tx.status === "failed" ? "bg-red-500/20 text-red-400" :
                            tx.status === "refunded" ? "bg-amber-500/20 text-amber-400" :
                            "bg-gray-500/20 text-gray-400"
                          }`}>
                            {tx.status === "succeeded" && <CheckCircle className="w-3 h-3" />}
                            {tx.status === "failed" && <XCircle className="w-3 h-3" />}
                            {tx.status === "refunded" && <RefreshCw className="w-3 h-3" />}
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Summary Stats */}
        <section className="pb-8">
          <div className="bg-[#1A2235] rounded-xl p-4 border border-white/10">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-white/40 text-xs">Total Payments</p>
                <p className="text-white text-lg font-semibold">{data.totalPayments}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Total Users</p>
                <p className="text-white text-lg font-semibold">{data.totalUsers}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Paying Users</p>
                <p className="text-white text-lg font-semibold">{data.uniquePayingUsers}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon, color }: { title: string; value: string; subtitle?: string; icon?: React.ReactNode; color?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1A2235] rounded-xl p-4 border border-white/10"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white/50 text-xs">{title}</span>
        {icon && <span className={color || "text-white/50"}>{icon}</span>}
      </div>
      <p className={`text-xl font-bold ${color || "text-white"}`}>{value}</p>
      {subtitle && <p className="text-white/40 text-xs mt-1">{subtitle}</p>}
    </motion.div>
  );
}

function MetricCard({ title, value, subtitle, color }: { title: string; value: string; subtitle?: string; color?: string }) {
  return (
    <div className="bg-[#1A2235] rounded-xl p-3 border border-white/10">
      <p className="text-white/50 text-xs mb-1">{title}</p>
      <p className={`text-lg font-semibold ${color || "text-white"}`}>{value}</p>
      {subtitle && <p className="text-white/40 text-xs">{subtitle}</p>}
    </div>
  );
}

function PlanBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/70">{label}</span>
        <span className="text-white/50">${value.toFixed(2)} ({percentage.toFixed(0)}%)</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}
