import React from 'react';
import { Milk, Bell, Shield, User, Sparkles, ChevronRight, Settings, Users, LogOut, Sun } from 'lucide-react';

export default function Navbar({
  currentDate,
  viewMode,
  setViewMode,
  milkTypes,
  onOpenRates,
  onOpenAlerts,
  onOpenAdminManager,
  alertCount,
  user,
  onLogout
}) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-teal-600 to-emerald-400 flex items-center justify-center shadow-md shadow-teal-500/20 text-white">
              <Milk className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  DairyFlow
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200/60">
                  PRO
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Sun className="w-3 h-3 text-amber-500" />
                <span className="font-semibold text-amber-700">Morning Shift</span>
              </div>
            </div>
          </div>

          {/* Center: Live Rates Quick Glance (Clickable) */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            <span className="text-xs font-semibold text-slate-500 px-2">Rates:</span>
            {milkTypes.slice(0, 2).map((m) => (
              <button
                key={m.id}
                onClick={onOpenRates}
                className="text-xs font-medium px-2.5 py-1 rounded-lg bg-white shadow-xs border border-slate-200/50 hover:border-teal-400 text-slate-700 flex items-center gap-1.5 transition-all"
                title="Click to change rates"
              >
                <span>{m.name.includes('Cow') ? '🐄' : '🐃'}</span>
                <span>{m.name.split(' ')[0]}:</span>
                <span className="font-bold text-teal-700">₹{m.price_per_liter}/L</span>
              </button>
            ))}
            <button
              onClick={onOpenRates}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 px-2 flex items-center gap-0.5"
            >
              <span>Edit</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          {/* Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* View Mode Switcher (Admin vs Customer) */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
              <button
                onClick={() => setViewMode('admin')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'admin'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Admin</span>
              </button>

              <button
                onClick={() => setViewMode('customer')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  viewMode === 'customer'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Customer</span>
              </button>
            </div>

            {/* Notification & Due Reminders Bell */}
            <button
              onClick={onOpenAlerts}
              className="relative p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
              title="Billing reminders & 10th alert"
            >
              <Bell className="w-5 h-5 text-slate-600" />
              {alertCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-white text-[10px] font-bold items-center justify-center">
                    {alertCount}
                  </span>
                </span>
              )}
            </button>

            {/* Manage Admins Shortcut (Official Admin or Admin) */}
            {(user?.role === 'admin' || user?.role === 'official_admin') && (
              <button
                onClick={onOpenAdminManager}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
                title="Manage Admins & Change Name"
              >
                <Users className="w-3.5 h-3.5 text-teal-600" />
                <span>Admins</span>
              </button>
            )}

            {/* User Account & Logout */}
            {user && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenAdminManager}
                  className="hidden sm:block text-right hover:opacity-80 transition-opacity"
                  title="Click to change your admin name"
                >
                  <p className="text-xs font-black text-slate-800 leading-tight">
                    {user.name || user.username || 'Official Admin'}
                  </p>
                  <p className="text-[10px] text-teal-600 uppercase font-black tracking-wider">
                    {user.role === 'official_admin' ? '👑 Official Admin' : '👤 Admin'}
                  </p>
                </button>
                <button
                  onClick={onLogout}
                  className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors flex items-center gap-1"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
