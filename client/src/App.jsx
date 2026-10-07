import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PosScreen from './components/PosScreen';
import ProductsScreen from './components/ProductsScreen';
import InvoicesScreen from './components/InvoicesScreen';
import ReportsScreen from './components/ReportsScreen';
import CustomersScreen from './components/CustomersScreen';
import SettingsScreen from './components/SettingsScreen';
import ReceiptModal from './components/ReceiptModal';
import LoginModal from './components/LoginModal';
import { translations } from './translations';

export default function App() {
  const [lang, setLang] = useState('en'); // 'en' for English functions, product names in Tamil
  const [activeTab, setActiveTab] = useState('pos');
  const [storeSettings, setStoreSettings] = useState({});
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Authentication State (Admin or User) - default to admin so app never renders blank
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem('pos_user');
        if (saved) return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('localStorage error:', e);
    }
    return { id: 1, username: 'admin', role: 'admin', name: 'Administrator' };
  });

  const handleLogin = (user) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('pos_user', JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
    setActiveTab('pos');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('pos_user');
    } catch (e) {
      console.error(e);
    }
    setActiveTab('pos');
  };

  const t = translations[lang] || translations.ta;

  // Load Initial Data
  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      if (data.success) {
        setStoreSettings(data.data);
        if (data.data.default_language) {
          setLang(data.data.default_language);
        }
      }
    } catch (err) {
      console.error('Settings load error:', err);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.data);
      }
    } catch (err) {
      console.error('Products load error:', err);
    }
  };

  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      const data = await res.json();
      if (data.success) {
        setCategories(data.data);
      }
    } catch (err) {
      console.error('Categories load error:', err);
    }
  };

  const loadCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (err) {
      console.error('Customers load error:', err);
    }
  };

  useEffect(() => {
    loadSettings();
    loadProducts();
    loadCategories();
    loadCustomers();
  }, []);

  useEffect(() => {
    const titleName = lang === 'ta'
      ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை பில்லிங்')
      : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery Billing POS');
    document.title = titleName;
  }, [storeSettings, lang]);

  // Tab Hotkeys (F1 to F6) - Bulletproof with capture phase & role check
  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  useEffect(() => {
    const handleTabKeys = (e) => {
      const user = currentUserRef.current;
      const isAdmin = user && user.role === 'admin';

      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        setActiveTab('pos');
      } else if (e.key === 'F2') {
        // Only switch to Products if admin and NOT on POS (POS uses F2 for New Bill)
        // If on POS screen, PosScreen's own listener handles F2 for New Bill!
      } else if (e.key === 'F3') {
        if (isAdmin) {
          e.preventDefault();
          e.stopPropagation();
          setActiveTab('invoices');
        }
      } else if (e.key === 'F5') {
        if (isAdmin) {
          e.preventDefault();
          e.stopPropagation();
          setActiveTab('customers');
        }
      } else if (e.key === 'F6') {
        if (isAdmin) {
          e.preventDefault();
          e.stopPropagation();
          setActiveTab('settings');
        }
      }
    };
    window.addEventListener('keydown', handleTabKeys, true);
    return () => window.removeEventListener('keydown', handleTabKeys, true);
  }, []);

  // Calculate low stock count
  const lowStockCount = products.filter(p => p.stock_quantity <= p.min_stock_alert).length;

  // Callback when bill is created
  const handleInvoiceCreated = (invoiceData, shouldPrint = true) => {
    setActiveInvoice(invoiceData);
    setIsReceiptOpen(true);
    loadProducts();
    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  // View past invoice
  const handleViewInvoice = (invoiceData, shouldPrint = false) => {
    setActiveInvoice(invoiceData);
    setIsReceiptOpen(true);
    if (shouldPrint) {
      setTimeout(() => {
        window.print();
      }, 300);
    }
  };

  const isAdmin = currentUser && currentUser.role === 'admin';

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-100 flex flex-col font-sans text-slate-800">
      
      {/* Login Modal when not signed in */}
      {!currentUser && (
        <LoginModal onLogin={handleLogin} lang={lang} />
      )}

      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lang={lang}
        setLang={setLang}
        t={t}
        storeSettings={storeSettings}
        lowStockCount={lowStockCount}
        currentUser={currentUser}
        onLogout={handleLogout}
      />

      {/* Main Tab Screen Content */}
      <main className={`no-print flex-1 min-h-0 ${activeTab === 'pos' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-4'}`}>
        {activeTab === 'pos' && (
          <PosScreen
            products={products}
            customers={customers}
            storeSettings={storeSettings}
            lang={lang}
            t={t}
            onInvoiceCreated={handleInvoiceCreated}
          />
        )}

        {isAdmin && activeTab === 'products' && (
          <ProductsScreen
            products={products}
            categories={categories}
            lang={lang}
            t={t}
            onRefresh={loadProducts}
          />
        )}

        {isAdmin && activeTab === 'invoices' && (
          <InvoicesScreen
            lang={lang}
            t={t}
            onViewInvoice={handleViewInvoice}
          />
        )}

        {isAdmin && activeTab === 'reports' && (
          <ReportsScreen
            lang={lang}
            t={t}
          />
        )}

        {isAdmin && activeTab === 'customers' && (
          <CustomersScreen
            customers={customers}
            lang={lang}
            t={t}
            onRefresh={loadCustomers}
          />
        )}

        {isAdmin && activeTab === 'settings' && (
          <SettingsScreen
            storeSettings={storeSettings}
            lang={lang}
            t={t}
            onSave={(newSettings) => setStoreSettings(newSettings)}
            onRefreshProducts={loadProducts}
            onRefreshCustomers={loadCustomers}
          />
        )}
      </main>

      {/* Bottom Status Bar */}
      <footer className="no-print bg-slate-900 text-slate-300 px-3 py-1 border-t border-slate-700 text-[10px] sm:text-[11px] flex flex-wrap items-center justify-between gap-1 font-mono flex-shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-emerald-400">குறுக்குவழிகள்:</span>
          <span>[F1: பில்லிங்]</span>
          <span>[F2: புதிய பில்]</span>
          <span>[F4: தேடுதல்]</span>
          <span>[F8: சேமி]</span>
          <span>[F9: அச்சிடு]</span>
          <span>[F10: நிறுத்து]</span>
        </div>

        <div className="text-slate-400 font-tamil">
          தமிழ்நாடு ஜிஎஸ்டி (State Code: 33) | ஆஃப்லைன் பில்லிங் மென்பொருள்
        </div>
      </footer>

      {/* Receipt Modal (Thermal 80mm/58mm & A4 Tax Invoice) */}
      <ReceiptModal
        invoice={activeInvoice}
        storeSettings={storeSettings}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        lang={lang}
        t={t}
      />

    </div>
  );
}
