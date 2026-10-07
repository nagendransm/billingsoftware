import React from 'react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  lang, 
  setLang, 
  t, 
  storeSettings = {},
  lowStockCount = 0,
  currentUser = null,
  onLogout
}) {
  const shopName = lang === 'ta' 
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை பில்லிங்') 
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery Billing POS');

  // Concise labels so tabs never consume excessive width
  const navItems = [
    { id: 'pos', labelTa: 'பில்லிங் (F1)', labelEn: 'Billing (F1)' },
    { id: 'products', labelTa: 'பொருட்கள் (F2)', labelEn: 'Items (F2)', badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'invoices', labelTa: 'விற்பனை (F3)', labelEn: 'Bills (F3)' },
    { id: 'reports', labelTa: 'ஜிஎஸ்டி (F4)', labelEn: 'GST (F4)' },
    { id: 'customers', labelTa: 'கடன் (F5)', labelEn: 'Credit (F5)' },
    { id: 'settings', labelTa: 'அமைப்பு (F6)', labelEn: 'Settings (F6)' },
  ];

  // Filter tabs according to role (Cashier / User only has access to Billing)
  const isUserRole = currentUser && currentUser.role === 'user';
  const visibleNavItems = isUserRole
    ? navItems.filter(item => item.id === 'pos')
    : navItems;

  return (
    <header className="no-print bg-slate-900 text-white border-b-2 border-slate-700 select-none flex-shrink-0 w-full">
      <div className="w-full px-2 py-1 flex items-center justify-between gap-1.5 overflow-x-hidden">
        

        {/* Center: Compact Navigation Tabs */}
        <nav className="flex items-center space-x-1 flex-shrink-0">
          {visibleNavItems.map(item => {
            const isActive = activeTab === item.id;
            const label = lang === 'ta' ? item.labelTa : item.labelEn;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2 py-0.5 text-[11px] sm:text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-500 font-bold shadow-xs'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{label}</span>
                {item.badge && (
                  <span className="ml-1 bg-rose-600 text-white text-[9px] px-1 py-0.1 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: User Role Badge, Logout & Language Toggle (NEVER HIDDEN / NEVER OVERFLOWS) */}
        <div className="flex items-center space-x-1.5 flex-shrink-0 ml-auto">
          {currentUser && (
            <div className="flex items-center space-x-1 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 text-[11px]">
              <span className={`px-1 py-0.1 rounded text-[9px] font-bold uppercase ${
                currentUser.role === 'admin' 
                  ? 'bg-rose-900 text-rose-200 border border-rose-700' 
                  : 'bg-blue-900 text-blue-200 border border-blue-700'
              }`}>
                {currentUser.role}
              </span>
              
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout / வெளியேறு"
                  className="bg-rose-700 hover:bg-rose-600 active:bg-rose-800 text-white font-bold px-1.5 py-0.5 rounded transition-colors text-[10px] flex items-center space-x-0.5 shadow-xs"
                >
                  <span>🚪</span>
                  <span>{lang === 'ta' ? 'வெளியேறு' : 'Logout'}</span>
                </button>
              )}
            </div>
          )}

          {/* Language Toggle Button */}
          <button
            onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
            className="px-2 py-0.5 text-[11px] font-bold rounded bg-slate-800 border border-slate-600 text-emerald-400 hover:bg-slate-700 font-mono whitespace-nowrap shadow-xs"
            title="Switch Language / மொழியை மாற்ற"
          >
            {lang === 'ta' ? 'English' : 'தமிழ்'}
          </button>
        </div>

      </div>
    </header>
  );
}
