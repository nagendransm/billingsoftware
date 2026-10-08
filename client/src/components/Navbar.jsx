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
  const allMenuConfig = {
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
          label: 'System & Licence Information',
          action: () => {
            if (onOpenLicence) onOpenLicence();
          }
        },
        {
          id: 'about_software',
          label: 'About Supermarket GST POS Software',
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

  // For user role: only allow access to transactions menu, customer master only, and exit
  const isUserRole = currentUser?.role === 'user';
  const menuConfig = isUserRole
    ? {
        transactions: allMenuConfig.transactions,
        masters: {
          id: 'masters',
          label: 'Masters',
          hotkey: 'm',
          items: [
            {
              id: 'customer_master',
              label: 'Customer Master [F5]',
              action: () => setActiveTab('customers')
            }
          ]
        },
        exit: allMenuConfig.exit
      }
    : allMenuConfig;

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

  if (!currentUser) return null;

  return (
    <div ref={menuBarRef} className="no-print w-full flex-shrink-0 select-none relative z-[1000]">
      
      {/* 1. Modern Top Title Bar / Window Header */}
      <div 
        className="w-full bg-[#0f172a] text-slate-100 border-b border-slate-800 px-3 flex items-center justify-between text-xs font-sans tracking-tight"
        style={{ height: '32px', WebkitAppRegion: 'drag' }}
      >
        {/* Left: Store Brand & Name */}
        <div className="flex items-center space-x-2.5 truncate" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="w-5 h-5 rounded bg-emerald-600 flex items-center justify-center text-white text-xs font-bold shadow-xs">
            🛒
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <span className="font-bold tracking-tight text-white font-tamil">{shopName}</span>
            <span className="text-slate-600 font-mono text-[11px]">|</span>
            <span className="text-emerald-400 font-medium text-[11px]">GST POS Billing</span>
          </div>
        </div>

        {/* Center: Mode Indicator Pill Badge */}
        <div className="hidden sm:flex items-center space-x-2" style={{ WebkitAppRegion: 'no-drag' }}>
          <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase font-mono shadow-xs border ${
            modeCode === 'T' 
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
              : modeCode === 'SO'
              ? 'bg-sky-950/80 text-sky-300 border-sky-700/60'
              : 'bg-rose-950/80 text-rose-300 border-rose-700/60'
          }`}>
            {modeCode === 'T' ? '● TAX INVOICE [T]' : modeCode === 'SO' ? '● SALES ORDER [SO]' : '● SALES RETURN [R]'}
          </span>
        </div>

        {/* Right: Active User & Modern Window Controls */}
        <div className="flex items-center space-x-3" style={{ WebkitAppRegion: 'no-drag' }}>
          {currentUser && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
              <span>{currentUser.role === 'root' ? '👑' : currentUser.role === 'admin' ? '🛡️' : '👤'}</span>
              <span className="font-semibold text-slate-200">{currentUser.name || currentUser.username}</span>
              <span className="text-[9px] uppercase tracking-wider px-1 py-0.2 rounded bg-slate-700 text-slate-300 font-bold">
                {currentUser.role}
              </span>
            </div>
          )}

          {/* Window Controls */}
          <div className="flex items-center h-full space-x-1">
            <button 
              onClick={() => setActiveTab('desktop')}
              title="Minimize to Desktop Workspace"
              className="h-6 w-7 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white text-xs transition-colors"
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
              className="h-6 w-7 rounded flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-white text-[11px] transition-colors"
            >
              ▢
            </button>
            <button 
              onClick={() => {
                if (onLogout) onLogout();
                setActiveTab('desktop');
              }}
              title="Close / Exit"
              className="h-6 w-7 rounded flex items-center justify-center hover:bg-rose-600 hover:text-white text-slate-400 text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      {/* 2. Modern Navigation Menu Bar (Transactions, Masters, Accounts...) */}
      <nav 
        className="w-full bg-[#1e293b] border-b border-slate-700/80 px-2 flex items-center space-x-1 text-xs text-slate-200 font-sans shadow-md relative z-[1001]"
        style={{ minHeight: '28px' }}
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
                className={`px-2.5 py-1 rounded text-xs font-medium tracking-wide transition-all ${
                  isOpen 
                    ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                    : 'hover:bg-slate-700 text-slate-200 hover:text-white'
                }`}
              >
                {menu.label}
              </button>

              {/* Modern Dropdown Menu */}
              {isOpen && menu.items && (
                <div 
                  className="absolute left-0 top-full bg-[#0f172a]/95 backdrop-blur-md border border-slate-700 shadow-2xl rounded-lg z-[99999] min-w-[13.5rem] p-1 text-slate-200 animate-fade-in"
                  style={{ minWidth: menuKey === 'transactions' ? '13rem' : '14.5rem' }}
                >
                  {menu.items.map((item, itemIdx) => {
                    if (item.isDivider) {
                      return <div key={`div-${itemIdx}`} className="border-t border-slate-700/70 my-1" />;
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
                        className={`w-full text-left px-3 py-1.5 text-xs rounded transition-all flex items-center justify-between ${
                          isHighlighted
                            ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                            : 'hover:bg-slate-800 hover:text-white text-slate-300'
                        }`}
                      >
                        <span>{item.label}</span>
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
            className="ml-auto text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2.5 py-0.5 rounded font-mono shadow-xs"
            title="Low Stock Items"
          >
            Alert: {lowStockCount} Low Stock
          </button>
        )}
      </nav>

    </div>
  );
}
