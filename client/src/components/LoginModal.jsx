import React, { useState } from 'react';

export default function LoginModal({ onLogin, lang = 'en' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success && data.data) {
        onLogin(data.data);
      } else {
        setError(data.message || 'Invalid username or password');
      }
    } catch (err) {
      console.error(err);
      setError('Connection error. Server not responding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999999] flex flex-col justify-between overflow-hidden select-none bg-slate-950"
      style={{
        background: 'radial-gradient(circle at 50% 45%, #0f2b2b 0%, #091a1f 40%, #020617 100%)',
      }}
    >
      {/* Top Window Bar */}
      <div 
        className="w-full bg-[#0f172a] text-slate-100 border-b border-slate-800 px-3 flex items-center justify-between text-xs font-sans tracking-tight"
        style={{ height: '32px', WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center space-x-2 font-normal" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            🛒
          </div>
          <span className="font-bold text-slate-200">Billr POS</span>
        </div>

        <div className="flex items-center h-full space-x-1" style={{ WebkitAppRegion: 'no-drag' }}>
          <button 
            type="button"
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                document.documentElement.requestFullscreen().catch(() => {});
              }
            }}
            title="Maximize"
            className="h-6 w-7 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] transition-colors"
          >
            ▢
          </button>
          <button 
            type="button"
            onClick={() => {
              if (window.electronAPI?.close) {
                window.electronAPI.close();
              } else {
                window.close();
              }
            }}
            title="Close"
            className="h-6 w-7 rounded flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-400 text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Centered Login Dialog */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full shadow-2xl overflow-hidden text-xs">
          
          {/* Modal Header */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-5 text-center border-b border-slate-800">
            <div className="w-14 h-14 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2.5 text-2xl shadow-lg border border-emerald-400/30">
              🛒
            </div>
            <h2 className="text-base font-extrabold tracking-wide text-white">
              Grocery GST Billing POS
            </h2>
            <p className="text-[11px] text-emerald-300/90 mt-0.5">
              Sign in to your cashier or admin account
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {error && (
              <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg text-rose-800 text-xs font-bold text-center">
                ⚠️ {error}
              </div>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Username / பயனர் பெயர்
              </label>
              <input
                type="text"
                autoFocus
                required
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Password / கடவுச்சொல்
              </label>
              <input
                type="password"
                required
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs shadow-md transition-all flex items-center justify-center space-x-1"
            >
              <span>{loading ? 'Logging in...' : 'Sign In / உள்நுழை'}</span>
            </button>

          </form>

        </div>
      </div>

      {/* Bottom Info */}
      <div className="py-2.5 text-center text-xs text-slate-500 font-sans select-none">
        Billr • Smart Retail POS Edition
      </div>
    </div>
  );
}
