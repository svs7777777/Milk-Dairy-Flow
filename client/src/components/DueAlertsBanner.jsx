import React from 'react';
import { 
  Bell, AlertTriangle, Calendar, Clock, 
  Send, Phone, X, CheckCircle2, ChevronRight, Droplets 
} from 'lucide-react';

export default function DueAlertsBanner({
  alertsData,
  onOpenCustomerBill,
  onClose
}) {
  if (!alertsData) return null;

  const { cycle_ending_soon, pending_collections, is_10th_reminder_active, is_after_10th_overdue, total_pending_amount } = alertsData;
  const hasAlerts = cycle_ending_soon?.length > 0 || pending_collections?.length > 0 || is_10th_reminder_active;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold">Billing & Collection Reminders</h3>
              <p className="text-xs text-slate-400">
                Total Uncollected: <strong className="text-rose-400">₹{total_pending_amount.toFixed(2)}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          
          {/* 10th of Month Collection Notice */}
          {is_10th_reminder_active && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>🔔 10th Date Monthly Bill Collection Alert!</span>
              </div>
              <p className="text-xs text-amber-700 mt-1">
                Today is the 10th of the month. Please review all monthly bills and collect outstanding payments from customers.
              </p>
            </div>
          )}

          {/* SECTION 1: Advance 2-Day Reminders (e.g. Sep 26 / Oct 26 Cycle Ending Soon) */}
          {cycle_ending_soon?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-teal-800 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-teal-600" />
                  <span>2-Day Advance Billing Alerts ({cycle_ending_soon.length})</span>
                </h4>
                <span className="text-[10px] text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                  Cycle Ending Soon
                </span>
              </div>

              <div className="space-y-2.5">
                {cycle_ending_soon.map((item) => (
                  <div
                    key={item.customer_id}
                    className="p-3.5 rounded-2xl bg-teal-50/50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-900 text-sm">{item.customer_name}</span>
                        <span className="text-xs font-bold text-teal-700">({item.house_no})</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Droplets className="w-3 h-3 text-teal-500" />
                          <span>Consumption: <strong>{item.total_liters} Liters</strong></span>
                        </span>
                        <span>•</span>
                        <span>Bill: <strong>₹{item.total_bill}</strong></span>
                        <span>•</span>
                        <span className="text-rose-600 font-bold">Pending: ₹{item.net_due}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cycle ends in <strong>{item.days_left} days</strong> (Billing Date: {item.billing_date})
                      </p>
                    </div>

                    <button
                      onClick={() => onOpenCustomerBill(item.customer_id)}
                      className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-xs tap-bounce shrink-0"
                    >
                      <span>View & Collect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 2: Outstanding / Overdue Unpaid Balances */}
          {pending_collections?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Pending Dues to Collect ({pending_collections.length})</span>
                </h4>
                <span className="text-[10px] text-rose-700 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Unpaid
                </span>
              </div>

              <div className="space-y-2">
                {pending_collections.map((item) => (
                  <div
                    key={item.customer_id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{item.customer_name}</span>
                        <span className="text-slate-500 text-xs">({item.house_no})</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Prefers: <strong className="uppercase">{item.preferred_payment_mode}</strong> • Cycle Day: {item.billing_day}th
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-rose-600">₹{item.net_due.toFixed(2)}</span>
                      <button
                        onClick={() => onOpenCustomerBill(item.customer_id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                      >
                        Collect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!hasAlerts && (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-teal-500 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">All Collections Up to Date!</p>
              <p className="text-xs text-slate-400 mt-1">No advance alerts or overdue payments right now.</p>
            </div>
          )}

        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
