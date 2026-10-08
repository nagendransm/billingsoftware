import React from 'react';

export default function LicenceModal({ isOpen, onClose, storeSettings = {}, lang = 'en' }) {
  if (!isOpen) return null;

  const shopName = storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery GST Billing POS';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white border border-slate-300 rounded-xl shadow-2xl w-full max-w-md overflow-hidden text-slate-800 font-sans">
        
        {/* Title Bar */}
        <div className="bg-[#0f172a] text-white px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-emerald-400 font-bold text-sm">🛒</span>
            <span className="font-bold text-xs text-white">
              {lang === 'ta' ? 'மென்பொருள் & உரிம விவரங்கள்' : 'Software & System Information'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 h-6 w-6 rounded flex items-center justify-center text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3.5 text-xs bg-slate-50">
          <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-2xs space-y-2.5">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'மென்பொருள் பெயர்' : 'Product Name'}:</span>
              <span className="font-bold text-slate-900">Tamil Nadu Grocery GST Billing POS</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'பதிப்பு' : 'Edition / Version'}:</span>
              <span className="font-mono font-bold text-emerald-700">v2.5 Retail Edition (Offline)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'உரிமம் பெற்ற நிறுவனம்' : 'Store Name'}:</span>
              <span className="font-bold text-slate-900">{shopName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'இயங்குதளம்' : 'Platform'}:</span>
              <span className="font-semibold text-slate-700">Windows Desktop Native (Standalone)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'உரிம நிலை' : 'License Status'}:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ {lang === 'ta' ? 'செயலில் உள்ளது (Active)' : 'Active & Verified'}
              </span>
            </div>
            <div className="flex justify-between pt-0.5">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'தரவுத்தளம்' : 'Database'}:</span>
              <span className="font-mono text-[11px] text-slate-600">SQLite High-Speed WAL Engine</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            {lang === 'ta' 
              ? 'அங்கீகரிக்கப்பட்ட தமிழ்நாட்டு மளிகை மற்றும் பல்பொருள் அங்காடி ஜிஎஸ்டி பில்லிங் மென்பொருள்.' 
              : 'Dedicated Tamil Nadu Grocery & Retail Supermarket GST POS Billing System.'}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-4 py-2.5 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors shadow-xs"
          >
            {lang === 'ta' ? 'சரி (OK)' : 'OK / Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
