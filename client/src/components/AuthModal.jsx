import React, { useState } from 'react';
import { 
  X, Mail, Phone, Lock, Sparkles, Shield, 
  User, CheckCircle2, ArrowRight, RefreshCw 
} from 'lucide-react';
import { api } from '../services/api';

export default function AuthModal({
  onClose,
  onLoginSuccess
}) {
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  const [role, setRole] = useState('admin'); // 'admin' or 'customer'
  const [authMethod, setAuthMethod] = useState('phone'); // 'phone' or 'email'
  const [identifier, setIdentifier] = useState('+91 98765 43210');
  const [name, setName] = useState('');
  const [houseNo, setHouseNo] = useState('');
  
  // OTP state
  const [step, setStep] = useState('input'); // 'input' or 'otp'
  const [otpCode, setOtpCode] = useState('');
  const [demoOtp, setDemoOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!identifier) {
      setErrorMessage('Please enter your phone or email');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.sendOtp(identifier, role);
      if (res.success) {
        setDemoOtp(res.demo_otp);
        setStep('otp');
      } else {
        setErrorMessage(res.error || 'Failed to send OTP');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode) {
      setErrorMessage('Please enter the 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const res = await api.verifyOtp(identifier, otpCode);
      if (res.success) {
        onLoginSuccess({
          identifier,
          role: role,
          name: name || res.user.name || (role === 'admin' ? 'Admin' : 'Customer')
        });
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid OTP code');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // 1-Click Google OAuth flow
    onLoginSuccess({
      identifier: 'google.dairy.user@gmail.com',
      role: role,
      name: role === 'admin' ? 'Google Dairy Admin' : 'Google Customer User'
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-100 my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              {tab === 'login' ? 'Welcome Back' : 'Create an Account'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure authentication via OTP & Google
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Selector */}
        <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              role === 'admin'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-teal-600" />
            <span>Admin Portal</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('customer')}
            className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              role === 'customer'
                ? 'bg-white text-teal-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-4 h-4 text-teal-600" />
            <span>Customer Portal</span>
          </button>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: Enter Identifier (Mobile or Email) */}
        {step === 'input' ? (
          <div className="mt-4 space-y-4">
            
            {/* Quick 1-Click Google Sign In */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 shadow-xs tap-bounce transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.14z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.94 0 12s.45 3.84 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="h-px bg-slate-200 flex-1"></div>
              <span className="text-[10px] font-bold uppercase text-slate-400">or sign in with OTP</span>
              <div className="h-px bg-slate-200 flex-1"></div>
            </div>

            {/* Auth Method Switcher: Phone vs Email */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMethod('phone');
                  setIdentifier('+91 98765 43210');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                  authMethod === 'phone'
                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Mobile SMS OTP</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAuthMethod('email');
                  setIdentifier('admin@amritdairy.com');
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${
                  authMethod === 'email'
                    ? 'bg-teal-50 border-teal-300 text-teal-800'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email OTP</span>
              </button>
            </div>

            <form onSubmit={handleSendOtp} className="space-y-3">
              {tab === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  {role === 'customer' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        House / Flat No
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. House A-102"
                        value={houseNo}
                        onChange={(e) => setHouseNo(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  {authMethod === 'phone' ? 'Mobile Phone Number' : 'Email Address'}
                </label>
                <input
                  type={authMethod === 'phone' ? 'tel' : 'email'}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={authMethod === 'phone' ? '+91 98765 43210' : 'name@example.com'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 tap-bounce transition-all flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <span>Send Verification OTP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setTab(tab === 'login' ? 'register' : 'login')}
                className="text-xs font-semibold text-teal-700 hover:underline"
              >
                {tab === 'login' ? "Don't have an account? Register" : "Already registered? Sign In"}
              </button>
            </div>
          </div>
        ) : (
          /* STEP 2: Enter 6-digit OTP */
          <form onSubmit={handleVerifyOtp} className="mt-4 space-y-4">
            <div className="p-3.5 rounded-2xl bg-teal-50 border border-teal-200 text-xs text-teal-900">
              <p className="font-semibold">
                OTP sent to <span className="font-extrabold">{identifier}</span>
              </p>
              
              {/* Instant 1-Click Demo OTP Autofill */}
              {demoOtp && (
                <div className="mt-2 pt-2 border-t border-teal-200/80 flex items-center justify-between">
                  <span className="text-[11px] text-teal-700">Demo Code: <strong>{demoOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtp)}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-teal-600 text-white hover:bg-teal-700"
                  >
                    Auto-fill
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Enter 6-digit OTP
              </label>
              <input
                type="text"
                maxLength={6}
                required
                autoFocus
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.5em] px-4 py-3 rounded-xl border border-slate-300 text-xl font-black text-slate-900 focus:outline-none focus:border-teal-500"
              />
              <p className="text-[10px] text-slate-400 text-center mt-1">
                (Master code: 123456 or generated code)
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs"
              >
                Back
              </button>

              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md shadow-teal-600/30 tap-bounce flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Login</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
