import React, { useState, useEffect } from 'react';
import { X, Shield, UserPlus, Check, UserCheck, Key, Phone, Mail, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export default function AdminManagementModal({ onClose }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New Admin Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const res = await api.getAdmins();
      if (res.success) {
        setAdmins(res.data);
      }
    } catch (err) {
      console.error('Failed to load admins:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!username || !password || !name) return;

    try {
      setIsSubmitting(true);
      const res = await api.createAdmin({
        username,
        password,
        name,
        email,
        phone,
        role: 'admin'
      });

      if (res.success) {
        alert(res.message);
        setShowAddForm(false);
        setName('');
        setUsername('');
        setPassword('');
        setEmail('');
        setPhone('');
        fetchAdmins();
      } else {
        alert(res.error || 'Failed to create admin');
      }
    } catch (err) {
      alert('Error creating admin: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Admin Accounts Management</h3>
              <p className="text-xs text-slate-500">Multiple Admin support: Admin 1 active, add Admin 2, 3 anytime.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Admins List */}
        <div className="mt-4 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
            Active Registered Admins ({admins.length})
          </span>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading admin accounts...</div>
          ) : (
            <div className="space-y-2">
              {admins.map((adm) => (
                <div
                  key={adm.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 text-teal-400 font-extrabold text-xs flex items-center justify-center">
                      {adm.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-xs text-slate-900">{adm.name}</strong>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-800">
                          {adm.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Username: <span className="font-bold text-slate-700">{adm.username}</span> • {adm.phone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 font-semibold">
                    {adm.id === 'admin_1' ? 'Primary' : 'Secondary'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Admin Toggle Button */}
        {!showAddForm ? (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all tap-bounce"
          >
            <UserPlus className="w-4 h-4 text-teal-600" />
            <span>Add Another Admin (e.g. Admin 2)</span>
          </button>
        ) : (
          <form onSubmit={handleCreateAdmin} className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold uppercase text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Create New Admin Account</span>
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Admin Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Admin 2 (Operations)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Username *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. admin2"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 00002"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-1.5 rounded-lg border border-slate-200 text-slate-600 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs tap-bounce"
              >
                {isSubmitting ? 'Saving...' : 'Save New Admin'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
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
