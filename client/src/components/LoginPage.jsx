import React, { useState } from 'react';
import { 
  Milk, Shield, User, Lock, Mail, Phone, 
  ArrowRight, CheckCircle2, Sparkles, Eye, EyeOff, 
  KeyRound, Users, AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';

export default function LoginPage({ onLoginSuccess }) {
  const [activeTab, setActiveTab] = useState('admin'); // 'admin' or 'customer'
  
  // Admin Login State
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Customer Login State
  const [customerPhone, setCustomerPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  
  // General State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle Admin 1 Login
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!adminUsername || !adminPassword) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.adminLogin(adminUsername, adminPassword);
      if (res.success) {
        const sessionData = {
          ...res.user,
          token: res.token
        };
        localStorage.setItem('dairy_flow_session', JSON.stringify(sessionData));
        onLoginSuccess(sessionData);
      } else {
        setErrorMessage(res.error || 'Invalid credentials');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Server error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle Customer OTP Request
  const handleCustomerSendOtp = async (e) => {
    e.preventDefault();
    if (!customerPhone) {
      setErrorMessage('Please enter your registered mobile number.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.sendOtp(customerPhone, 'customer');
      if (res.success) {
        setDemoOtp(res.demo_otp);
        setOtpSent(true);
      } else {
        setErrorMessage(res.error || 'Could not send OTP');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle Customer OTP Verification
  const handleCustomerVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.verifyOtp(customerPhone, otpCode);
      if (res.success) {
        const sessionData = {
          ...res.user,
          token: res.token
        };
        localStorage.setItem('dairy_flow_session', JSON.stringify(sessionData));
        onLoginSuccess(sessionData);
      } else {
        setErrorMessage(res.error || 'Invalid OTP');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-teal-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-800 selection:bg-teal-500 selection:text-white">
      
      {/* Container */}
      <div className="max-w-md w-full">
        
        {/* Top Branding Banner */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 items-center justify-center shadow-xl shadow-teal-500/30 text-white mb-3">
            <Milk className="w-9 h-9 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            DairyFlow <span className="text-teal-400 font-extrabold text-xl">PRO</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Farm-Fresh Milk Delivery & Customer Management System
          </p>
        </div>

        {/* Main Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100/90 relative overflow-hidden">
          
          {/* Role Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'admin'
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 text-teal-400" />
              <span>Admin Login</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('customer');
                setErrorMessage('');
              }}
              className={`py-2.5 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                activeTab === 'customer'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Customer Portal</span>
            </button>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs font-semibold text-rose-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: ADMIN LOGIN FORM */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Username or Email
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="Enter admin username"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Admin Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md tap-bounce transition-all flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Sign In to Admin Panel</span>
                    <ArrowRight className="w-4 h-4 text-teal-400" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: CUSTOMER OTP LOGIN FORM */}
          {activeTab === 'customer' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Customers can log in using their registered mobile phone number to check daily milk records and pay via UPI.
              </p>

              {!otpSent ? (
                <form onSubmit={handleCustomerSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Registered Mobile Number
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Enter registered mobile number"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-md shadow-teal-600/30 tap-bounce transition-all flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>Send Login OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleCustomerVerifyOtp} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
                    <p className="font-semibold">
                      OTP sent to <strong>{customerPhone}</strong>
                    </p>
                    {demoOtp && (
                      <div className="mt-2 pt-2 border-t border-teal-200 flex items-center justify-between">
                        <span>Code: <strong>{demoOtp}</strong></span>
                        <button
                          type="button"
                          onClick={() => setOtpCode(demoOtp)}
                          className="px-2 py-0.5 rounded bg-teal-600 text-white text-[10px] font-bold"
                        >
                          Auto-fill
                        </button>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Enter 6-Digit OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      autoFocus
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.4em] py-2.5 rounded-xl border border-slate-200 text-lg font-black text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setOtpSent(false)}
                      className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md tap-bounce flex items-center justify-center gap-1.5"
                    >
                      {loading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify & Enter</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          🔒 Secure Protected Gateway • Support for Multiple Admins
        </p>

      </div>
    </div>
  );
}
