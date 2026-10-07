import React, { useState, useRef, useEffect } from 'react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  lang, 
  setLang, 
  t, 
  storeSettings = {},
  lowStockCount = 0,
  currentUser = null,
  onLogout,
  billingMode = 'tax_invoice',
  setBillingMode
}) {
  const [showBillingDropdown, setShowBillingDropdown] = useState(false);
  const [highlightedBillingIndex, setHighlightedBillingIndex] = useState(1);
  const billingDropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (billingDropdownRef.current && !billingDropdownRef.current.contains(e.target)) {
        setShowBillingDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen to F1 toggle event
  useEffect(() => {
    const handleToggle = () => {
      if (activeTab !== 'pos') {
        setActiveTab('pos');
      }
      window.dispatchEvent(new CustomEvent('close-pos-dropdowns'));
      setShowBillingDropdown(prev => {
        const next = !prev;
        if (next) {
          const idx = billingOptions.findIndex(o => o.id === billingMode);
          setHighlightedBillingIndex(idx >= 0 ? idx : 0);
        }
        return next;
      });
    };
    window.addEventListener('toggle-billing-dropdown', handleToggle);
    return () => window.removeEventListener('toggle-billing-dropdown', handleToggle);
  }, [activeTab, billingMode]);

  const shopName = lang === 'ta' 
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை பில்லிங்') 
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery Billing POS');

  // Billing Dropdown Options (3 options requested by user)
  const billingOptions = [
    {
      id: 'estimate',
      labelTa: '1. விற்பனை மதிப்பீடு (வரி இல்லை)',
      labelEn: '1. Sales Bill (Estimate - No Tax)',
      descTa: 'வாடிக்கையாளருக்கு வரி இல்லாத மதிப்பீடு பில்',
      descEn: 'Customer estimate bill without tax',
      icon: '📝',
      tag: lang === 'ta' ? 'மதிப்பீடு' : 'Estimate',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300'
    },
    {
      id: 'tax_invoice',
      labelTa: '2. ஜிஎஸ்டி விற்பனை பில் (வரியுடன்)',
      labelEn: '2. GST Sales Bill (With Tax)',
      descTa: 'சரக்கு மற்றும் சேவை வரியுடன் கூடிய விற்பனை பில்',
      descEn: 'Regular sales bill with GST tax',
      icon: '🧾',
      tag: lang === 'ta' ? 'வரியுடன்' : 'GST Tax',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    },
    {
      id: 'return_bill',
      labelTa: '3. திருப்பல் பில் (சரக்கு சேர்க்கப்படும்)',
      labelEn: '3. Return Bill (Sales Return)',
      descTa: 'பொருட்கள் திரும்பப் பெறல், வரி இல்லை, சரக்கு இருப்பு கூடும்',
      descEn: 'Customer returns item, no tax, updates stock',
      icon: '🔄',
      tag: lang === 'ta' ? 'திருப்பல்' : 'Return',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300'
    }
  ];

  // Active Billing Mode Label
  const currentModeInfo = billingOptions.find(o => o.id === billingMode) || billingOptions[1];

  // Concise labels so tabs never consume excessive width
  const navItems = [
    { id: 'pos', labelTa: 'பில்லிங் (F1)', labelEn: 'Billing (F1)', isDropdown: true },
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

  const handleSelectBillingOption = (modeId) => {
    if (setBillingMode) setBillingMode(modeId);
    setActiveTab('pos');
    setShowBillingDropdown(false);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('focus-pos-search'));
    }, 50);
  };

  // Keyboard navigation when billing dropdown is open (1, 2, 3, Arrows, Enter, Esc)
  useEffect(() => {
    if (!showBillingDropdown) return;

    const handleDropdownKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setShowBillingDropdown(false);
        window.dispatchEvent(new CustomEvent('focus-pos-search'));
      } else if (e.key === '1') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectBillingOption('estimate');
      } else if (e.key === '2') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectBillingOption('tax_invoice');
      } else if (e.key === '3') {
        e.preventDefault();
        e.stopPropagation();
        handleSelectBillingOption('return_bill');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedBillingIndex(prev => (prev < billingOptions.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        setHighlightedBillingIndex(prev => (prev > 0 ? prev - 1 : billingOptions.length - 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (highlightedBillingIndex >= 0 && highlightedBillingIndex < billingOptions.length) {
          handleSelectBillingOption(billingOptions[highlightedBillingIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleDropdownKeyDown, true);
    return () => window.removeEventListener('keydown', handleDropdownKeyDown, true);
  }, [showBillingDropdown, highlightedBillingIndex]);

  return (
    <header className="no-print bg-slate-900 text-white border-b-2 border-slate-700 select-none flex-shrink-0 w-full relative z-[100]">
      <div className="w-full px-2 py-1 flex items-center justify-between gap-1.5">
        
        {/* Center: Compact Navigation Tabs */}
        <nav className="flex items-center space-x-1 flex-shrink-0">
          {visibleNavItems.map(item => {
            const isActive = activeTab === item.id;
            const label = lang === 'ta' ? item.labelTa : item.labelEn;

            if (item.isDropdown) {
              return (
                <div key={item.id} ref={billingDropdownRef} className="relative z-[100]">
                  <button
                    onClick={() => {
                      if (activeTab !== 'pos') {
                        setActiveTab('pos');
                      }
                      window.dispatchEvent(new CustomEvent('close-pos-dropdowns'));
                      setShowBillingDropdown(prev => {
                        const next = !prev;
                        if (next) {
                          const idx = billingOptions.findIndex(o => o.id === billingMode);
                          setHighlightedBillingIndex(idx >= 0 ? idx : 0);
                        }
                        return next;
                      });
                    }}
                    className={`px-2 py-0.5 text-[11px] sm:text-xs font-semibold rounded border transition-colors whitespace-nowrap flex items-center space-x-1 ${
                      isActive
                        ? 'bg-emerald-700 text-white border-emerald-500 font-bold shadow-xs'
                        : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                    }`}
                  >
                    <span>{label}</span>
                    <span className="text-[9px] bg-slate-900/60 px-1 py-0.1 rounded font-bold border border-white/20">
                      {currentModeInfo.tag}
                    </span>
                    <span className="text-[10px] ml-0.5 leading-none">▾</span>
                  </button>

                  {/* Billing Mode Dropdown Menu */}
                  {showBillingDropdown && (
                    <div 
                      className="absolute left-0 top-full mt-1.5 w-84 bg-slate-900 border-2 border-emerald-500 rounded-md shadow-2xl z-[9999] py-1 overflow-hidden animate-fade-in text-slate-200"
                      style={{ minWidth: '22rem' }}
                    >
                      <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-[11px]">
                        <span className="font-bold text-white font-tamil">
                          {lang === 'ta' ? 'பில்லிங் முறையைத் தேர்வு செய்க [1, 2, 3]' : 'Select Billing Type [1, 2, 3]'}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono font-bold">[F1 / Esc]</span>
                      </div>

                      <div className="divide-y divide-slate-800">
                        {billingOptions.map((opt, optIdx) => {
                          const isSelected = billingMode === opt.id;
                          const isHighlighted = highlightedBillingIndex === optIdx;
                          return (
                            <button
                              key={opt.id}
                              onClick={() => handleSelectBillingOption(opt.id)}
                              onMouseEnter={() => setHighlightedBillingIndex(optIdx)}
                              className={`w-full text-left px-3 py-2 flex items-start space-x-2.5 transition-colors ${
                                isHighlighted
                                  ? 'bg-emerald-950/90 border-l-4 border-emerald-400 text-white'
                                  : isSelected
                                    ? 'bg-slate-800/80 border-l-4 border-emerald-500 text-white'
                                    : 'hover:bg-slate-800/90 text-slate-300'
                              }`}
                            >
                              <span className="text-base mt-0.5">{opt.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <div className="font-bold text-xs font-tamil text-white flex items-center space-x-1.5">
                                    <span>{lang === 'ta' ? opt.labelTa : opt.labelEn}</span>
                                    <span className="text-[10px] font-mono font-bold px-1 py-0.2 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                                      [{optIdx + 1}]
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <span className="text-emerald-400 text-xs font-bold font-mono">✓</span>
                                  )}
                                </div>
                                <div className="text-[10.5px] text-slate-400 font-tamil mt-0.5 leading-tight">
                                  {lang === 'ta' ? opt.descTa : opt.descEn}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setShowBillingDropdown(false);
                }}
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
