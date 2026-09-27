import React, { useState } from 'react';
import { 
  UserPlus, Search, Edit2, Trash2, Phone, Mail, 
  MapPin, Droplets, Calendar, CreditCard, Banknote, 
  Check, X, FileText, ChevronRight, AlertCircle, Sparkles, Plus, Layers
} from 'lucide-react';

export default function CustomerList({
  customers,
  milkTypes,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onOpenBill
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSociety, setFilterSociety] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    phone: '',
    email: '',
    society: 'Safar Villa',
    address: '',
    house_no: '',
    default_milk_type_id: milkTypes[0]?.id || 'buffalo_pure',
    default_quantity_liters: 1.0,
    custom_price_per_liter: '',
    has_second_milk: false,
    default_milk_type_2_id: 'cow_standard',
    default_quantity_2_liters: 1.0,
    custom_price_2_per_liter: '',
    delivery_time_slot: 'Morning Shift',
    billing_cycle_start_day: 1,
    preferred_payment_mode: 'cash',
    upi_id: '',
    outstanding_balance: 0.0
  };

  const [formData, setFormData] = useState(initialForm);

  // Get distinct list of societies
  const societies = Array.from(new Set(customers.map(c => c.society).filter(Boolean)));

  const filteredCustomers = customers.filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.house_no && c.house_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.society && c.society.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.phone.includes(searchTerm);

    if (!matchSearch) return false;
    if (filterSociety !== 'all' && c.society !== filterSociety) return false;
    return true;
  });

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setFormData(initialForm);
    setShowAddModal(true);
  };

  const handleOpenEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name,
      phone: c.phone,
      email: c.email || '',
      society: c.society || 'Safar Villa',
      address: c.address,
      house_no: c.house_no || '',
      default_milk_type_id: c.default_milk_type_id || 'buffalo_pure',
      default_quantity_liters: c.default_quantity_liters || 1.0,
      custom_price_per_liter: c.custom_price_per_liter || '',
      has_second_milk: Boolean(c.default_milk_type_2_id && c.default_quantity_2_liters > 0),
      default_milk_type_2_id: c.default_milk_type_2_id || 'cow_standard',
      default_quantity_2_liters: c.default_quantity_2_liters || 1.0,
      custom_price_2_per_liter: c.custom_price_2_per_liter || '',
      delivery_time_slot: c.delivery_time_slot || 'Morning Shift',
      billing_cycle_start_day: c.billing_cycle_start_day || 1,
      preferred_payment_mode: c.preferred_payment_mode || 'cash',
      upi_id: c.upi_id || '',
      outstanding_balance: c.outstanding_balance || 0.0
    });
    setShowAddModal(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      alert('Please fill in name, phone, and address');
      return;
    }

    const payload = {
      ...formData,
      default_milk_type_2_id: formData.has_second_milk ? formData.default_milk_type_2_id : null,
      default_quantity_2_liters: formData.has_second_milk ? parseFloat(formData.default_quantity_2_liters) : 0,
      custom_price_2_per_liter: formData.has_second_milk && formData.custom_price_2_per_liter ? parseFloat(formData.custom_price_2_per_liter) : null,
      custom_price_per_liter: formData.custom_price_per_liter ? parseFloat(formData.custom_price_per_liter) : null
    };

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, payload);
    } else {
      onAddCustomer(payload);
    }

    setShowAddModal(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Customer Directory</h2>
          <p className="text-xs text-slate-500">
            Real customer database supporting single & multiple milk varieties (Cow & Buffalo) per household.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 tap-bounce transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by customer name, flat/house number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={filterSociety}
            onChange={(e) => setFilterSociety(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-white focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Societies ({customers.length})</option>
            {societies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const hasDue = (cust.outstanding_balance || 0) > 0;
          const hasMultipleMilk = Boolean(cust.default_milk_type_2_id && cust.default_quantity_2_liters > 0);
          const totalDaily = cust.default_quantity_liters + (hasMultipleMilk ? cust.default_quantity_2_liters : 0);

          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: House No & Society */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 inline-block mb-1">
                      {cust.society || 'Morning Shift'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {cust.house_no} <span className="text-xs font-semibold text-slate-500">({cust.name})</span>
                    </h3>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit customer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to remove ${cust.name}?`)) {
                          onDeleteCustomer(cust.id);
                        }
                      }}
                      className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Details list */}
                <div className="space-y-2 mt-3 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>

                  {/* Milk Variety & Quantities */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5 text-teal-600" />
                        <span>Daily Milk:</span>
                      </span>
                      <span className="font-black text-teal-800 bg-teal-100/80 px-1.5 py-0.5 rounded text-[10px]">
                        {totalDaily} Liters/Day
                      </span>
                    </div>

                    {/* Milk 1 */}
                    <div className="flex items-center justify-between text-[11px] text-slate-700 pt-0.5">
                      <span>• {cust.milk_type_name || 'Milk 1'}:</span>
                      <strong className="font-bold text-slate-900">
                        {cust.default_quantity_liters} L @ ₹{cust.custom_price_per_liter || cust.milk_current_price}/L
                      </strong>
                    </div>

                    {/* Milk 2 (If customer has 2 types of milk) */}
                    {hasMultipleMilk && (
                      <div className="flex items-center justify-between text-[11px] text-teal-900 pt-0.5 border-t border-slate-200/60">
                        <span className="font-semibold flex items-center gap-1">
                          <Layers className="w-3 h-3 text-teal-600" />
                          <span>• {cust.milk_type_2_name || 'Milk 2'}:</span>
                        </span>
                        <strong className="font-bold text-teal-950">
                          {cust.default_quantity_2_liters} L @ ₹{cust.custom_price_2_per_liter || cust.milk_2_current_price}/L
                        </strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Billing: <strong>{cust.billing_cycle_start_day || 1}st</strong> of month</span>
                    </div>

                    <div className="flex items-center gap-1">
                      {cust.preferred_payment_mode === 'upi' ? (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px] flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> UPI
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-[10px] flex items-center gap-1">
                          <Banknote className="w-3 h-3" /> Cash
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom footer: Outstanding balance & Monthly Bill button */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending Due</span>
                  <span className={`text-sm font-black ${hasDue ? 'text-rose-600' : 'text-emerald-600'}`}>
                    ₹{cust.outstanding_balance ? cust.outstanding_balance.toLocaleString('en-IN') : '0.00'}
                  </span>
                </div>

                <button
                  onClick={() => onOpenBill(cust.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs tap-bounce transition-all shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Bill</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center">
          <p className="text-sm font-bold text-slate-700">No customers found</p>
          <p className="text-xs text-slate-400 mt-1">Try adding a new customer above.</p>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingCustomer ? 'Edit Customer Details' : 'Add New Milk Customer'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              
              {/* Society and House No */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Society Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Safar Villa"
                    value={formData.society}
                    onChange={(e) => setFormData({ ...formData, society: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    House / Flat No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 305 or C-302"
                    value={formData.house_no}
                    onChange={(e) => setFormData({ ...formData, house_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Customer Name & Mobile */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Sharma"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98201 30500"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Delivery Address / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 1, Block A"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* PRIMARY MILK TYPE & RATE */}
              <div className="p-3 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-teal-900 block">
                  🍼 Primary Milk Type & Rate
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Milk Variety</label>
                    <select
                      value={formData.default_milk_type_id}
                      onChange={(e) => setFormData({ ...formData, default_milk_type_id: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                    >
                      {milkTypes.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Daily Qty (L)</label>
                    <select
                      value={formData.default_quantity_liters}
                      onChange={(e) => setFormData({ ...formData, default_quantity_liters: parseFloat(e.target.value) })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                    >
                      <option value={0.5}>0.5 L</option>
                      <option value={1.0}>1.0 L</option>
                      <option value={1.5}>1.5 L</option>
                      <option value={2.0}>2.0 L</option>
                      <option value={3.0}>3.0 L</option>
                    </select>
                  </div>

                  <div className="col-span-1">
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Rate (₹/L)</label>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="e.g. 60"
                      value={formData.custom_price_per_liter}
                      onChange={(e) => setFormData({ ...formData, custom_price_per_liter: e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* SECONDARY MILK TYPE (A Customer Can Have Two Types Of Milk) */}
              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-wider text-amber-900 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Second Milk Variety</span>
                  </span>

                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-900">
                    <input
                      type="checkbox"
                      checked={formData.has_second_milk}
                      onChange={(e) => setFormData({ ...formData, has_second_milk: e.target.checked })}
                      className="rounded text-teal-600 focus:ring-teal-500"
                    />
                    <span>Customer receives 2nd milk</span>
                  </label>
                </div>

                {formData.has_second_milk && (
                  <div className="grid grid-cols-3 gap-2 pt-1 animate-in fade-in duration-150">
                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">2nd Variety</label>
                      <select
                        value={formData.default_milk_type_2_id}
                        onChange={(e) => setFormData({ ...formData, default_milk_type_2_id: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      >
                        {milkTypes.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Daily Qty (L)</label>
                      <select
                        value={formData.default_quantity_2_liters}
                        onChange={(e) => setFormData({ ...formData, default_quantity_2_liters: parseFloat(e.target.value) })}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      >
                        <option value={0.5}>0.5 L</option>
                        <option value={1.0}>1.0 L</option>
                        <option value={1.5}>1.5 L</option>
                        <option value={2.0}>2.0 L</option>
                        <option value={3.0}>3.0 L</option>
                      </select>
                    </div>

                    <div className="col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Rate 2 (₹/L)</label>
                      <input
                        type="number"
                        step="0.5"
                        placeholder="e.g. 56"
                        value={formData.custom_price_2_per_liter}
                        onChange={(e) => setFormData({ ...formData, custom_price_2_per_liter: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Mode and Outstanding Due */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Mode
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, preferred_payment_mode: 'cash' })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.preferred_payment_mode === 'cash'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      Cash
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, preferred_payment_mode: 'upi' })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formData.preferred_payment_mode === 'upi'
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      UPI
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Pending Due (₹)
                  </label>
                  <input
                    type="number"
                    step="1"
                    placeholder="0.00"
                    value={formData.outstanding_balance}
                    onChange={(e) => setFormData({ ...formData, outstanding_balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 tap-bounce"
                >
                  {editingCustomer ? 'Update Customer' : 'Save to Database'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
