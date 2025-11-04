// frontend/src/admin/ReportsAnalytics.jsx
import React, { useState, useEffect, useCallback } from "react";
import Header from "../components/adminComponents/AdminHeader";
import Sidebar from "../components/adminComponents/AdminSidebar";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  BarChart3,
  Users,
  Store,
  Truck,
  DollarSign,
  Package,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { fetchAnalyticsSummary } from "../api/admin"; // 1. Import new API

const formatKsh = (amount) =>
  `Ksh ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
  })}`;

// --- 2. Main Component ---
const ReportsAnalytics = () => {
  const [activeTab, setActiveTab] = useState("monthly");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // 3. Data fetching logic
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAnalyticsSummary(activeTab);
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
      setError(err.message || "Could not load report data.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Helper to standardize button style
  const getTabClass = (tab) =>
    `capitalize px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
      activeTab === tab
        ? "bg-emerald-600 text-white shadow-md"
        : "text-gray-700 hover:bg-gray-200"
    }`;

  // Data for the B2C vs B2B Pie Chart
  const orderTypeData = [
    {
      name: "B2C (Retail) Revenue",
      value: stats?.revenueReport.b2cRevenue || 0,
    },
    { name: "B2B (Bulk) Revenue", value: stats?.revenueReport.b2bRevenue || 0 },
  ];
  const PIE_COLORS = ["#10B981", "#059669"]; // Emerald-500, Emerald-600

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <Header />
        <main className="flex-1 p-6 overflow-y-auto">
          {/* Page Title and Filter */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <BarChart3 size={32} className="text-emerald-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Reports & Analytics
                </h1>
                <p className="text-gray-600 text-sm">
                  Track key performance indicators and trends.
                </p>
              </div>
            </div>

            <div className="flex space-x-2 bg-gray-100 p-1 rounded-xl shadow-inner">
              {["daily", "weekly", "monthly"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={getTabClass(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* 4. Main content conditional rendering */}
          {loading ? (
            <div className="text-center py-24">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
              <p className="font-semibold text-gray-600">
                Generating Reports...
              </p>
            </div>
          ) : error ? (
            <div className="text-center py-24 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <h3 className="font-bold text-red-700">Failed to load data</h3>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : (
            stats && (
              <>
                {/* --- 5. New Platform Totals Row --- */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                  <StatCard
                    title="Total Revenue"
                    value={formatKsh(stats.revenueReport.totalRevenue)}
                    icon={DollarSign}
                    color="text-emerald-600"
                    note={`For the ${stats.revenueReport.period} period`}
                  />
                  <StatCard
                    title="Total Buyers"
                    value={stats.platformTotals.totalUsers.toLocaleString()}
                    icon={Users}
                    color="text-blue-600"
                  />
                  <StatCard
                    title="Total Vendors (B2C)"
                    value={stats.platformTotals.totalVendors.toLocaleString()}
                    icon={Store}
                    color="text-indigo-600"
                  />
                  <StatCard
                    title="Total Farmers (B2B)"
                    value={stats.platformTotals.totalFarmers.toLocaleString()}
                    icon={Truck}
                    color="text-amber-600"
                  />
                </div>

                {/* KPI and Chart Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* 6. MODIFIED: Order Breakdown (Pie Chart) */}
                  <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      Revenue Breakdown ({activeTab})
                    </h2>
                    <div className="mt-4 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={orderTypeData}
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            label={(entry) =>
                              `${(
                                (entry.value /
                                  stats.revenueReport.totalRevenue) *
                                100
                              ).toFixed(0)}%`
                            }
                          >
                            {orderTypeData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatKsh(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* 7. MODIFIED: Revenue Trend (Line Chart) */}
                  <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100">
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">
                      Revenue Trend ({activeTab})
                    </h2>
                    <div className="flex items-end justify-between mb-4">
                      <p className="text-4xl font-bold text-gray-900">
                        {formatKsh(stats.revenueReport.totalRevenue)}
                      </p>
                      {/* Note: Trend % is a complex calculation, removed for now */}
                    </div>

                    <div className="mt-4 h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={stats.revenueReport.revenueChartData}
                          margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
                        >
                          <XAxis
                            dataKey="name"
                            stroke="#a1a1aa"
                            fontSize={12}
                          />
                          <YAxis
                            stroke="#a1a1aa"
                            fontSize={12}
                            tickFormatter={(val) => formatKsh(val)}
                          />
                          <Tooltip
                            formatter={(value) => [formatKsh(value), "Revenue"]}
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              fontSize: "12px",
                            }}
                          />
                          <Line
                            type="monotone"
                            dataKey="revenue"
                            stroke="#059669"
                            strokeWidth={3}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )
          )}
        </main>
      </div>
    </div>
  );
};

// 8. NEW: Helper component for the stat cards
const StatCard = ({ title, value, icon: Icon, color, note = "" }) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
    <div className="flex items-center justify-between mb-1">
      <h3 className={`text-sm font-semibold ${color}`}>{title}</h3>
      <Icon className={`w-5 h-5 ${color}`} />
    </div>
    <p className="text-3xl font-bold text-gray-900">{value}</p>
    {note && <p className="text-xs text-gray-500 mt-1">{note}</p>}
  </div>
);

export default ReportsAnalytics;
