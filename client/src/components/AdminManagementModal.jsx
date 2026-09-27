import React, { useState, useEffect } from 'react';
import { 
  X, Shield, UserPlus, Check, UserCheck, Key, Phone, 
  Mail, Sparkles, Edit3, Trash2, Crown, User
} from 'lucide-react';
import { api } from '../services/api';

export default function AdminManagementModal({ onClose, onAdminUpdated }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Current logged in admin session
  const currentSession = JSON.parse(localStorage.getItem('dairy_flow_session') || '{}');
  const isOfficialAdmin = currentSession.role === 'official_admin' || currentSession.id === 'admin_1';

  // Name Change State (Available to ALL Admins)
  const [isEditingMyName, setIsEditingMyName] = useState(false);
  const [myNewName, setMyNewName] = useState(currentSession.name || '');
  const [isUpdatingName, setIsUpdatingName] = useState(false);

  // New Admin Form State (Only Official Admin can access)
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

  // ALL ADMINS CAN CHANGE THEIR NAME
  const handleSaveMyName = async (e) => {
    e.preventDefault();
    if (!myNewName || !myNewName.trim()) return;

    try {
      setIsUpdatingName(true);
      const targetId = currentSession.id || 'admin_1';
      const res = await api.updateAdminName(targetId, { name: myNewName.trim() });

      if (res.success) {
        // Update local session
        const updatedSession = { ...currentSession, name: myNewName.trim() };
        localStorage.setItem('dairy_flow_session', JSON.stringify(updatedSession));
        setIsEditingMyName(false);
        fetchAdmins();
        if (onAdminUpdated) onAdminUpdated(updatedSession);
        alert(`Name successfully updated to "${myNewName.trim()}"!`);
      } else {
        alert(res.error || 'Failed to update name');
      }
    } catch (err) {
      alert('Error updating name: ' + err.message);
    } finally {
      setIsUpdatingName(false);
    }
  };

  // ONLY OFFICIAL ADMIN CAN CREATE OTHER ADMINS
  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    if (!isOfficialAdmin) {
      alert('Only the Official Admin has permission to add other administrators.');
      return;
    }
    if (!username || !password || !name) return;

    try {
      setIsSubmitting(true);
      const res = await api.createAdmin({
        username: username.trim(),
        password,
        name: name.trim(),
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

  // ONLY OFFICIAL ADMIN CAN DELETE OTHER ADMINS
  const handleDeleteAdmin = async (adminId, adminName) => {
    if (!isOfficialAdmin) {
      alert('Only the Official Admin can delete admin accounts.');
      return;
    }
    if (adminId === 'admin_1') {
      alert('Cannot delete the primary Official Admin.');
      return;
    }
    if (!confirm(`Are you sure you want to remove admin "${adminName}"?`)) return;

    try {
      const res = await api.deleteAdmin(adminId);
      if (res.success) {
        fetchAdmins();
      } else {
        alert(res.error || 'Failed to delete admin');
      }
    } catch (err) {
      alert('Error deleting admin: ' + err.message);
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
              <h3 className="text-lg font-bold text-slate-900">Admin Control Center</h3>
              <p className="text-xs text-slate-500">Official Admin management & profile settings</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 1: CHANGE MY NAME (Available to ALL Admins) */}
        <div className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-black uppercase tracking-wider text-teal-900">
                Your Admin Profile
              </span>
            </div>
            {!isEditingMyName && (
              <button
                type="button"
                onClick={() => {
                  setMyNewName(currentSession.name || '');
                  setIsEditingMyName(true);
                }}
                className="flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-white/80 px-2 py-0.5 rounded-lg border border-teal-200 tap-bounce"
              >
                <Edit3 className="w-3 h-3" />
                <span>Change Name</span>
              </button>
            )}
          </div>

          {!isEditingMyName ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-slate-900">{currentSession.name || 'Official Admin'}</p>
                <p className="text-xs text-slate-500">
                  Username: <span className="font-semibold text-slate-800">{currentSession.username || 'admin1'}</span>
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-200 text-teal-900 flex items-center gap-1">
                {isOfficialAdmin ? <Crown className="w-3 h-3 text-amber-600" /> : null}
                <span>{isOfficialAdmin ? 'Official Admin' : 'Admin'}</span>
              </span>
            </div>
          ) : (
            <form onSubmit={handleSaveMyName} className="mt-2 space-y-2 animate-in fade-in duration-150">
              <label className="block text-[10px] font-bold text-teal-950 uppercase">
                Enter New Admin Name:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  autoFocus
                  value={myNewName}
                  onChange={(e) => setMyNewName(e.target.value)}
                  placeholder="e.g. Sukhdev Singh (Dairy Head)"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-teal-300 text-xs bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  type="submit"
                  disabled={isUpdatingName}
                  className="px-3 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs tap-bounce flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingMyName(false)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* SECTION 2: LIST OF ALL REGISTERED ADMINS */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Registered Admins ({admins.length})
            </span>
            {isOfficialAdmin && (
              <span className="text-[10px] text-teal-700 font-semibold">
                You have Official Admin permissions
              </span>
            )}
          </div>

          {loading ? (
            <div className="p-4 text-center text-xs text-slate-500">Loading admin accounts...</div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {admins.map((adm) => {
                const isAdmOfficial = adm.role === 'official_admin' || adm.id === 'admin_1';
                return (
                  <div
                    key={adm.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                        isAdmOfficial ? 'bg-amber-500 text-white' : 'bg-slate-900 text-teal-400'
                      }`}>
                        {isAdmOfficial ? <Crown className="w-4 h-4" /> : adm.username.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <strong className="text-xs text-slate-900">{adm.name}</strong>
                          {isAdmOfficial ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 uppercase">
                              Official Admin
                            </span>
                          ) : (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                              Admin
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Username: <strong className="text-slate-800">{adm.username}</strong>
                          {adm.phone ? ` • ${adm.phone}` : ''}
                        </p>
                      </div>
                    </div>

                    {isOfficialAdmin && !isAdmOfficial && (
                      <button
                        type="button"
                        onClick={() => handleDeleteAdmin(adm.id, adm.name)}
                        className="p-1.5 text-rose-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Remove admin"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3: ADD OTHER ADMIN (Accessible ONLY to Official Admin) */}
        {isOfficialAdmin ? (
          !showAddForm ? (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="w-full mt-4 py-2.5 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all tap-bounce"
            >
              <UserPlus className="w-4 h-4 text-teal-600" />
              <span>Add Another Admin (Official Admin Only)</span>
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
          )
        ) : (
          <div className="mt-3 p-3 rounded-xl bg-slate-100 text-slate-500 text-xs text-center">
            🔒 Only the Official Admin can create or delete other administrators.
          </div>
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
