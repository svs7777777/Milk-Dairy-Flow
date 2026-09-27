import React, { useState, useEffect } from 'react';
import { 
  Droplets, Calendar, CreditCard, Banknote, 
  CheckCircle2, XCircle, Clock, AlertCircle, 
  QrCode, Sparkles, ChevronRight, UserCheck 
} from 'lucide-react';
import { api } from '../services/api';

export default function CustomerPortal({
  customers,
  currentDate = '2026-09-26',
  currentUser
}) {
  // If logged in as customer, use their customerId, else default to first customer for preview
  const defaultCustId = currentUser?.customerId || (customers[0]?.id || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState(defaultCustId);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUpiQr, setShowUpiQr] = useState(false);

  useEffect(() => {
    if (selectedCustomerId) {
      loadReport();
    }
  }, [selectedCustomerId, currentDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerReport(selectedCustomerId, currentDate);
      if (res.success) {
        setReport(res.data);
      }
    } catch (err) {
      console.error('Customer report error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!customers || customers.length === 0) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-200">
        <p className="text-slate-600 font-semibold">No customers available in database.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Customer Switcher Bar (Useful for testing each customer's viewpoint) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-teal-600" />
          <span className="text-xs font-bold text-slate-700 uppercase">Customer Preview Mode:</span>
        </div>

        <select
          value={selectedCustomerId}
          onChange={(e) => setSelectedCustomerId(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
        >
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.house_no || 'House'}) - Cycle: {c.billing_cycle_start_day}th
            </option>
          ))}
        </select>
      </div>

      {loading || !report ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-2"></div>
          <p className="text-xs font-semibold text-slate-500">Loading milk passbook...</p>
        </div>
      ) : (
        <>
          {/* Customer Welcome & Current Cycle Summary Card */}
          <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold tracking-widest uppercase text-teal-400">
                  Customer Milk Passbook
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  Hello, {report.customer.name}! 👋
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {report.customer.house_no} • {report.customer.address}
                </p>
              </div>

              {/* Outstanding Badge */}
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-right">
                <span className="text-[11px] font-bold uppercase text-slate-300 block">Current Total Due</span>
                <span className="text-2xl sm:text-3xl font-black text-teal-300">
                  ₹{report.pricing.net_due.toFixed(2)}
                </span>
                <p className="text-[10px] text-slate-300 mt-0.5">
                  Billing cycle: {report.cycle.start_date} to {report.cycle.end_date}
                </p>
              </div>
            </div>

            {/* Advance 2-Day Notice */}
            {report.cycle.is_advance_reminder && (
              <div className="mt-6 p-3.5 rounded-2xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-between gap-3 text-xs text-amber-200">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Your monthly billing cycle ends in <strong>{report.cycle.days_until_billing} days</strong> ({report.cycle.billing_date}). Total milk consumed so far: <strong>{report.consumption.total_liters} L</strong>.
                  </span>
                </div>
              </div>
            )}

            {/* Quick 3-Tile Row */}
            <div className="grid grid-cols-3 gap-3 mt-6 pt-6 border-t border-white/10 text-center">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Liters</span>
                <span className="text-xl sm:text-2xl font-black text-white">{report.consumption.total_liters} L</span>
                <span className="text-[10px] text-teal-400 block mt-0.5">{report.customer.milk_name}</span>
              </div>

              <div className="border-x border-white/10">
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Delivered Days</span>
                <span className="text-xl sm:text-2xl font-black text-emerald-400">{report.consumption.delivery_days}</span>
                <span className="text-[10px] text-slate-300 block mt-0.5">days received</span>
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Absent (0L)</span>
                <span className="text-xl sm:text-2xl font-black text-rose-400">{report.consumption.absent_days}</span>
                <span className="text-[10px] text-slate-300 block mt-0.5">days skipped</span>
              </div>
            </div>
          </div>

          {/* Transparent Bill Breakdown */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-teal-600" />
              <span>Transparent Monthly Calculation</span>
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>Milk Rate Applied:</span>
                <strong className="text-slate-900">₹{report.customer.default_rate} / Liter</strong>
              </div>

              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>Total Milk Delivered ({report.consumption.total_liters} L × ₹{report.customer.default_rate}):</span>
                <strong className="text-slate-900">₹{report.pricing.cycle_milk_cost.toFixed(2)}</strong>
              </div>

              {report.pricing.previous_balance > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100 text-amber-700">
                  <span>Previous Month Carried Balance:</span>
                  <strong>+ ₹{report.pricing.previous_balance.toFixed(2)}</strong>
                </div>
              )}

              {report.pricing.amount_paid > 0 && (
                <div className="flex justify-between py-2 border-b border-slate-100 text-emerald-700">
                  <span>Payments Received This Cycle:</span>
                  <strong>- ₹{report.pricing.amount_paid.toFixed(2)}</strong>
                </div>
              )}

              <div className="flex justify-between pt-2 text-base font-black text-slate-900">
                <span>Total Balance Outstanding:</span>
                <span className="text-teal-700">₹{report.pricing.net_due.toFixed(2)}</span>
              </div>
            </div>

            {/* UPI Quick Pay Button */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowUpiQr(!showUpiQr)}
                className="flex-1 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-teal-600/20 tap-bounce transition-all"
              >
                <QrCode className="w-4 h-4" />
                <span>{showUpiQr ? 'Hide Payment QR' : 'Pay Now via UPI (GPay / PhonePe / Paytm)'}</span>
              </button>
            </div>

            {/* UPI QR Code Simulator */}
            {showUpiQr && (
              <div className="mt-5 p-6 rounded-2xl bg-teal-50/60 border border-teal-200 text-center animate-in fade-in duration-150">
                <p className="text-xs font-bold text-teal-900 uppercase">Scan to Pay via Any UPI App</p>
                
                {/* Simulated QR Box */}
                <div className="w-48 h-48 mx-auto my-3 bg-white p-3 rounded-2xl border-2 border-teal-500 shadow-md flex flex-col items-center justify-center">
                  <QrCode className="w-32 h-32 text-slate-800" />
                  <p className="text-[10px] font-bold text-slate-500 mt-1">amritdairy@okhdfcbank</p>
                </div>

                <p className="text-xs text-slate-600">
                  Paying: <strong>₹{report.pricing.net_due.toFixed(2)}</strong> to <strong>Amrit Dairy Farms</strong>
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Once paid, screenshot or inform dairy admin to update your payment ledger!
                </p>
              </div>
            )}
          </div>

          {/* Daily Delivery Calendar & Attendance Log (Read-Only) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <h2 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-600" />
              <span>Daily Delivery Attendance Log</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Here are all the deliveries recorded by your milkman this cycle. Days marked absent are calculated as 0 Liters.
            </p>

            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <div className="max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Liters Delivered</th>
                      <th className="py-2.5 px-3">Day Cost</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.deliveries.map((del) => (
                      <tr key={del.id} className={del.status === 'absent' ? 'bg-rose-50/40' : ''}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">{del.delivery_date}</td>
                        <td className="py-2.5 px-3">
                          {del.status === 'delivered' ? (
                            <span className="inline-flex items-center gap-1 text-teal-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-rose-700 font-bold">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" /> Absent (0L)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-black text-slate-900">{del.quantity_liters} L</td>
                        <td className="py-2.5 px-3 font-bold text-slate-800">
                          ₹{(del.quantity_liters * del.price_per_liter).toFixed(0)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400">{del.notes || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
