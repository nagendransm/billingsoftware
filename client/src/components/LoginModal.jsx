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
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-slate-300 max-w-sm w-full shadow-2xl overflow-hidden text-xs">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white p-4 text-center">
          <div className="w-12 h-12 bg-purple-700 rounded-full flex items-center justify-center mx-auto mb-2 text-xl shadow-md">
            🛒
          </div>
          <h2 className="text-base font-bold tracking-wide">
            Nova Software Billing POS
          </h2>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Please sign in to access billing system
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          
          {error && (
            <div className="p-2 bg-rose-50 border border-rose-300 rounded text-rose-800 text-[11px] font-bold text-center">
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
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold focus:border-purple-700 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Password / கடவுச்சொல்
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs font-semibold focus:border-purple-700 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-[#6a1b6b] hover:bg-[#521353] disabled:opacity-50 text-white font-bold rounded text-xs shadow-xs transition-colors flex items-center justify-center space-x-1"
          >
            <span>{loading ? 'Logging in...' : 'Sign In / உள்நுழை'}</span>
          </button>

        </form>

      </div>
    </div>
  );
}

