import React from 'react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  lang, 
  setLang, 
  t, 
  storeSettings = {},
  lowStockCount = 0 
}) {
  const shopName = lang === 'ta' 
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை பில்லிங்') 
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery Billing POS');

  const navItems = [
    { id: 'pos', labelTa: 'பில்லிங் (F1)', labelEn: 'Billing (F1)' },
    { id: 'products', labelTa: 'பொருட்கள் (F2)', labelEn: 'Products (F2)', badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'invoices', labelTa: 'விற்பனை பட்டியல் (F3)', labelEn: 'Invoices (F3)' },
    { id: 'reports', labelTa: 'ஜிஎஸ்டி அறிக்கை (F4)', labelEn: 'GST Reports (F4)' },
    { id: 'customers', labelTa: 'கடன் கணக்கு (F5)', labelEn: 'Credit (F5)' },
    { id: 'settings', labelTa: 'அமைப்புகள் (F6)', labelEn: 'Settings (F6)' },
  ];

  return (
    <header className="no-print bg-slate-900 text-white border-b-2 border-slate-700 select-none flex-shrink-0">
      <div className="w-full px-3 py-1.5 flex items-center justify-between gap-3">
        
        {/* Left: Shop Identity */}
        <div 
          className="flex items-center space-x-2.5 cursor-pointer flex-shrink min-w-0"
          onClick={() => setActiveTab('pos')}
          title={shopName}
        >
          <div className="bg-emerald-600 text-white font-bold text-xs px-2 py-1 rounded font-mono">
            POS
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-base font-bold text-white font-tamil truncate tracking-wide">
              {shopName}
            </h1>
            <div className="text-[11px] text-slate-300 font-mono flex items-center space-x-2">
              {storeSettings.gstin ? (
                <span>GSTIN: <strong>{storeSettings.gstin}</strong></span>
              ) : (
                <span className="text-amber-400 font-tamil text-[10px]">{lang === 'ta' ? '[அமைப்புகளில் கடை பெயர் அமைக்கலாம்]' : '[Set Shop Details in Settings]'}</span>
              )}
              <span className="text-emerald-400 font-semibold">[State: 33 TN]</span>
            </div>
          </div>
        </div>

        {/* Center: Plain Flat Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 flex-shrink-0">
          {navItems.map(item => {
            const isActive = activeTab === item.id;
            const label = lang === 'ta' ? item.labelTa : item.labelEn;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-500 font-bold'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{label}</span>
                {item.badge && (
                  <span className="ml-1.5 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Plain Language Toggle & Mobile Select */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
            className="px-2.5 py-1 text-xs font-bold rounded bg-slate-800 border border-slate-600 text-emerald-400 hover:bg-slate-700 font-mono"
            title="Switch Language / மொழியை மாற்ற"
          >
            {lang === 'ta' ? 'English' : 'தமிழ்'}
          </button>

          <div className="flex md:hidden">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="bg-slate-800 text-white text-xs px-2 py-1 rounded border border-slate-600 focus:outline-none"
            >
              {navItems.map(item => (
                <option key={item.id} value={item.id}>
                  {lang === 'ta' ? item.labelTa : item.labelEn}
                </option>
              ))}
            </select>
          </div>
        </div>

      </div>
    </header>
  );
}
