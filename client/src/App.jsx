import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import PosScreen from './components/PosScreen';
import ProductsScreen from './components/ProductsScreen';
import InvoicesScreen from './components/InvoicesScreen';
import ReportsScreen from './components/ReportsScreen';
import CustomersScreen from './components/CustomersScreen';
import SettingsScreen from './components/SettingsScreen';
import DesktopWorkspace from './components/DesktopWorkspace';
import LicenceModal from './components/LicenceModal';
import ShortcutsModal from './components/ShortcutsModal';
import BarcodeModal from './components/BarcodeModal';
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
  const [billingMode, setBillingMode] = useState('tax_invoice'); // 'estimate', 'tax_invoice', 'return_bill'
  const [showLicenceModal, setShowLicenceModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showBarcodeModal, setShowBarcodeModal] = useState(false);

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

  const titleName = lang === 'ta'
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை பில்லிங்')
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery Billing POS');

  useEffect(() => {
    document.title = titleName;
  }, [titleName]);

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
        window.dispatchEvent(new CustomEvent('toggle-billing-dropdown'));
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

      {/* Top Window Title Bar & Classic Desktop Menu Bar (Matches Screenshot) */}
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
        billingMode={billingMode}
        setBillingMode={setBillingMode}
        onOpenLicence={() => setShowLicenceModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onOpenBarcode={() => setShowBarcodeModal(true)}
      />

      {/* Main Screen Content */}
      <main className={`no-print flex-1 min-h-0 relative z-10 ${activeTab === 'pos' || activeTab === 'desktop' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto pb-4'}`}>
        {activeTab === 'desktop' && (
          <DesktopWorkspace
            storeSettings={storeSettings}
            lang={lang}
            onOpenScreen={(tab) => setActiveTab(tab)}
            setBillingMode={setBillingMode}
          />
        )}

        {activeTab === 'pos' && (
          <PosScreen
            products={products}
            customers={customers}
            storeSettings={storeSettings}
            lang={lang}
            t={t}
            onInvoiceCreated={handleInvoiceCreated}
            billingMode={billingMode}
            setBillingMode={setBillingMode}
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

      {/* Bottom Status Bar (Classic Desktop ERP Style) */}
      <footer className="no-print bg-[#f0f0f0] text-slate-700 px-3 py-0.5 border-t border-[#c8c8c8] text-xs flex flex-wrap items-center justify-between gap-1 font-sans flex-shrink-0 select-none">
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="font-bold text-purple-900">{lang === 'ta' ? 'குறுக்குவழிகள்:' : 'Shortcuts:'}</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[F1: Bill]</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[F2: New]</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[F4: Item]</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[F8: Save]</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[F9: Print]</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[F10: Hold]</span>
          <span className="bg-white px-1 border border-slate-300 rounded font-mono">[Alt+S: Search]</span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-600">
          <span>Service Ends on: <strong className="font-mono text-purple-900">29.06.2027</strong></span>
          <span>|</span>
          <span className="font-semibold">{currentUser ? `User: ${currentUser.name || currentUser.username}` : 'Ready'}</span>
        </div>
      </footer>

      {/* Modals */}
      <LicenceModal
        isOpen={showLicenceModal}
        onClose={() => setShowLicenceModal(false)}
        storeSettings={storeSettings}
        lang={lang}
      />

      <ShortcutsModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        lang={lang}
      />

      <BarcodeModal
        isOpen={showBarcodeModal}
        onClose={() => setShowBarcodeModal(false)}
        products={products}
        storeSettings={storeSettings}
        lang={lang}
      />

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
