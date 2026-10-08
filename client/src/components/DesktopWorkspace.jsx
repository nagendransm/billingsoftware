import React, { useState, useEffect } from 'react';

export default function DesktopWorkspace({ 
  storeSettings = {}, 
  lang = 'en',
  onOpenScreen,
  setBillingMode
}) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const shopName = lang === 'ta'
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'ஸ்ரீ குமரன் சூப்பர் மார்க்கெட்')
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'SRI KUMARAN SUPER MARKET');

  const handleOpenBilling = (mode) => {
    if (setBillingMode) setBillingMode(mode);
    if (onOpenScreen) onOpenScreen('pos');
  };

  return (
    <div 
      className="relative w-full h-full flex flex-col items-center justify-between overflow-hidden select-none"
      style={{
        background: 'radial-gradient(circle at 50% 45%, #2a535e 0%, #1f3f47 50%, #13282e 100%)',
      }}
    >
      {/* Background Micro-pattern Overlay */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.2) 1px, transparent 0)`,
          backgroundSize: '16px 16px'
        }}
      />

      {/* Top Banner Notice */}
      <div className="w-full text-center py-2 z-10 text-[11px] text-cyan-200/80 font-mono tracking-widest uppercase">
        {shopName} • 2026 RETAIL ENTERPRISE EDITION
      </div>

      {/* Center 3D Logo & Brand (Matching the Screenshot) */}
      <div className="flex flex-col items-center justify-center my-auto z-10 text-center px-4">
        {/* 3D Cyan Intertwined Knot Emblem */}
        <div className="relative mb-3 flex items-center justify-center drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]">
          <svg className="w-36 h-36 sm:w-44 sm:h-44" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="cyanGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a5f3fc" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0284c7" />
              </linearGradient>
              <linearGradient id="cyanGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="70%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0284c7" floodOpacity="0.4" />
              </filter>
            </defs>
            {/* Top Loop */}
            <path 
              d="M100 35 C125 35 145 55 145 80 C145 105 125 125 100 125 C75 125 55 105 55 80 C55 55 75 35 100 35 Z" 
              stroke="url(#cyanGrad1)" 
              strokeWidth="14" 
              strokeLinecap="round"
              fill="none"
              filter="url(#glow)"
            />
            {/* Bottom-Left Loop */}
            <path 
              d="M75 80 C95 80 115 100 115 125 C115 150 95 165 70 165 C45 165 30 145 30 120 C30 95 50 80 75 80 Z" 
              stroke="url(#cyanGrad2)" 
              strokeWidth="14" 
              strokeLinecap="round"
              fill="none"
              filter="url(#glow)"
            />
            {/* Bottom-Right Loop */}
            <path 
              d="M125 80 C150 80 170 95 170 120 C170 145 155 165 130 165 C105 165 85 150 85 125 C85 100 105 80 125 80 Z" 
              stroke="url(#cyanGrad1)" 
              strokeWidth="14" 
              strokeLinecap="round"
              fill="none"
              filter="url(#glow)"
            />
          </svg>
        </div>

        {/* NOVA 3D Stylized Typography */}
        <div className="flex items-center justify-center space-x-1.5 drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)]">
          {/* Stylized 'N' pebble */}
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-gradient-to-br from-white via-slate-200 to-amber-200 flex items-center justify-center shadow-lg border border-white/60">
            <span className="text-slate-900 font-extrabold text-lg sm:text-xl font-mono">N</span>
          </div>
          <span 
            className="text-3xl sm:text-4xl font-extrabold tracking-widest uppercase font-mono"
            style={{
              background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 50%, #fef08a 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: '0 2px 10px rgba(0,0,0,0.5)'
            }}
          >
            OVA
          </span>
        </div>

        {/* Store Title */}
        <h2 className="text-white/95 font-bold text-sm sm:text-base font-tamil mt-3 tracking-wider drop-shadow-md">
          {shopName}
        </h2>
        <div className="text-cyan-300/80 text-xs font-mono mt-0.5 tracking-widest">
          {lang === 'ta' ? 'ஜிஎஸ்டி சில்லறை & மொத்த விற்பனை பில்லிங்' : 'GST RETAIL & WHOLESALE BILLING SYSTEM'}
        </div>
      </div>

      {/* Bottom Launcher Bar with ERP Function Keys */}
      <div className="w-full bg-black/40 backdrop-blur-md border-t border-cyan-900/40 px-3 py-2 z-10 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Quick Launch Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => handleOpenBilling('tax_invoice')}
            className="bg-emerald-800 hover:bg-emerald-700 active:bg-emerald-900 text-white font-bold px-2.5 py-1 rounded shadow-md border border-emerald-500/50 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-emerald-950 px-1 py-0.2 rounded font-mono text-[10px] text-emerald-300">F1</span>
            <span>{lang === 'ta' ? 'ஜிஎஸ்டி விற்பனை பில்' : 'Sales Bill (GST)'}</span>
          </button>

          <button
            onClick={() => handleOpenBilling('estimate')}
            className="bg-amber-800 hover:bg-amber-700 active:bg-amber-900 text-white font-bold px-2 py-1 rounded shadow-md border border-amber-500/50 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-amber-950 px-1 py-0.2 rounded font-mono text-[10px] text-amber-300">EST</span>
            <span>{lang === 'ta' ? 'மதிப்பீடு பில்' : 'Sales Estimate'}</span>
          </button>

          <button
            onClick={() => handleOpenBilling('return_bill')}
            className="bg-rose-900 hover:bg-rose-800 active:bg-rose-950 text-white font-bold px-2 py-1 rounded shadow-md border border-rose-500/50 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-black/40 px-1 py-0.2 rounded font-mono text-[10px] text-rose-300">RET</span>
            <span>{lang === 'ta' ? 'திருப்பல் பில்' : 'Sales Return'}</span>
          </button>

          <button
            onClick={() => onOpenScreen('products')}
            className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold px-2 py-1 rounded shadow-md border border-slate-600 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-slate-950 px-1 py-0.2 rounded font-mono text-[10px] text-slate-300">F2</span>
            <span>{lang === 'ta' ? 'பொருட்கள்' : 'Items Master'}</span>
          </button>

          <button
            onClick={() => onOpenScreen('invoices')}
            className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold px-2 py-1 rounded shadow-md border border-slate-600 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-slate-950 px-1 py-0.2 rounded font-mono text-[10px] text-slate-300">F3</span>
            <span>{lang === 'ta' ? 'விற்பனை ஏடு' : 'Bills Book'}</span>
          </button>

          <button
            onClick={() => onOpenScreen('reports')}
            className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold px-2 py-1 rounded shadow-md border border-slate-600 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-slate-950 px-1 py-0.2 rounded font-mono text-[10px] text-slate-300">F4</span>
            <span>{lang === 'ta' ? 'ஜிஎஸ்டி அறிக்கை' : 'GST Reports'}</span>
          </button>

          <button
            onClick={() => onOpenScreen('customers')}
            className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-white font-bold px-2 py-1 rounded shadow-md border border-slate-600 flex items-center space-x-1.5 transition-colors"
          >
            <span className="bg-slate-950 px-1 py-0.2 rounded font-mono text-[10px] text-slate-300">F5</span>
            <span>{lang === 'ta' ? 'கடன் கணக்கு' : 'Credit Ledger'}</span>
          </button>
        </div>

        {/* Digital Clock & Service Status */}
        <div className="flex items-center space-x-3 text-cyan-200/90 ml-auto font-mono">
          <div className="hidden md:flex items-center space-x-1 text-[11px] text-slate-400">
            <span>Service:</span>
            <span className="text-emerald-400 font-bold">29.06.2027</span>
          </div>
          <div className="bg-slate-950/80 px-2.5 py-0.5 rounded border border-cyan-800/40 text-emerald-400 font-bold tracking-wider text-xs">
            {timeStr || '12:00:00 PM'}
          </div>
        </div>
      </div>
    </div>
  );
}
