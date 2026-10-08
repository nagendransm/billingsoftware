import React, { useState, useRef, useEffect } from 'react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  lang, 
  setLang, 
  storeSettings = {},
  lowStockCount = 0,
  currentUser = null,
  onLogout,
  billingMode = 'tax_invoice',
  setBillingMode,
  onOpenLicence,
  onOpenShortcuts,
  onOpenBarcode,
  onOpenUserManagement
}) {
  const [openMenu, setOpenMenu] = useState(null); // 'transactions' | 'masters' | 'accounts' | 'utility' | 'admin' | 'service' | 'licence' | 'exit'
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const menuBarRef = useRef(null);

  const shopName = lang === 'ta'
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'SRI KUMARAN SUPER MARKET')
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'SRI KUMARAN SUPER MARKET');

  const currentYear = new Date().getFullYear();

  // Mode code for center tag in Title Bar: { T } for Tax, { SO } for Sales Order, { R } for Return
  const modeCode = billingMode === 'return_bill' ? 'R' : billingMode === 'estimate' ? 'SO' : 'T';

  // Close menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Listen for F1 toggle or other global events
  useEffect(() => {
    const handleF1Toggle = () => {
      window.dispatchEvent(new CustomEvent('close-pos-dropdowns'));
      setOpenMenu(prev => (prev === 'transactions' ? null : 'transactions'));
      setHighlightedIndex(1); // Default highlight to Sales Bill
    };
    window.addEventListener('toggle-billing-dropdown', handleF1Toggle);
    return () => window.removeEventListener('toggle-billing-dropdown', handleF1Toggle);
  }, []);

  // Menu Items & Definitions
  const menuConfig = {
    transactions: {
      id: 'transactions',
      label: 'Transactions',
      hotkey: 't',
      items: [
        {
          id: 'sales_order',
          label: 'Sales Order',
          underlined: 'O',
          action: () => {
            if (setBillingMode) setBillingMode('estimate');
            setActiveTab('pos');
            setTimeout(() => window.dispatchEvent(new CustomEvent('focus-pos-search')), 50);
          }
        },
        {
          id: 'sales_bill',
          label: 'Sales Bill',
          underlined: 'B',
          action: () => {
            if (setBillingMode) setBillingMode('tax_invoice');
            setActiveTab('pos');
            setTimeout(() => window.dispatchEvent(new CustomEvent('focus-pos-search')), 50);
          }
        },
        {
          id: 'sales_return',
          label: 'Sales Return',
          underlined: 'R',
          action: () => {
            if (setBillingMode) setBillingMode('return_bill');
            setActiveTab('pos');
            setTimeout(() => window.dispatchEvent(new CustomEvent('focus-pos-search')), 50);
          }
        },
        {
          id: 'sales_ord_cancel',
          label: 'Sales Ord. Cancel',
          underlined: 'C',
          action: () => {
            setActiveTab('pos');
            window.dispatchEvent(new CustomEvent('open-held-bills'));
          }
        },
        { isDivider: true },
        {
          id: 'past_bills_search',
          label: 'Past Bills Search [Alt+S]',
          action: () => {
            setActiveTab('pos');
            window.dispatchEvent(new CustomEvent('open-past-bills-search'));
          }
        }
      ]
    },
    masters: {
      id: 'masters',
      label: 'Masters',
      hotkey: 'm',
      items: [
        {
          id: 'product_master',
          label: 'Product Master [F2]',
          action: () => setActiveTab('products')
        },
        {
          id: 'category_master',
          label: 'Category Master',
          action: () => setActiveTab('products')
        },
        {
          id: 'customer_master',
          label: 'Customer Master [F5]',
          action: () => setActiveTab('customers')
        },
        {
          id: 'price_stock',
          label: 'Price & Stock List',
          action: () => setActiveTab('products')
        }
      ]
    },
    accounts: {
      id: 'accounts',
      label: 'Accounts',
      hotkey: 'a',
      items: [
        {
          id: 'customer_ledger',
          label: 'Customer Ledger / Khata [F5]',
          action: () => setActiveTab('customers')
        },
        {
          id: 'sales_bills_book',
          label: 'Sales Bills / Day Book [F3]',
          action: () => setActiveTab('invoices')
        },
        {
          id: 'outstanding_balances',
          label: 'Outstanding Balances',
          action: () => setActiveTab('customers')
        }
      ]
    },
    utility: {
      id: 'utility',
      label: 'Utility',
      hotkey: 'u',
      items: [
        {
          id: 'gst_reports',
          label: 'GST Reports & Summary [F4]',
          action: () => setActiveTab('reports')
        },
        {
          id: 'past_bills',
          label: 'Past Bills Search [Alt+S]',
          action: () => {
            setActiveTab('pos');
            window.dispatchEvent(new CustomEvent('open-past-bills-search'));
          }
        },
        {
          id: 'sales_summary',
          label: 'Sales Performance Analytics',
          action: () => setActiveTab('reports')
        },
        {
          id: 'reprint_receipt',
          label: 'Reprint Past Invoices',
          action: () => setActiveTab('invoices')
        }
      ]
    },
    administration: {
      id: 'administration',
      label: 'Administration',
      hotkey: 'd',
      items: [
        {
          id: 'shop_profile',
          label: 'Shop Profile & Settings [F6]',
          action: () => setActiveTab('settings')
        },
        {
          id: 'printer_config',
          label: 'Printer Configuration',
          action: () => setActiveTab('settings')
        },
        {
          id: 'user_mgmt',
          label: 'User Management',
          action: () => {
            if (onOpenUserManagement) {
              onOpenUserManagement();
            } else {
              setActiveTab('settings');
            }
          }
        },
        {
          id: 'db_backup',
          label: 'Database Backup & Restore',
          action: () => setActiveTab('settings')
        },
        { isDivider: true },
        {
          id: 'toggle_lang',
          label: lang === 'ta' ? 'Switch to English' : 'தமிழுக்கு மாற்றவும் (Tamil)',
          action: () => setLang(lang === 'ta' ? 'en' : 'ta')
        }
      ]
    },
    service: {
      id: 'service',
      label: 'Customer Service',
      hotkey: 'c',
      items: [
        {
          id: 'keyboard_shortcuts',
          label: 'Keyboard Shortcuts Guide [F1-F12]',
          action: () => {
            if (onOpenShortcuts) onOpenShortcuts();
          }
        },
        {
          id: 'support_contact',
          label: 'Support & Help Desk',
          action: () => {
            if (onOpenLicence) onOpenLicence();
          }
        }
      ]
    },
    licence: {
      id: 'licence',
      label: 'Licence',
      hotkey: 'l',
      items: [
        {
          id: 'licence_details',
          label: 'Licence Information (Ends 29.06.2027)',
          action: () => {
            if (onOpenLicence) onOpenLicence();
          }
        },
        {
          id: 'about_software',
          label: 'About Nova POS Software',
          action: () => {
            if (onOpenLicence) onOpenLicence();
          }
        }
      ]
    },
    barcode: {
      id: 'barcode',
      label: 'Barcode Generation',
      hotkey: 'b',
      items: [
        {
          id: 'barcode_print',
          label: 'Barcode Label Printing [Alt+B]',
          action: () => {
            if (onOpenBarcode) onOpenBarcode();
          }
        }
      ]
    },
    exit: {
      id: 'exit',
      label: 'Exit',
      hotkey: 'x',
      items: [
        {
          id: 'to_desktop',
          label: 'Close to Desktop Wallpaper',
          action: () => setActiveTab('desktop')
        },
        {
          id: 'logout',
          label: 'Logout User',
          action: () => {
            if (onLogout) onLogout();
          }
        }
      ]
    }
  };

  const menuKeys = Object.keys(menuConfig);

  // Keyboard navigation for top menu bar and dropdowns
  useEffect(() => {
    if (!currentUser) return;

    const handleKeyDown = (e) => {
      // 1. If no menu is open:
      if (!openMenu) {
        // When on the home page ('desktop'), clicking ENTER or arrow keys opens Transactions menu!
        if (activeTab === 'desktop') {
          if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            setOpenMenu('transactions');
            setHighlightedIndex(0);
            return;
          }
        }

        // F10 opens menu bar from anywhere
        if (e.key === 'F10') {
          e.preventDefault();
          e.stopPropagation();
          setOpenMenu('transactions');
          setHighlightedIndex(0);
          return;
        }

        // Alt + Hotkey combinations
        if (e.altKey) {
          const char = e.key.toLowerCase();
          for (const [key, menu] of Object.entries(menuConfig)) {
            if (menu.hotkey === char) {
              e.preventDefault();
              e.stopPropagation();
              setOpenMenu(key);
              setHighlightedIndex(0);
              return;
            }
          }
        }
        return;
      }

      // 2. When a menu IS OPEN (Navigate top menu bar with ONLY keyboard up down right left keys):
      const currentMenu = menuConfig[openMenu];
      if (!currentMenu || !currentMenu.items) return;

      const validItems = currentMenu.items.filter(it => !it.isDivider);

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        const currentIdx = menuKeys.indexOf(openMenu);
        const nextKey = menuKeys[(currentIdx + 1) % menuKeys.length];
        setOpenMenu(nextKey);
        setHighlightedIndex(0);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        const currentIdx = menuKeys.indexOf(openMenu);
        const prevKey = menuKeys[(currentIdx - 1 + menuKeys.length) % menuKeys.length];
        setOpenMenu(prevKey);
        setHighlightedIndex(0);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        if (validItems.length > 0) {
          setHighlightedIndex(prev => (prev < validItems.length - 1 ? prev + 1 : 0));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        if (validItems.length > 0) {
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : validItems.length - 1));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (validItems[highlightedIndex]) {
          validItems[highlightedIndex].action();
          setOpenMenu(null);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        setOpenMenu(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [currentUser, activeTab, openMenu, highlightedIndex]);

  return (
    <div ref={menuBarRef} className="no-print w-full flex-shrink-0 select-none relative z-[1000]">
      
      {/* 1. Top Title Bar / Window Header (Matching the Screenshot Exactly) */}
      <div 
        className="w-full bg-white text-slate-900 border-b border-slate-300 px-3 flex items-center justify-between text-xs font-sans tracking-tight"
        style={{ height: '30px', WebkitAppRegion: 'drag' }}
      >
        {/* Left: Software Logo & Shop Name */}
        <div className="flex items-center space-x-2 font-normal truncate" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Logo icon matching the screenshot */}
          <span className="text-purple-700 text-sm font-bold flex items-center">
            ❖
          </span>
          <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-900">
            <span className="font-bold">Nova Software :</span>
            <span className="tracking-wide font-tamil">{shopName} - {currentYear}</span>
          </div>
        </div>

        {/* Center: Mode Indicator Tag e.g. { T } */}
        <div className="hidden sm:flex items-center space-x-1 font-mono font-bold text-xs text-slate-800" style={{ WebkitAppRegion: 'no-drag' }}>
          <span>&#123;</span>
          <span className={modeCode === 'T' ? 'text-purple-800' : modeCode === 'E' ? 'text-amber-800' : 'text-rose-800'}>
            {modeCode}
          </span>
          <span>&#125;</span>
        </div>

        {/* Right: Service Expiry Info & Window Controls */}
        <div className="flex items-center space-x-4" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="text-[11px] text-slate-600 font-medium whitespace-nowrap">
            ( Service Ends on : <span className="font-mono font-bold text-slate-900">29.06.2027</span> )
          </div>

          {/* Desktop Window Controls (Minimize, Maximize, Close) */}
          <div className="flex items-center h-full">
            <button 
              onClick={() => setActiveTab('desktop')}
              title="Minimize to Desktop Workspace"
              className="h-6 w-7 flex items-center justify-center hover:bg-slate-200 text-slate-700 text-xs transition-colors"
            >
              —
            </button>
            <button 
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                } else {
                  document.documentElement.requestFullscreen().catch(() => {});
                }
              }}
              title="Maximize / Toggle Fullscreen"
              className="h-6 w-7 flex items-center justify-center hover:bg-slate-200 text-slate-700 text-[11px] transition-colors"
            >
              ▢
            </button>
            <button 
              onClick={() => {
                if (onLogout) onLogout();
                setActiveTab('desktop');
              }}
              title="Close / Exit"
              className="h-6 w-7 flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-700 text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* 2. Classic Desktop Menu Bar (Transactions, Masters, Accounts...) */}
      <nav 
        className="w-full bg-[#f0f0f0] border-b border-[#c8c8c8] px-1 flex items-center space-x-0.5 text-xs text-slate-800 font-sans shadow-2xs relative z-[1001]"
        style={{ minHeight: '26px' }}
      >
        {menuKeys.map((menuKey) => {
          const menu = menuConfig[menuKey];
          const isOpen = openMenu === menuKey;

          return (
            <div key={menuKey} className="relative">
              <button
                onClick={() => {
                  setOpenMenu(prev => (prev === menuKey ? null : menuKey));
                  setHighlightedIndex(0);
                }}
                onMouseEnter={() => {
                  if (openMenu && openMenu !== menuKey) {
                    setOpenMenu(menuKey);
                    setHighlightedIndex(0);
                  }
                }}
                className={`px-2 py-0.5 rounded-none transition-colors text-xs font-normal whitespace-nowrap ${
                  isOpen 
                    ? 'bg-[#6a1b6b] text-white font-semibold' 
                    : 'hover:bg-slate-300 text-slate-800'
                }`}
              >
                {menu.label}
              </button>

              {/* Classic Desktop Dropdown Menu (Exact match of screenshot) */}
              {isOpen && menu.items && (
                <div 
                  className="absolute left-0 top-full bg-[#f3f4f6] border border-slate-400 shadow-2xl z-[99999] min-w-[12rem] py-0.5 text-slate-800 animate-fade-in"
                  style={{ minWidth: menuKey === 'transactions' ? '12.5rem' : '14rem' }}
                >
                  {menu.items.map((item, itemIdx) => {
                    if (item.isDivider) {
                      return <div key={`div-${itemIdx}`} className="border-t border-slate-300 my-0.5" />;
                    }

                    // Count valid index excluding dividers
                    const validList = menu.items.filter(it => !it.isDivider);
                    const currentValidIdx = validList.indexOf(item);
                    const isHighlighted = highlightedIndex === currentValidIdx;

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action();
                          setOpenMenu(null);
                        }}
                        onMouseEnter={() => setHighlightedIndex(currentValidIdx)}
                        className={`w-full text-left px-3 py-1 text-xs block transition-colors leading-tight ${
                          isHighlighted
                            ? 'bg-[#6a1b6b] text-white font-semibold'
                            : 'hover:bg-[#6a1b6b] hover:text-white text-slate-900'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Low Stock Alert Badge (if any) */}
        {lowStockCount > 0 && (
          <button
            onClick={() => setActiveTab('products')}
            className="ml-auto text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.2 rounded font-mono shadow-2xs"
            title="Low Stock Items"
          >
            Alert: {lowStockCount} Low
          </button>
        )}
      </nav>

    </div>
  );
}
