import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, Droplets, CreditCard, Banknote, 
  Send, Printer, CheckCircle2, AlertTriangle, 
  Clock, ArrowRight, History, Sparkles, ChevronDown, ChevronUp, Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';

export default function BillingModal({
  customerId,
  onClose,
  onPaymentSuccess,
  currentDate = '2026-09-27'
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPayForm, setShowPayForm] = useState(false);
  const [showDeliveryHistory, setShowDeliveryHistory] = useState(false);
  const [billCycleMonth, setBillCycleMonth] = useState('2026-08-31'); // August 2026 or September 2026
  
  // Payment state
  const [payAmount, setPayAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('cash'); // cash or upi
  const [transRef, setTransRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const fetchReport = async (dateParam) => {
    try {
      setLoading(true);
      const targetDate = dateParam || billCycleMonth;
      const res = await api.getCustomerReport(customerId, targetDate);
      if (res.success) {
        setReport(res.data);
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
      fetchReport(billCycleMonth);
    }
  }, [customerId, billCycleMonth]);

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
        payment_date: billCycleMonth
      });

      if (res.success) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
        await fetchReport(billCycleMonth);
        setShowPayForm(false);
        if (onPaymentSuccess) onPaymentSuccess();
      }
    } catch (err) {
      alert('Error recording payment: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate WhatsApp Message text with multi-milk breakdown
  const generateWhatsAppMessage = () => {
    if (!report) return '';
    const { customer, cycle, consumption, pricing } = report;

    let milkSection = `🍼 *Milk Type:* ${customer.milk_name}\n`;
    if (consumption.milk_breakdown && consumption.milk_breakdown.length > 1) {
      milkSection = `🍼 *Milk Breakdown:*\n` + 
        consumption.milk_breakdown.map(m => `  • ${m.milk_name}: ${m.liters}L @ ₹${m.price_per_liter}/L = ₹${m.amount}`).join('\n') + `\n`;
    }

    return `🥛 *${customer.house_no} (${customer.name}) - Milk Bill Statement*
--------------------------------
📅 *Cycle:* ${cycle.start_date} to ${cycle.end_date}
🏡 *House No:* ${customer.house_no || 'N/A'}
${milkSection}📊 *Total Milk Consumed:* ${consumption.total_liters} Liters
✅ *Days Received:* ${consumption.delivery_days} days
❌ *Days Absent (0L):* ${consumption.absent_days} days
--------------------------------
💰 *Current Milk Bill:* ₹${pricing.cycle_milk_cost}
➕ *Previous Due:* ₹${pricing.previous_balance}
💳 *Total Amount Payable:* ₹${pricing.total_payable}
💵 *Amount Paid:* ₹${pricing.amount_paid}
⚠️ *Net Balance Due:* ₹${pricing.net_due}
--------------------------------
Payment: ${customer.preferred_payment_mode === 'upi' ? 'UPI Accepted' : 'Cash or UPI'}
Kindly clear your pending bill. Thank you! 🙏`;
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
        <div className="bg-white p-8 rounded-3xl text-center shadow-2xl">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-teal-600 mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-slate-700">Calculating customer cycle & bill...</p>
        </div>
      </div>
    );
  }

  const { customer, cycle, consumption, pricing, deliveries, payments } = report;
  const isPending = pricing.net_due > 0;
  const hasMultipleMilk = consumption.milk_breakdown && consumption.milk_breakdown.length > 1;

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
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold">
                  {customer.society}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                📞 {customer.phone} • {customer.address}
              </p>
            </div>
          </div>

          {/* Month Selector & Cycle Pill */}
          <div className="mt-4 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setBillCycleMonth('2026-08-31')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  billCycleMonth.startsWith('2026-08')
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                August 2026 Bill
              </button>
              <button
                type="button"
                onClick={() => setBillCycleMonth('2026-09-27')}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  billCycleMonth.startsWith('2026-09')
                    ? 'bg-teal-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                September 2026 Bill
              </button>
            </div>

            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-teal-300" />
              <span>Period: <strong>{cycle.start_date} to {cycle.end_date}</strong></span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* 3 Metric Cards: Liters, Days, Absent */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] font-bold uppercase text-slate-500">Total Milk</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-slate-900">
                  {consumption.total_liters}
                </span>
                <span className="text-xs font-semibold text-slate-500">Liters</span>
              </div>
            </div>

            <div className="bg-teal-50/70 p-3.5 rounded-2xl border border-teal-100 text-center">
              <span className="text-[10px] font-bold uppercase text-teal-700">Days Delivered</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-teal-900">
                  {hasMultipleMilk ? `${consumption.delivery_days / 2}` : consumption.delivery_days}
                </span>
                <span className="text-xs font-semibold text-teal-600">days</span>
              </div>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100 text-center">
              <span className="text-[10px] font-bold uppercase text-rose-700">Days Absent</span>
              <div className="flex items-baseline justify-center gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-rose-900">
                  {consumption.absent_days}
                </span>
                <span className="text-xs font-semibold text-rose-600">days</span>
              </div>
            </div>
          </div>

          {/* Pricing & Itemized Milk Breakdown */}
          <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-700 uppercase">Statement Calculation</span>
              <span className="text-xs font-semibold text-teal-700">
                {hasMultipleMilk ? 'Multiple Milk Varieties' : `${customer.milk_name} (@ ₹${customer.default_rate}/L)`}
              </span>
            </div>

            {/* ITEMIZED MILK BREAKDOWN (For Customers with Two Types of Milk, e.g. C-302) */}
            {hasMultipleMilk ? (
              <div className="mt-3 space-y-2 pb-3 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  🍼 Itemized Milk Breakdown
                </span>
                {consumption.milk_breakdown.map((item) => (
                  <div
                    key={item.milk_type_id}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-200 shadow-2xs"
                  >
                    <div>
                      <strong className="text-xs text-slate-900 font-extrabold">{item.milk_name}</strong>
                      <p className="text-[11px] text-slate-500">
                        {item.liters} Liters @ ₹{item.price_per_liter} / Liter
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">₹{item.amount.toLocaleString('en-IN')}</span>
                      <span className="text-[10px] text-amber-700 block font-semibold">Pending</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {/* Total Summary */}
            <div className="space-y-2 mt-3 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Cycle Milk Subtotal:</span>
                <span className="font-semibold text-slate-900">₹{pricing.cycle_milk_cost.toFixed(2)}</span>
              </div>

              {pricing.previous_balance > 0 && (
                <div className="flex justify-between text-amber-700">
                  <span>Previous Unpaid Balance:</span>
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
                    {isPending ? '⚠️ Net Pending Balance' : '✅ Bill Paid in Full'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Mode: {customer.preferred_payment_mode === 'upi' ? 'UPI' : 'Cash'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black">₹{pricing.net_due.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Row: Record Payment & WhatsApp Share */}
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

          <div className="flex justify-end">
            <button
              onClick={openWhatsAppDirect}
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <span>Open in WhatsApp Web / App →</span>
            </button>
          </div>

          {/* Collapsible Payment Entry Form */}
          {showPayForm && (
            <form onSubmit={handleRecordPayment} className="p-4 rounded-2xl bg-teal-50/60 border border-teal-200 space-y-3 animate-in fade-in duration-150">
              <h4 className="text-xs font-bold uppercase text-teal-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>Enter Payment Received</span>
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Amount (₹) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    placeholder="e.g. 1860"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Payment Mode *</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                  >
                    <option value="cash">Cash Received</option>
                    <option value="upi">UPI / Online Bank</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Notes / Receipt Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Paid in cash on delivery"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowPayForm(false)}
                  className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs tap-bounce"
                >
                  {isSubmitting ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          )}

          {/* Toggle Deliveries History */}
          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={() => setShowDeliveryHistory(!showDeliveryHistory)}
              className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900 py-2"
            >
              <div className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>Daily Delivery Register ({deliveries.length} days)</span>
              </div>
              {showDeliveryHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {showDeliveryHistory && (
              <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1 animate-in fade-in duration-150">
                {deliveries.map((del) => (
                  <div
                    key={del.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">{del.delivery_date}</span>
                      <span className="text-[11px] text-slate-500 ml-2">
                        {del.milk_name} ({del.quantity_liters}L @ ₹{del.price_per_liter}/L)
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      del.status === 'delivered' ? 'bg-teal-100 text-teal-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {del.status === 'delivered' ? `${del.quantity_liters}L Delivered` : 'Absent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
