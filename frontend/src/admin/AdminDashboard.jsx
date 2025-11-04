// frontend/src/admin/AdminDashboard.jsx - FULLY DYNAMIC
import React, { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Users,
  Loader2,
  AlertTriangle,
  Scale, // <-- Correctly imported from Lucide
  Activity,
} from "lucide-react";
import Header from "../components/adminComponents/AdminHeader";
import Sidebar from "../components/adminComponents/AdminSidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"; // <-- 'Scale' is NOT in this list
import {
  fetchUserStats,
  fetchTotalEscrowBalance,
  fetchAllTransactions,
  fetchDeliveryChartData,
} from "../api/admin";

const formatKsh = (amount) =>
  `Ksh ${Number(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 0,
  })}`;

// Helper component for stat cards
const StatCard = ({
  title,
  value,
  note,
  noteColor = "text-gray-500",
  icon: Icon,
}) => (
  <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
    <div className="flex items-center justify-between">
      <p className="text-gray-600 text-sm font-medium">{title}</p>
      <Icon className={`w-5 h-5 text-gray-400`} />
    </div>
    <h2 className="text-3xl font-bold text-gray-800 mt-1">{value}</h2>
    {note && (
      <p className={`text-xs font-semibold mt-1 ${noteColor}`}>{note}</p>
    )}
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: "0",
    percentageChange: 0,
    totalTransactions: "0",
    escrowBalance: formatKsh(0),
    currentDisputes: "0", // Placeholder
    roleCounts: [],
    userGrowthText: "...",
    userGrowthColor: "text-gray-500",
  });
  const [deliveryChartData, setDeliveryChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all data in parallel
      const [userStats, escrowRes, transactionsRes, deliveryChartRes] =
        await Promise.all([
          fetchUserStats(),
          fetchTotalEscrowBalance(),
          fetchAllTransactions(),
          fetchDeliveryChartData(),
        ]);

      // Process user stats
      const userGrowthColor =
        userStats.percentageChange >= 0 ? "text-green-600" : "text-red-600";
      const userGrowthSymbol = userStats.percentageChange >= 0 ? "↑" : "↓";
      const userGrowthText = `${userGrowthSymbol}${Math.abs(
        userStats.percentageChange
      ).toFixed(1)}% this month`;

      setStats({
        totalUsers: userStats.totalUsers.toLocaleString(),
        percentageChange: userStats.percentageChange,
        roleCounts: userStats.roleCounts,
        totalTransactions: (transactionsRes || []).length.toLocaleString(),
        escrowBalance: formatKsh(escrowRes.totalEscrow || 0),
        currentDisputes: "0", // Placeholder
        userGrowthText: userGrowthText,
        userGrowthColor: userGrowthColor,
      });

      // Set chart data
      setDeliveryChartData(deliveryChartRes);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      setError("Failed to load dashboard data. Please check API status.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Process API data for role chart
  const totalRoles = stats.roleCounts.reduce((sum, r) => sum + r.count, 0) || 1;
  const roleChartData = (stats.roleCounts.length > 0 ? stats.roleCounts : [])
    .map((roleData) => ({
      role:
        roleData.role.charAt(0).toUpperCase() + roleData.role.slice(1) + "s",
      percent: parseFloat(((roleData.count / totalRoles) * 100).toFixed(1)),
      count: roleData.count,
    }))
    .filter((r) => r.count > 0); // Only show roles that have users

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />

        <main className="p-6 space-y-6">
          <h1 className="text-3xl font-bold text-stone-900">Admin Dashboard</h1>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 flex items-center gap-3 rounded-lg shadow-sm">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-emerald-600">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              Loading metrics and financial data...
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  note={stats.userGrowthText}
                  noteColor={stats.userGrowthColor}
                  icon={Users}
                />
                <StatCard
                  title="Total Transactions"
                  value={stats.totalTransactions}
                  note="All completed payments"
                  icon={Activity}
                />
                <StatCard
                  title="Escrow Balance"
                  value={stats.escrowBalance}
                  note="Funds awaiting delivery"
                  icon={DollarSign}
                />
                <StatCard
                  title="Current Disputes"
                  value={stats.currentDisputes}
                  note="Requires action"
                  icon={Scale}
                />
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Completed Deliveries (Last 7 Days)
                  </h3>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={deliveryChartData}
                        margin={{ top: 5, right: 0, left: -20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="name" stroke="#a1a1aa" fontSize={12} />
                        <YAxis
                          stroke="#a1a1aa"
                          fontSize={12}
                          allowDecimals={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#fff",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar
                          dataKey="deliveries"
                          fill="#059669"
                          name="Completed Deliveries"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-semibold text-gray-800 mb-3">
                    Users by Role
                  </h3>
                  <div className="space-y-3">
                    {roleChartData.map((item, i) => (
                      <div key={item.role}>
                        <div className="flex justify-between text-sm font-medium text-gray-700">
                          <span>{item.role}</span>
                          <span>
                            {item.percent}% ({item.count})
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2 rounded-full">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${item.percent}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
