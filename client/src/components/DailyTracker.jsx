import React, { useState } from 'react';
import { 
  Check, X, Plus, Minus, Search, Calendar, 
  MapPin, Phone, Droplets, CheckCircle2, 
  AlertCircle, ChevronRight, FileText, CheckCheck,
  TrendingUp, CreditCard, Banknote, Sparkles
} from 'lucide-react';

// Helper to shift a YYYY-MM-DD date by N days without UTC timezone skew
function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d + days);
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getTodayStr() {
  const dt = new Date();
  const year = dt.getFullYear();
  const month = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function DailyTracker({
  checklist,
  selectedDate,
  setSelectedDate,
  onUpdateDelivery,
  onMarkAllDelivered,
  onOpenCustomerBill,
  milkTypes,
  stats
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, delivered, absent, pending
  const [customQtyModal, setCustomQtyModal] = useState(null); // customer item when editing custom qty
  const [customLiters, setCustomLiters] = useState(1.0);
  const [customNote, setCustomNote] = useState('');

  // Filter checklist by search and status
  const filteredList = checklist.filter((item) => {
    const matchSearch = 
      item.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.house_no && item.house_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.phone.includes(searchTerm);

    if (!matchSearch) return false;
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const deliveredCount = checklist.filter(i => i.status === 'delivered').length;
  const absentCount = checklist.filter(i => i.status === 'absent').length;
  const pendingCount = checklist.filter(i => i.status === 'pending').length;
  const totalLitersDelivered = checklist
    .filter(i => i.status === 'delivered')
    .reduce((sum, i) => sum + (parseFloat(i.quantity_liters) || 0), 0);

  // Quick 1-click Delivered with specified liters
  const handleDeliverExact = (item, qty, label = 'Delivered') => {
    onUpdateDelivery({
      customer_id: item.customer_id,
      delivery_date: selectedDate,
      status: 'delivered',
      quantity_liters: qty,
      milk_type_id: item.milk_type_id,
      notes: `${label} (${qty}L)`
    });
  };

  // Quick 1-click Absent / Not Home (0 L)
  const handleMarkAbsent = (item) => {
    onUpdateDelivery({
      customer_id: item.customer_id,
      delivery_date: selectedDate,
      status: 'absent',
      quantity_liters: 0,
      milk_type_id: item.milk_type_id,
      notes: 'Customer absent / No milk required'
    });
  };

  // Save Custom Quantity modal
  const handleSaveCustom = () => {
    if (!customQtyModal) return;
    onUpdateDelivery({
      customer_id: customQtyModal.customer_id,
      delivery_date: selectedDate,
      status: customLiters > 0 ? 'delivered' : 'absent',
      quantity_liters: parseFloat(customLiters),
      milk_type_id: customQtyModal.milk_type_id,
      notes: customNote || `Custom quantity ${customLiters}L`
    });
    setCustomQtyModal(null);
  };

  const openCustomModal = (item) => {
    setCustomQtyModal(item);
    setCustomLiters(item.quantity_liters || item.default_quantity || 1.0);
    setCustomNote(item.notes || '');
  };

  return (
    <div className="pb-36 sm:pb-28">
      {/* Top Banner & Date Selector */}
      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-teal-600 font-semibold text-xs uppercase tracking-wider mb-1">
              <Calendar className="w-4 h-4" />
              <span>Daily Delivery Log</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Milk Attendance & Dispatch
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              1-click delivery check. Absent entries are zeroed out so bills reflect exact consumption.
            </p>
          </div>

          {/* Date Picker Control - Timezone Safe */}
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
              className="px-2.5 py-1.5 rounded-lg bg-white shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              title="Previous Day"
            >
              ← Prev
            </button>

            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-800 px-2 py-1 focus:outline-none cursor-pointer"
            />

            <button
              onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
              className="px-2.5 py-1.5 rounded-lg bg-white shadow-xs text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              title="Next Day"
            >
              Next →
            </button>

            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className="px-2.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold hover:bg-teal-100 transition-colors"
            >
              Today
            </button>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-100">
          <div className="bg-teal-50/70 p-3.5 rounded-xl border border-teal-100">
            <span className="text-[11px] font-semibold text-teal-700 uppercase">Delivered Today</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-teal-900">{deliveredCount}</span>
              <span className="text-xs text-teal-600 font-medium">/ {checklist.length} homes</span>
            </div>
          </div>

          <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-100">
            <span className="text-[11px] font-semibold text-rose-700 uppercase">Not at Home / Leave</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-rose-900">{absentCount}</span>
              <span className="text-xs text-rose-600 font-medium">(0 Liters)</span>
            </div>
          </div>

          <div className="bg-amber-50/70 p-3.5 rounded-xl border border-amber-100">
            <span className="text-[11px] font-semibold text-amber-700 uppercase">Pending Check</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-amber-900">{pendingCount}</span>
              <span className="text-xs text-amber-600 font-medium">awaiting dispatch</span>
            </div>
          </div>

          <div className="bg-slate-900 text-white p-3.5 rounded-xl">
            <span className="text-[11px] font-medium text-slate-300 uppercase">Total Milk Dispatched</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-black text-teal-400">{totalLitersDelivered.toFixed(1)}</span>
              <span className="text-xs text-slate-300 font-medium">Liters</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search house (e.g. A-102), customer name, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'All Houses', count: checklist.length },
            { id: 'pending', label: 'Pending', count: pendingCount, color: 'text-amber-700 bg-amber-50' },
            { id: 'delivered', label: 'Delivered', count: deliveredCount, color: 'text-teal-700 bg-teal-50' },
            { id: 'absent', label: 'Absent (0L)', count: absentCount, color: 'text-rose-700 bg-rose-50' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                filterStatus === tab.id ? 'bg-slate-800 text-teal-400' : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customer Delivery Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredList.map((item) => {
          const isDelivered = item.status === 'delivered';
          const isAbsent = item.status === 'absent';
          const isPending = item.status === 'pending';

          return (
            <div
              key={item.customer_id}
              className={`bg-white rounded-2xl p-4 border transition-all duration-150 relative ${
                isDelivered
                  ? 'border-teal-200/90 shadow-xs ring-1 ring-teal-500/10'
                  : isAbsent
                  ? 'border-rose-200/90 bg-rose-50/20'
                  : 'border-slate-200/80 hover:border-slate-300'
              }`}
            >
              {/* Header row: House No, Name, and Status Badge */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    item.house_no?.includes('A') ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                    item.house_no?.includes('B') ? 'bg-sky-50 text-sky-700 border border-sky-200' :
                    item.house_no?.includes('C') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                    item.house_no?.includes('D') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                    'bg-teal-50 text-teal-700 border border-teal-200'
                  }`}>
                    {item.house_no ? item.house_no.split('-')[0] : 'HM'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-900 text-base">
                        {item.house_no || 'House'}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-slate-800 text-sm">
                        {item.customer_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{item.phone}</span>
                      <span className="text-slate-300">|</span>
                      {/* Preferred Payment Mode Badge */}
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        item.preferred_payment_mode === 'upi'
                          ? 'bg-purple-50 text-purple-700 border border-purple-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {item.preferred_payment_mode === 'upi' ? <CreditCard className="w-3 h-3" /> : <Banknote className="w-3 h-3" />}
                        <span className="uppercase">{item.preferred_payment_mode || 'Cash'}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status Indicator */}
                <div>
                  {isDelivered && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100/80 text-teal-800 border border-teal-300/40">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>{item.quantity_liters}L Delivered</span>
                    </span>
                  )}
                  {isAbsent && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                      <X className="w-3.5 h-3.5 text-rose-600" />
                      <span>Absent (0L)</span>
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100/70 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pending</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Milk Type & Quota Info */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 rounded-xl p-2.5 mt-3 border border-slate-100">
                <div className="flex items-center gap-1.5 text-xs text-slate-700">
                  <Droplets className="w-3.5 h-3.5 text-teal-600" />
                  <span className="font-semibold">{item.milk_type_name}</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-500">Default: <strong>{item.default_quantity}L</strong></span>
                </div>

                <div className="text-xs font-bold text-slate-600">
                  ₹{item.price_per_liter}/L
                </div>
              </div>

              {/* Quick Delivery Action Buttons (60 FPS Fast Touch) */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-1">
                {/* 1. Default Standard Quota */}
                <button
                  onClick={() => handleDeliverExact(item, item.default_quantity, 'Standard')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-xs font-bold tap-bounce transition-all ${
                    isDelivered && item.quantity_liters === item.default_quantity
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200/80'
                  }`}
                  title={`Deliver standard ${item.default_quantity}L`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{item.default_quantity}L</span>
                </button>

                {/* 2. Quick 500 ml (0.5 L) */}
                <button
                  onClick={() => handleDeliverExact(item, 0.5, '500 ml')}
                  className={`flex items-center justify-center gap-0.5 py-2 px-1 rounded-xl text-xs font-bold tap-bounce transition-all ${
                    isDelivered && item.quantity_liters === 0.5
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                  }`}
                  title="Deliver 500 ml (0.5 Liter)"
                >
                  <span>500ml</span>
                </button>

                {/* 3. Quick Absent (0L) */}
                <button
                  onClick={() => handleMarkAbsent(item)}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-xl text-xs font-bold tap-bounce transition-all ${
                    isAbsent
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200/80'
                  }`}
                  title="Mark customer not at home / 0 Liters"
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Absent</span>
                </button>

                {/* 4. Custom / Huge Order Button */}
                <button
                  onClick={() => openCustomModal(item)}
                  className="flex items-center justify-center gap-1 py-2 px-1 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 tap-bounce transition-all"
                  title="Specify custom amount (1.5L, 2L, huge orders)"
                >
                  <span>Custom</span>
                </button>
              </div>

              {/* Bottom links: Notes & View Monthly Bill */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5 px-0.5">
                <span className="truncate max-w-[200px]">
                  {item.notes ? `📝 ${item.notes}` : 'No notes'}
                </span>
                <button
                  onClick={() => onOpenCustomerBill(item.customer_id)}
                  className="font-bold text-teal-600 hover:text-teal-700 flex items-center gap-0.5"
                >
                  <span>Monthly Bill</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredList.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-semibold text-slate-600">No customers found</p>
          <p className="text-xs text-slate-400 mt-1">Try changing your search term or filter.</p>
        </div>
      )}

      {/* STICKY BOTTOM CHECKLIST BAR (Mobile & Desktop 60 FPS Experience) */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md text-white border-t border-slate-800 shadow-sticky-bar px-4 py-3 sm:py-3.5 transition-all">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Left stats */}
          <div className="flex items-center gap-4 text-xs sm:text-sm w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-400 animate-pulse"></span>
              <span className="font-medium text-slate-300">
                Date ({selectedDate}):
              </span>
              <span className="font-extrabold text-teal-300">
                {deliveredCount} / {checklist.length} Delivered
              </span>
            </div>

            <div className="hidden xs:flex items-center gap-1.5 border-l border-slate-700 pl-3">
              <Droplets className="w-4 h-4 text-teal-400" />
              <span className="font-black text-white">{totalLitersDelivered.toFixed(1)} L</span>
            </div>

            {absentCount > 0 && (
              <span className="text-rose-400 font-semibold text-xs border-l border-slate-700 pl-3">
                {absentCount} Absent (0L)
              </span>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {pendingCount > 0 && (
              <button
                onClick={() => onMarkAllDelivered(selectedDate)}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-md shadow-teal-500/20 tap-bounce transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Mark Remaining {pendingCount} Delivered</span>
              </button>
            )}

            <button
              onClick={() => setSelectedDate(getTodayStr())}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold tap-bounce"
            >
              Reset to Today
            </button>
          </div>

        </div>
      </div>

      {/* Custom Quantity Modal (for 500ml, 1.5L, 2L, huge orders, etc.) */}
      {customQtyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Custom Milk Quantity</h3>
                <p className="text-xs text-slate-500">{customQtyModal.customer_name} ({customQtyModal.house_no})</p>
              </div>
              <button
                onClick={() => setCustomQtyModal(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                  Select Quick Pack or Liters:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0, 5.0].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setCustomLiters(qty)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        customLiters === qty
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {qty < 1 ? `${qty * 1000} ml` : `${qty} L`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exact Custom Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Or enter exact liters (Huge orders supported):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={customLiters}
                    onChange={(e) => setCustomLiters(parseFloat(e.target.value) || 0)}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                  <span className="text-sm font-bold text-slate-600">Liters</span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Delivery Note:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Festival extra 1L, left at porch"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomQtyModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustom}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 tap-bounce"
                >
                  Save Delivery ({customLiters} L)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
