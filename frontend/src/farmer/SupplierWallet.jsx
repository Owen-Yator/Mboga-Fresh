// frontend/src/farmer/SupplierWallet.jsx
import React, { useState } from "react";
import Header from "../components/FarmerComponents/Header";
import Footer from "../components/FarmerComponents/Footer";
import { useFarmerData } from "../context/FarmerDataContext"; // <-- 1. MODIFIED IMPORT
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react"; // <-- 2. Import Loader

function SupplierWallet() {
  const { user } = useAuth();
  // 3. MODIFIED: Get data from the correct context
  const { balances, transactions, handleWithdraw, unreadCount, loading } =
    useFarmerData();

  const [mpesa, setMpesa] = useState("254712345678");
  const [amount, setAmount] = useState("");

  function handleWithdrawSubmit(e) {
    e.preventDefault();
    if (!amount) {
      alert("Enter an amount to withdraw");
      return;
    }
    // ... (rest of withdrawal logic is ok for simulation) ...
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      alert("Please enter a valid amount");
      return;
    }
    if (withdrawAmount > balances.available) {
      alert("Insufficient funds");
      return;
    }
    const success = handleWithdraw(withdrawAmount, mpesa);
    if (success) {
      setAmount("");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header
        avatarUrl={user?.avatar || ""}
        userName={user?.name || "Supplier"}
        unreadCount={unreadCount} // Pass unread count
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold mb-6">Wallet & Payments</h2>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left / center: main content */}
          <section className="lg:col-span-3 space-y-6">
            {/* 4. MODIFIED: Stats cards now use dynamic 'balances' */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-6 shadow-sm flex flex-col">
                <div className="text-xs text-gray-500">Funds in Escrow</div>
                <div className="mt-4 text-2xl font-bold">
                  Ksh {balances.escrow.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm flex flex-col">
                <div className="text-xs text-gray-500">Available Balance</div>
                <div className="mt-4 text-2xl font-bold">
                  Ksh {balances.available.toLocaleString()}
                </div>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm flex flex-col">
                <div className="text-xs text-gray-500">Total Earnings</div>
                <div className="mt-4 text-2xl font-bold">
                  Ksh {balances.earnings.toLocaleString()}
                </div>
              </div>
            </div>

            {/* 5. MODIFIED: Transaction history from dynamic 'transactions' */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-lg mb-4">
                Transaction History
              </h3>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="text-center py-12 text-gray-600">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading transactions...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12 text-gray-600">
                    No transactions found.
                  </div>
                ) : (
                  <table className="w-full text-sm table-auto">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Order ID</th>
                        <th className="pb-3">Description</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((t, idx) => (
                        <tr key={t._id} className="border-t">
                          <td className="py-3 text-gray-600">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 text-gray-600">
                            {t._id.substring(18).toUpperCase()}
                          </td>
                          <td className="py-3 text-gray-600">
                            {t.items
                              .map((i) => `${i.quantity}x ${i.name}`)
                              .join(", ")}
                          </td>
                          <td
                            className={`py-3 ${
                              t.orderStatus === "Delivered"
                                ? "text-green-600"
                                : "text-gray-800"
                            }`}
                          >
                            Ksh {t.totalAmount.toLocaleString()}
                          </td>
                          <td className="py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                t.orderStatus === "Delivered"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {t.orderStatus === "Delivered"
                                ? "Released"
                                : "In Escrow"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>

          {/* Right: Withdraw panel */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
              <h4 className="font-semibold text-lg mb-4">Withdraw Funds</h4>
              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    M-Pesa Number
                  </label>
                  <input
                    value={mpesa}
                    onChange={(e) => setMpesa(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 5000"
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    max={balances.available}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Available: Ksh {balances.available.toLocaleString()}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full bg-green-500 hover:bg-green-600 text-white rounded-md py-2 font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
                  disabled={
                    !amount ||
                    parseFloat(amount) <= 0 ||
                    parseFloat(amount) > balances.available
                  }
                >
                  Withdraw Now
                </button>
                <div className="mt-4 text-sm bg-green-50 border border-green-100 p-3 rounded-md text-green-700">
                  <strong className="block">Tip:</strong>
                  M-Pesa withdrawals are simulated and will not process a real
                  payment.
                </div>
              </form>
            </div>
          </aside>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default SupplierWallet;
