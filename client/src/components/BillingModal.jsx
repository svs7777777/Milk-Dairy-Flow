import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Droplets, CreditCard, Banknote, 
  Send, Printer, CheckCircle2, AlertTriangle, 
  Clock, ArrowRight, History, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function BillingModal({
  customerId,
  onClose,
  onPaymentSuccess,
  currentDate = '2026-09-26'
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);
  
  // Payment state
  const [payAmount, setPayAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // cash or upi
  const [transRef, setTransRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerReport(customerId, currentDate);
      if (res.success) {
        setReport(res.data);
        // Default payment amount to net due
        setPayAmount(res.data.pricing.net_due > 0 ? res.data.pricing.net_due.toString() : '');
        setPaymentMode(res.data.customer.preferred_payment_mode || 'cash');
      }
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (customerId) {
      fetchReport();
    }
  }, [customerId, currentDate]);

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) return;

    try {
      setIsSubmitting(true);
      const res = await api.recordPayment({
        customer_id: customerId,
        amount: parseFloat(payAmount),
        payment_mode: paymentMode,
        transaction_ref: transRef,
        notes: payNotes,
        payment_date: currentDate
      });

      if (res.success) {
        // Trigger celebratory confetti
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
        await fetchReport();
        setShowPayForm(false);
        if (onPaymentSuccess) onPaymentSuccess();
      }
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate WhatsApp Message text
  const generateWhatsAppMessage = () => {
    if (!report) return '';
    const { customer, cycle, consumption, pricing } = report;
    return `🥛 *${customer.name} - Milk Bill Statement*
--------------------------------
📅 *Cycle:* ${cycle.start_date} to ${cycle.end_date}
🏡 *House No:* ${customer.house_no || 'N/A'}
🍼 *Milk Type:* ${customer.milk_name}
📊 *Total Milk Consumed:* ${consumption.total_liters} Liters
✅ *Days Received:* ${consumption.delivery_days} days
❌ *Days Absent (0L):* ${consumption.absent_days} days
--------------------------------
💰 *Current Milk Bill:* ₹${pricing.cycle_milk_cost}
➕ *Previous Due:* ₹${pricing.previous_balance}
💳 *Total Amount Payable:* ₹${pricing.total_payable}
💵 *Amount Paid:* ₹${pricing.amount_paid}
⚠️ *Net Balance Due:* ₹${pricing.net_due}
--------------------------------
Mode: ${customer.preferred_payment_mode === 'upi' ? 'UPI Accepted' : 'Cash or UPI'}
Kindly clear your pending balance. Thank you! 🙏`;
  };

  const copyWhatsAppText = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  const openWhatsAppDirect = () => {
    if (!report) return;
    let cleanPhone = report.customer.phone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '91' + cleanPhone;
    }
    const text = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank');
  };

  if (loading || !report) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
        <div className="bg-white p-8 rounded-3xl text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">Calculating customer cycle & bill...</p>
        </div>
      </div>
    );
  }

  const { customer, cycle, consumption, pricing, deliveries, payments } = report;
  const isPending = pricing.net_due > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 my-auto overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 font-black text-lg">
              {customer.house_no ? customer.house_no.split('-')[0] : 'HM'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white">{customer.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold">
                  {customer.house_no}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                📞 {customer.phone} • {customer.address}
              </p>
            </div>
          </div>

          {/* Cycle & Billing Dates Pill */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <span className="text-slate-300">Billing Cycle:</span>
              <strong className="text-white">{cycle.start_date} to {cycle.end_date}</strong>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Next Bill Date: <strong>{cycle.billing_date}</strong></span>
              {cycle.days_until_billing >= 0 && (
                <span className="text-[10px] text-teal-300 font-bold ml-1">
                  ({cycle.days_until_billing} days left)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Advance 2-Day Reminder Alert Notice if triggered */}
        {cycle.is_advance_reminder && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Advance 2-Day Reminder:</strong> Billing cycle concludes on {cycle.billing_date}. Total consumption: <strong>{consumption.total_liters} Liters</strong>.
              </span>
            </div>
            <span className="font-bold uppercase tracking-wider text-[10px] bg-amber-200 px-2 py-0.5 rounded-md">
              Pending Alert
            </span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* 3 Metric Cards: Liters, Days, Rate */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500">Milk Consumed</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {consumption.total_liters}
                </span>
                <span className="text-xs font-semibold text-slate-500">Liters</span>
              </div>
            </div>

            <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-100 text-center">
              <span className="text-[10px] font-bold uppercase text-teal-700">Delivered Days</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-teal-900">
                  {consumption.delivery_days}
                </span>
                <span className="text-xs font-semibold text-teal-600">days</span>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-700">Days Absent (0L)</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-rose-900">
                  {consumption.absent_days}
                </span>
                <span className="text-xs font-semibold text-rose-600">skipped</span>
              </div>
            </div>
          </div>

          {/* Pricing & Balance Calculation Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">Billing Calculation</span>
              <span className="text-xs font-semibold text-teal-700">
                {customer.milk_name} (@ ₹{customer.default_rate}/L)
              </span>
            </div>

            <div className="space-y-2.5 mt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Current Cycle Milk ({consumption.total_liters} L × ₹{customer.default_rate}):</span>
                <span className="font-semibold text-slate-900">₹{pricing.cycle_milk_cost.toFixed(2)}</span>
              </div>

              {pricing.previous_balance > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Previous Unpaid Balance (Rolled over):</span>
                  <span className="font-bold">+ ₹{pricing.previous_balance.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between font-bold text-slate-800 pt-2 border-t border-slate-200/80">
                <span>Total Amount Payable:</span>
                <span>₹{pricing.total_payable.toFixed(2)}</span>
              </div>

              {pricing.amount_paid > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Total Payments Received:</span>
                  <span>- ₹{pricing.amount_paid.toFixed(2)}</span>
                </div>
              )}

              {/* Net Balance Highlight Box */}
              <div className={`mt-3 p-3.5 rounded-xl flex items-center justify-between ${
                isPending ? 'bg-rose-50 border border-rose-200 text-rose-900' : 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              }`}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider">
                    {isPending ? '⚠️ Net Pending Balance' : '✅ Fully Cleared'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Preferred: {customer.preferred_payment_mode === 'upi' ? 'UPI' : 'Cash'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">₹{pricing.net_due.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row: Collect Payment & WhatsApp Share */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => setShowPayForm(!showPayForm)}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/20 tap-bounce transition-all"
            >
              <CreditCard className="w-4 h-4" />
              <span>{showPayForm ? 'Hide Payment Form' : 'Record Payment (Cash/UPI)'}</span>
            </button>

            <button
              onClick={copyWhatsAppText}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 tap-bounce transition-all"
            >
              <Send className="w-4 h-4" />
              <span>{copiedNotice ? '✓ Copied Bill to Clipboard!' : 'Copy WhatsApp Bill'}</span>
            </button>
          </div>

          {/* Direct WhatsApp Message Link */}
          <div className="flex justify-end">
            <button
              onClick={openWhatsAppDirect}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>Open in WhatsApp Web / App →</span>
            </button>
          </div>

          {/* Partial Payment Collection Form */}
          {showPayForm && (
            <form onSubmit={handleRecordPayment} className="bg-teal-50/60 p-4 sm:p-5 rounded-2xl border border-teal-200 animate-in fade-in duration-150">
              <h4 className="text-sm font-bold text-teal-900 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-teal-600" />
                <span>Receive Payment (Partial Payments Supported)</span>
              </h4>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Amount Paying (₹):
                    </label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold text-base text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Remaining balance will automatically roll over!
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Payment Mode:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('cash')}
                        className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                          paymentMode === 'cash'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <Banknote className="w-3.5 h-3.5" />
                        <span>Cash</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMode('upi')}
                        className={`py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                          paymentMode === 'upi'
                            ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>UPI</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Reference / UPI Txn ID (Optional):
                    </label>
                    <input
                      type="text"
                      value={transRef}
                      onChange={(e) => setTransRef(e.target.value)}
                      placeholder="e.g. UPI-9283749"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Notes (Optional):
                    </label>
                    <input
                      type="text"
                      value={payNotes}
                      onChange={(e) => setPayNotes(e.target.value)}
                      placeholder="e.g. Paid part, balance on 5th"
                      className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md tap-bounce transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-teal-400" />
                  <span>Confirm & Save Payment of ₹{payAmount || '0'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Toggleable Delivery Day-by-Day Calendar Log */}
          <div>
            <button
              onClick={() => setShowDeliveryHistory(!showDeliveryHistory)}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            >
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
                <span>View Exact Day-by-Day Delivery History ({deliveries.length} entries)</span>
              </div>
              {showDeliveryHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDeliveryHistory && (
              <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden animate-in fade-in duration-150">
                <div className="max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Liters</th>
                        <th className="py-2.5 px-3">Rate</th>
                        <th className="py-2.5 px-3">Day Total</th>
                        <th className="py-2.5 px-3">Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {deliveries.map((del) => (
                        <tr key={del.id} className={del.status === 'absent' ? 'bg-rose-50/30' : ''}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{del.delivery_date}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              del.status === 'delivered' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {del.status === 'delivered' ? 'Delivered' : 'Absent (0L)'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{del.quantity_liters} L</td>
                          <td className="py-2 px-3 text-slate-600">₹{del.price_per_liter}</td>
                          <td className="py-2 px-3 font-bold text-slate-900">
                            ₹{(del.quantity_liters * del.price_per_liter).toFixed(0)}
                          </td>
                          <td className="py-2 px-3 text-slate-400 truncate max-w-[120px]">{del.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Previous Payments History */}
          {payments.length > 0 && (
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase block mb-2">
                Recent Payments Made
              </span>
              <div className="space-y-1.5">
                {payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs py-1 px-2 bg-white rounded-lg border border-slate-100">
                    <span className="text-slate-600">{p.payment_date}</span>
                    <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                      {p.payment_mode}
                    </span>
                    <span className="font-bold text-emerald-600">₹{p.amount.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Invoice</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
