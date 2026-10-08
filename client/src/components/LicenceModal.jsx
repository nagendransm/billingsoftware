import React from 'react';

export default function LicenceModal({ isOpen, onClose, storeSettings = {}, lang = 'en' }) {
  if (!isOpen) return null;

  const shopName = storeSettings.shop_name_en || storeSettings.shop_name_ta || 'SRI KUMARAN SUPER MARKET';

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white border-2 border-slate-400 rounded shadow-2xl w-full max-w-md overflow-hidden text-slate-800 font-sans">
        {/* Title Bar */}
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-purple-700 font-bold text-sm">❖</span>
            <span className="font-bold text-xs text-slate-800">
              {lang === 'ta' ? 'நோவா மென்பொருள் உரிம விவரங்கள்' : 'Nova Software - Licence Details'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-rose-600 hover:bg-slate-200 px-2 py-0.5 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 text-xs bg-slate-50">
          <div className="bg-white border border-slate-200 p-3 rounded space-y-2">
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'மென்பொருள் பெயர்' : 'Product Name'}:</span>
              <span className="font-bold text-slate-900">Nova Retail Supermarket POS</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'பதிப்பு' : 'Version'}:</span>
              <span className="font-mono font-bold text-emerald-700">v2.5.0 Enterprise (2026)</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'உரிமம் பெற்ற நிறுவனம்' : 'Licensed To'}:</span>
              <span className="font-bold text-slate-900">{shopName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'சேவை முடிவு தேதி' : 'Service Ends on'}:</span>
              <span className="font-bold text-indigo-700 font-mono">29.06.2027</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-1.5">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'உரிம நிலை' : 'Licence Status'}:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                ✓ {lang === 'ta' ? 'செயலில் உள்ளது (Active)' : 'Active & Verified'}
              </span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-slate-500 font-medium">{lang === 'ta' ? 'உரிம சாவி' : 'Licence Key'}:</span>
              <span className="font-mono text-[11px] text-slate-600">NOVA-SUP-2026-TN-9842</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 text-center">
            {lang === 'ta' 
              ? 'அங்கீகரிக்கப்பட்ட ஜிஎஸ்டி மளிகை மற்றும் பல்பொருள் அங்காடி பில்லிங் பதிப்பு.' 
              : 'Authorized GST Supermarket & Grocery Billing Retail Edition.'}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded transition-colors shadow-xs"
          >
            {lang === 'ta' ? 'சரி (OK)' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
