import React, { useState } from 'react';
import { X, Droplets, Plus, Check, TrendingUp, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function MilkRatesModal({
  milkTypes,
  onClose,
  onRatesUpdated
}) {
  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [showAddType, setShowAddType] = useState(false);
  const [newType, setNewType] = useState({
    name: '',
    price_per_liter: 60,
    fat_snf: '4.5% Fat, 8.5% SNF',
    description: ''
  });
  const [isSaving, setIsSaving] = useState(false);

  const startEdit = (m) => {
    setEditingId(m.id);
    setEditPrice(m.price_per_liter.toString());
  };

  const handleSavePrice = async (id) => {
    if (!editPrice || parseFloat(editPrice) <= 0) return;
    try {
      setIsSaving(true);
      const res = await api.updateMilkType(id, { price_per_liter: parseFloat(editPrice) });
      if (res.success) {
        setEditingId(null);
        if (onRatesUpdated) onRatesUpdated();
      }
    } catch (err) {
      alert('Error updating rate: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddNewType = async (e) => {
    e.preventDefault();
    if (!newType.name || !newType.price_per_liter) return;

    try {
      setIsSaving(true);
      const res = await api.addMilkType(newType);
      if (res.success) {
        setShowAddType(false);
        setNewType({
          name: '',
          price_per_liter: 60,
          fat_snf: '4.5% Fat, 8.5% SNF',
          description: ''
        });
        if (onRatesUpdated) onRatesUpdated();
      }
    } catch (err) {
      alert('Error adding milk type: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Milk Pricing & Rates</h3>
              <p className="text-xs text-slate-500">Live rate fluctuation manager. Updates reflect on customer bills immediately.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Informational tip */}
        <div className="mt-4 p-3 rounded-xl bg-teal-50/80 border border-teal-100 flex items-center gap-2 text-xs text-teal-900">
          <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
          <span>
            Standard base rate is <strong>₹60/L</strong>. Buffalo milk and special premium types can have customized per-liter rates.
          </span>
        </div>

        {/* Milk Rate Rows */}
        <div className="mt-4 space-y-3">
          {milkTypes.map((m) => {
            const isEditing = editingId === m.id;
            return (
              <div
                key={m.id}
                className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex items-center justify-between gap-3 hover:border-slate-300 transition-all"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900 text-sm">{m.name}</span>
                    <span className="text-[10px] font-semibold text-slate-500 px-1.5 py-0.5 rounded bg-white border border-slate-200">
                      {m.fat_snf || 'Standard'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{m.description || 'Farm-fresh tested milk'}</p>
                </div>

                {/* Price Display or Edit Input */}
                <div className="text-right shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-20 px-2 py-1 bg-white border border-teal-500 rounded-lg text-sm font-bold text-slate-900 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePrice(m.id)}
                        disabled={isSaving}
                        className="p-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700"
                        title="Save Rate"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div>
                        <span className="text-lg font-black text-teal-800">₹{m.price_per_liter}</span>
                        <span className="text-xs text-slate-500 font-semibold"> / Liter</span>
                      </div>
                      <button
                        onClick={() => startEdit(m)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                      >
                        Change Rate
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add New Variety Toggle */}
        {!showAddType ? (
          <button
            onClick={() => setShowAddType(true)}
            className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:text-slate-900 hover:border-slate-400 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Milk Variety</span>
          </button>
        ) : (
          <form onSubmit={handleAddNewType} className="mt-4 p-4 rounded-2xl bg-teal-50/50 border border-teal-200 space-y-3">
            <h4 className="text-xs font-bold uppercase text-teal-900">New Milk Variety</h4>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name (e.g. A2 Gir Cow)"
                required
                value={newType.name}
                onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white"
              />
              <input
                type="number"
                step="0.5"
                placeholder="Price / Liter (₹)"
                required
                value={newType.price_per_liter}
                onChange={(e) => setNewType({ ...newType, price_per_liter: parseFloat(e.target.value) || 0 })}
                className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddType(false)}
                className="flex-1 py-1.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-bold"
              >
                Save Variety
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}
