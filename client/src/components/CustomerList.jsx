import React, { useState } from 'react';
import { 
  UserPlus, Search, Edit2, Trash2, Phone, Mail, 
  MapPin, Droplets, Calendar, CreditCard, Banknote, 
  Check, X, FileText, ChevronRight, AlertCircle, Sparkles 
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
  const [filterMilkType, setFilterMilkType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    phone: '',
    email: '',
    address: '',
    house_no: '',
    default_milk_type_id: milkTypes[0]?.id || 'cow_standard',
    default_quantity_liters: 1.0,
    delivery_time_slot: 'Morning',
    billing_cycle_start_day: 1, // e.g. 26 or 1
    preferred_payment_mode: 'cash', // 'cash' or 'upi'
    upi_id: '',
    outstanding_balance: 0.0
  };

  const [formData, setFormData] = useState(initialForm);

  const filteredCustomers = customers.filter(c => {
    const matchSearch = 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.house_no && c.house_no.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.phone.includes(searchTerm);

    if (!matchSearch) return false;
    if (filterMilkType === 'all') return true;
    return c.default_milk_type_id === filterMilkType;
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
      address: c.address,
      house_no: c.house_no || '',
      default_milk_type_id: c.default_milk_type_id,
      default_quantity_liters: c.default_quantity_liters,
      delivery_time_slot: c.delivery_time_slot || 'Morning',
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

    if (editingCustomer) {
      onUpdateCustomer(editingCustomer.id, formData);
    } else {
      onAddCustomer(formData);
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
            Real-time customer database with custom billing cycle start days (e.g. 26th), milk types & payment modes.
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
            placeholder="Search by customer name, house number, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterMilkType}
            onChange={(e) => setFilterMilkType(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-teal-500"
          >
            <option value="all">All Milk Types</option>
            {milkTypes.map(m => (
              <option key={m.id} value={m.id}>{m.name} (₹{m.price_per_liter}/L)</option>
            ))}
          </select>
        </div>
      </div>

      {/* Customer Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const hasDue = cust.outstanding_balance > 0;
          return (
            <div
              key={cust.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-bold text-xs">
                      {cust.house_no ? cust.house_no.split('-')[0] : 'HM'}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{cust.name}</h3>
                      <p className="text-xs font-bold text-teal-600">{cust.house_no || 'House'}</p>
                    </div>
                  </div>

                  {/* Actions: Edit / Delete */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                      title="Edit customer details"
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
                <div className="space-y-2 mt-4 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{cust.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.address}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Droplets className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                    <span>
                      <strong>{cust.default_quantity_liters} L</strong> of {cust.milk_type_name || 'Milk'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Billing Cycle: <strong>{cust.billing_cycle_start_day}th</strong> of month</span>
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
                    ₹{cust.outstanding_balance?.toFixed(2) || '0.00'}
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

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    House / Flat No *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House A-102"
                    value={formData.house_no}
                    onChange={(e) => setFormData({ ...formData, house_no: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mobile Phone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="customer@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Delivery Address / Landmark *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 2, Lane 4, Near Temple"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Milk Type and Daily Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Milk Variety
                  </label>
                  <select
                    value={formData.default_milk_type_id}
                    onChange={(e) => setFormData({ ...formData, default_milk_type_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                  >
                    {milkTypes.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} (₹{m.price_per_liter}/L)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Daily Qty (Liters)
                  </label>
                  <select
                    value={formData.default_quantity_liters}
                    onChange={(e) => setFormData({ ...formData, default_quantity_liters: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value={0.5}>0.5 L (500 ml)</option>
                    <option value={1.0}>1.0 L</option>
                    <option value={1.5}>1.5 L</option>
                    <option value={2.0}>2.0 L</option>
                    <option value={2.5}>2.5 L</option>
                    <option value={3.0}>3.0 L</option>
                    <option value={4.0}>4.0 L (Huge Order)</option>
                    <option value={5.0}>5.0 L (Huge Order)</option>
                  </select>
                </div>
              </div>

              {/* Billing Cycle Start Day and Payment Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Cycle Start Date
                  </label>
                  <select
                    value={formData.billing_cycle_start_day}
                    onChange={(e) => setFormData({ ...formData, billing_cycle_start_day: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-500"
                  >
                    <option value={1}>1st of Month (Standard)</option>
                    <option value={10}>10th of Month</option>
                    <option value={15}>15th of Month</option>
                    <option value={26}>26th of Month (Custom Start)</option>
                    {Array.from({ length: 28 }, (_, i) => i + 1)
                      .filter(d => ![1, 10, 15, 26].includes(d))
                      .map(d => (
                        <option key={d} value={d}>{d}th of Month</option>
                      ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    Will trigger 2-day advance warning before this date!
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Preferred Payment
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
              </div>

              {/* Initial Outstanding Balance */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Previous Outstanding Dues (₹)
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
