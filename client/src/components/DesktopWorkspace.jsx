import React, { useState, useEffect } from 'react';

export default function DesktopWorkspace({ 
  storeSettings = {}, 
  lang = 'en'
}) {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDateStr(now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const shopName = lang === 'ta'
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை பில்லிங்')
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Supermarket Grocery Billing POS');

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none bg-slate-950"
      style={{
        background: 'radial-gradient(circle at 50% 40%, #0f2b2b 0%, #091a1f 40%, #020617 100%)',
      }}
    >
      {/* Background Subtle Geometric Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(16, 185, 129, 0.4) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* Top Banner Notice */}
      <div className="w-full flex items-center justify-between px-6 py-2.5 z-10 text-xs text-slate-400 font-sans border-b border-emerald-950/40">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-300 font-medium tracking-wide">POS Billing Terminal Active</span>
        </div>
        <div className="text-[11px] font-mono text-emerald-400/80">
          {storeSettings.gstin ? `GSTIN: ${storeSettings.gstin}` : 'Tamil Nadu Retail Edition'}
        </div>
      </div>

      {/* Center Supermarket Showcase & Clock */}
      <div className="flex flex-col items-center justify-center my-auto z-10 text-center px-4 max-w-2xl">
        
        {/* Modern Supermarket Glowing Cart Emblem */}
        <div className="relative mb-4 flex items-center justify-center">
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-0.5 shadow-[0_0_50px_rgba(16,185,129,0.35)] flex items-center justify-center">
            <div className="w-full h-full bg-slate-900/90 rounded-[22px] flex items-center justify-center backdrop-blur-xs">
              <span className="text-5xl sm:text-6xl drop-shadow-md">🛒</span>
            </div>
          </div>
        </div>

        {/* Store Title */}
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-tamil drop-shadow-lg">
          {shopName}
        </h1>
        <p className="text-xs sm:text-sm text-emerald-300/80 mt-1 font-medium tracking-wide">
          Tamil Nadu Grocery GST Billing POS
        </p>

        {/* Live Date & Time Display Card */}
        <div className="mt-5 px-5 py-2.5 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xl flex items-center space-x-4">
          <div className="text-left">
            <div className="text-[10px] text-slate-400 uppercase tracking-widest font-mono font-semibold">Today</div>
            <div className="text-xs text-slate-200 font-medium">{dateStr || 'Today'}</div>
          </div>
          <div className="h-7 w-px bg-slate-800" />
          <div className="text-left font-mono">
            <div className="text-[10px] text-emerald-400 uppercase tracking-widest font-semibold">Live Time</div>
            <div className="text-base text-emerald-300 font-bold tracking-wider">{timeStr || '12:00:00 PM'}</div>
          </div>
        </div>

        {/* Keyboard Navigation Pill */}
        <div className="mt-4 px-3.5 py-1.5 bg-slate-900/70 border border-slate-800 rounded-full text-xs font-mono text-slate-300 flex items-center space-x-2 shadow-inner">
          <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[10px] font-bold">ENTER</span>
          <span>Open Transactions</span>
          <span className="text-slate-600">•</span>
          <span className="text-amber-300 font-bold">← → ↑ ↓</span>
          <span>Navigate Menus</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-bold">[F1]</span>
          <span>New Bill</span>
        </div>

      </div>

      {/* Subtle spacer at bottom */}
      <div className="h-4" />
    </div>
  );
}
