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

  const navItems = [
    { id: 'pos', labelTa: 'பில்லிங் (F1)', labelEn: 'Billing (F1)' },
    { id: 'products', labelTa: 'பொருட்கள் (F2)', labelEn: 'Products (F2)', badge: lowStockCount > 0 ? lowStockCount : null },
    { id: 'invoices', labelTa: 'விற்பனை பட்டியல் (F3)', labelEn: 'Invoices (F3)' },
    { id: 'reports', labelTa: 'ஜிஎஸ்டி அறிக்கை (F4)', labelEn: 'GST Reports (F4)' },
    { id: 'customers', labelTa: 'கடன் கணக்கு (F5)', labelEn: 'Credit (F5)' },
    { id: 'settings', labelTa: 'அமைப்புகள் (F6)', labelEn: 'Settings (F6)' },
  ];

  // Filter tabs according to role (Cashier / User only has access to Billing)
  const isUserRole = currentUser && currentUser.role === 'user';
  const visibleNavItems = isUserRole
    ? navItems.filter(item => item.id === 'pos')
    : navItems;

  return (
    <header className="no-print bg-slate-900 text-white border-b-2 border-slate-700 select-none flex-shrink-0">
      <div className="w-full px-3 py-1.5 flex items-center justify-between gap-3">
        
        {/* Left: Shop Identity */}
        <div 
          className="flex items-center space-x-2 cursor-pointer flex-shrink-0"
          onClick={() => setActiveTab('pos')}
          title={shopName}
        >
          <div className="bg-emerald-600 text-white font-bold text-xs px-2 py-0.5 rounded font-mono shadow-xs">
            POS
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white font-tamil tracking-wide leading-tight whitespace-nowrap">
              {shopName}
            </h1>
            <div className="text-[10px] text-slate-300 font-mono flex items-center space-x-1.5 leading-tight whitespace-nowrap">
              {storeSettings.phone && (
                <span>Ph: <strong className="text-white">{storeSettings.phone}</strong></span>
              )}
              <span className="text-emerald-400 font-semibold">[33 TN]</span>
            </div>
          </div>
        </div>

        {/* Center: Plain Flat Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1 flex-shrink-0">
          {visibleNavItems.map(item => {
            const isActive = activeTab === item.id;
            const label = lang === 'ta' ? item.labelTa : item.labelEn;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-700 text-white border-emerald-500 font-bold'
                    : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <span>{label}</span>
                {item.badge && (
                  <span className="ml-1 bg-rose-600 text-white text-[10px] px-1.5 py-0.2 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: User Role Badge, Logout & Plain Language Toggle */}
        <div className="flex items-center space-x-1.5 flex-shrink-0">
          {currentUser && (
            <div className="flex items-center space-x-1 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-xs">
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                currentUser.role === 'admin' 
                  ? 'bg-rose-900 text-rose-200 border border-rose-700' 
                  : 'bg-blue-900 text-blue-200 border border-blue-700'
              }`}>
                {currentUser.role}
              </span>
              <span className="font-semibold text-slate-200 hidden xl:inline">{currentUser.name || currentUser.username}</span>
              {onLogout && (
                <button
                  onClick={onLogout}
                  title="Logout / வெளியேறு"
                  className="ml-1 bg-rose-950/70 hover:bg-rose-800 text-rose-200 hover:text-white border border-rose-700 font-bold px-1.5 py-0.5 rounded transition-colors text-[11px] flex items-center space-x-0.5"
                >
                  <span>🚪</span>
                  <span>{lang === 'ta' ? 'வெளியேறு' : 'Logout'}</span>
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => setLang(lang === 'ta' ? 'en' : 'ta')}
            className="px-2 py-0.5 text-xs font-bold rounded bg-slate-800 border border-slate-600 text-emerald-400 hover:bg-slate-700 font-mono whitespace-nowrap"
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
              {visibleNavItems.map(item => (
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
