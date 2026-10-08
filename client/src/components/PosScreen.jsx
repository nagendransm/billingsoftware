import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function PosScreen({
  products = [],
  customers = [],
  storeSettings = {},
  lang = 'ta',
  t = {},
  onInvoiceCreated,
  billingMode = 'tax_invoice',
  setBillingMode
}) {
  // Cart & Bill State
  const [cart, setCart] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Cash');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerSearch, setCustomerSearch] = useState('Cash');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMode, setPaymentMode] = useState('cash'); // 'cash', 'upi', 'card', 'credit'
  const [cashReceived, setCashReceived] = useState('');
  const [additionalDiscount, setAdditionalDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Item Entry Inputs (Fast Counter Entry)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [entryQty, setEntryQty] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');

  // Held Bills
  const [heldBills, setHeldBills] = useState([]);

  // Live UPI QR
  const [liveUpiUrl, setLiveUpiUrl] = useState('');

  // Past Invoices Navigation State
  const [pastInvoices, setPastInvoices] = useState([]);
  const [pastBillIndex, setPastBillIndex] = useState(-1); // -1 = active new bill, 0 = latest past bill, 1 = older...
  const [viewingPastBill, setViewingPastBill] = useState(null);
  const [draftBill, setDraftBill] = useState(null);

  // Alt+S Past Bills Search Modal State
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchDate, setSearchDate] = useState(() => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  });
  const [searchBillNo, setSearchBillNo] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [showModalCustDropdown, setShowModalCustDropdown] = useState(false);
  const [modalCustHighlightIndex, setModalCustHighlightIndex] = useState(0);
  const [modalInvoices, setModalInvoices] = useState([]);
  const [loadingModalInvoices, setLoadingModalInvoices] = useState(false);
  const [selectedInvoiceIndex, setSelectedInvoiceIndex] = useState(0);

  // Refs
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownListRef = useRef(null);
  const qtyInputRef = useRef(null);
  const customerDropdownRef = useRef(null);
  const searchModalDateInputRef = useRef(null);
  const searchModalBillNoInputRef = useRef(null);
  const searchModalCustInputRef = useRef(null);
  const modalCustDropdownRef = useRef(null);

  // Auto-focus search on load
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Fetch past invoices list for keyboard browsing
  const loadPastInvoices = async () => {
    try {
      const res = await fetch('/api/invoices?limit=100');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setPastInvoices(data.data);
      }
    } catch (err) {
      console.error('Failed to load past invoices:', err);
    }
  };

  useEffect(() => {
    loadPastInvoices();
  }, []);

  // Next Bill Number calculation
  const nextBillNo = React.useMemo(() => {
    if (billingMode === 'estimate') {
      const lastEst = pastInvoices.find(inv => inv.bill_type === 'estimate' || inv.invoice_no?.startsWith('SO/') || inv.invoice_no?.startsWith('EST/'));
      if (lastEst && lastEst.invoice_no) {
        const m = lastEst.invoice_no.match(/(\d+)$/);
        if (m) return `SO/${parseInt(m[1], 10) + 1}`;
      }
      return 'SO/1001';
    }
    if (billingMode === 'return_bill') {
      const lastRet = pastInvoices.find(inv => inv.bill_type === 'return_bill' || inv.invoice_no?.startsWith('RET/'));
      if (lastRet && lastRet.invoice_no) {
        const m = lastRet.invoice_no.match(/(\d+)$/);
        if (m) return `RET/${parseInt(m[1], 10) + 1}`;
      }
      return 'RET/1001';
    }
    const prefix = storeSettings.bill_prefix || 'BILL/';
    if (storeSettings.next_bill_number) {
      return `${prefix}${storeSettings.next_bill_number}`;
    }
    if (pastInvoices.length > 0) {
      const topId = pastInvoices[0].id || 0;
      return `${prefix}${1001 + topId}`;
    }
    return `${prefix}1001`;
  }, [storeSettings, pastInvoices, billingMode]);

  // Load a past bill by index (-1 = return to new bill draft)
  const loadPastBill = async (index) => {
    if (index < 0) {
      // Returning to new bill mode
      setPastBillIndex(-1);
      setViewingPastBill(null);
      if (draftBill) {
        setCart(draftBill.cart || []);
        setSelectedCustomerId(draftBill.selectedCustomerId || '');
        setCustomerName(draftBill.customerName || 'Cash');
        setCustomerSearch(draftBill.customerName || 'Cash');
        setCustomerPhone(draftBill.customerPhone || '');
        setCustomerGstin(draftBill.customerGstin || '');
        setPaymentMode(draftBill.paymentMode || 'cash');
        setCashReceived(draftBill.cashReceived || '');
        setAdditionalDiscount(draftBill.additionalDiscount || 0);
        setNotes(draftBill.notes || '');
        setDraftBill(null);
      }
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
      return;
    }

    if (index >= pastInvoices.length) {
      return; // Reached oldest past bill
    }

    // Save current active bill draft before browsing past bills
    if (pastBillIndex === -1) {
      setDraftBill({
        cart,
        selectedCustomerId,
        customerName,
        customerPhone,
        customerGstin,
        paymentMode,
        cashReceived,
        additionalDiscount,
        notes
      });
    }

    const inv = pastInvoices[index];
    if (!inv) return;

    try {
      const res = await fetch(`/api/invoices/${inv.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPastBillIndex(index);
        setViewingPastBill(data.data);
      }
    } catch (err) {
      console.error('Failed to load past invoice details:', err);
    }
  };

  // Load a specific invoice directly (e.g. from Alt+S search modal)
  const loadSpecificInvoice = async (invoiceId) => {
    if (pastBillIndex === -1) {
      setDraftBill({
        cart,
        selectedCustomerId,
        customerName,
        customerPhone,
        customerGstin,
        paymentMode,
        cashReceived,
        additionalDiscount,
        notes
      });
    }

    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (data.success && data.data) {
        // Find index in pastInvoices list if present
        const idx = pastInvoices.findIndex(p => p.id === Number(invoiceId));
        setPastBillIndex(idx !== -1 ? idx : 0);
        setViewingPastBill(data.data);
        setShowSearchModal(false);
      }
    } catch (err) {
      console.error('Failed to load specific invoice:', err);
    }
  };

  // Search past invoices for the Alt+S modal
  const fetchFilteredInvoices = async (dateVal, billNoVal, custVal) => {
    setLoadingModalInvoices(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '100');
      if (dateVal) params.append('date', dateVal);
      if (billNoVal) params.append('invoice_no', billNoVal.trim());
      if (custVal) params.append('customer_name', custVal.trim());

      const res = await fetch(`/api/invoices?${params.toString()}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setModalInvoices(data.data);
      }
    } catch (err) {
      console.error('Failed to search invoices:', err);
    } finally {
      setLoadingModalInvoices(false);
    }
  };

  // Open Alt+S search modal
  const handleOpenSearchModal = () => {
    // Ensure current date is set in DD/MM/YYYY
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const todayStr = `${day}/${month}/${year}`;
    setSearchDate(todayStr);

    setShowSearchModal(true);
    setSelectedInvoiceIndex(0);
    setShowModalCustDropdown(false);
    fetchFilteredInvoices(todayStr, searchBillNo, searchCustomer);
    setTimeout(() => {
      if (searchModalDateInputRef.current) {
        searchModalDateInputRef.current.focus();
        searchModalDateInputRef.current.select();
      }
    }, 100);
  };

  const handlePrevBill = () => {
    if (pastInvoices.length === 0) return;
    loadPastBill(pastBillIndex + 1);
  };

  const handleNextBill = () => {
    if (pastBillIndex >= 0) {
      loadPastBill(pastBillIndex - 1);
    }
  };

  const handleReturnToNewBill = () => {
    loadPastBill(-1);
  };

  // Global Keyboard Shortcuts (F1, F2: New, F4: Search, F8: Save, F9: Print, F10: Hold, Up/Down: Past Bills)
  // Latest state references so shortcuts NEVER get stale or miss keystrokes
  const cartRef = useRef(cart);
  cartRef.current = cart;
  const viewingPastBillRef = useRef(viewingPastBill);
  viewingPastBillRef.current = viewingPastBill;

  // Function references so keyboard listener NEVER executes stale closures
  const handleSaveBillRef = useRef(null);
  const handleHoldBillRef = useRef(null);
  const handleReturnToNewBillRef = useRef(null);
  const handlePrevBillRef = useRef(null);
  const handleNextBillRef = useRef(null);
  const handleOpenSearchModalRef = useRef(null);
  const showSearchModalRef = useRef(showSearchModal);
  showSearchModalRef.current = showSearchModal;

  handleReturnToNewBillRef.current = handleReturnToNewBill;
  handlePrevBillRef.current = handlePrevBill;
  handleNextBillRef.current = handleNextBill;
  handleOpenSearchModalRef.current = handleOpenSearchModal;

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Alt + S to open Past Bills Search Modal
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        e.stopPropagation();
        if (handleOpenSearchModalRef.current) handleOpenSearchModalRef.current();
        return;
      }

      // Close modal on Escape if open
      if (e.key === 'Escape') {
        if (showSearchModalRef.current) {
          e.preventDefault();
          e.stopPropagation();
          setShowSearchModal(false);
          return;
        }
        if (viewingPastBillRef.current && handleReturnToNewBillRef.current) {
          e.preventDefault();
          handleReturnToNewBillRef.current();
          return;
        }
      }

      // Reliable function key handling across all browser/electron states
      if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        if (handleReturnToNewBillRef.current) handleReturnToNewBillRef.current();
      } else if (e.key === 'F4') {
        e.preventDefault();
        e.stopPropagation();
        if (viewingPastBillRef.current && handleReturnToNewBillRef.current) {
          handleReturnToNewBillRef.current();
        }
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      } else if (e.key === 'F8') {
        e.preventDefault();
        e.stopPropagation();
        if (!viewingPastBillRef.current && handleSaveBillRef.current) {
          handleSaveBillRef.current(false);
        }
      } else if (e.key === 'F9') {
        e.preventDefault();
        e.stopPropagation();
        if (viewingPastBillRef.current) {
          if (onInvoiceCreated) onInvoiceCreated(viewingPastBillRef.current, true);
        } else if (handleSaveBillRef.current) {
          handleSaveBillRef.current(true);
        }
      } else if (e.key === 'F10') {
        e.preventDefault();
        e.stopPropagation();
        if (!viewingPastBillRef.current && handleHoldBillRef.current) {
          handleHoldBillRef.current();
        }
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        if (handlePrevBillRef.current) handlePrevBillRef.current();
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        if (handleNextBillRef.current) handleNextBillRef.current();
      } else if (e.key === 'Escape') {
        if (viewingPastBillRef.current && handleReturnToNewBillRef.current) {
          e.preventDefault();
          handleReturnToNewBillRef.current();
        }
      } else if (e.key === 'ArrowUp') {
        if (viewingPastBillRef.current) {
          e.preventDefault();
          if (handlePrevBillRef.current) handlePrevBillRef.current();
        } else if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          if (handlePrevBillRef.current) handlePrevBillRef.current();
        }
      } else if (e.key === 'ArrowDown') {
        if (viewingPastBillRef.current) {
          e.preventDefault();
          if (handleNextBillRef.current) handleNextBillRef.current();
        }
      }
    };

    const handleTriggerSearch = () => {
      if (handleOpenSearchModalRef.current) handleOpenSearchModalRef.current();
    };
    window.addEventListener('open-past-bills-search', handleTriggerSearch);

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('open-past-bills-search', handleTriggerSearch);
    };
  }, []);

  // Alphabetical sorting helper (Tamil Unicode aware & English)
  const sortProductsAlphabetically = (items, currentLang = 'ta') => {
    return [...items].sort((a, b) => {
      const nameA = currentLang === 'ta'
        ? (a.name_ta || a.name_en || '')
        : (a.name_en || a.name_ta || '');
      const nameB = currentLang === 'ta'
        ? (b.name_ta || b.name_en || '')
        : (b.name_en || b.name_ta || '');
      return nameA.trim().localeCompare(nameB.trim(), currentLang === 'ta' ? 'ta' : 'en', {
        numeric: true,
        sensitivity: 'base'
      });
    });
  };

  // Helper to list ALL products in alphabetical order
  const showAllAlphabeticalProducts = () => {
    const allSorted = sortProductsAlphabetically(products, lang);
    setSearchResults(allSorted);
    setHighlightedIndex(0);
  };

  // Close dropdown on outside click or global navbar event
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    const handleGlobalClose = () => {
      setSearchResults([]);
      setShowCustomerDropdown(false);
    };
    const handleFocusSearch = () => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('close-pos-dropdowns', handleGlobalClose);
    window.addEventListener('focus-pos-search', handleFocusSearch);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('close-pos-dropdowns', handleGlobalClose);
      window.removeEventListener('focus-pos-search', handleFocusSearch);
    };
  }, []);

  // Live Search filter with preference: Product Name first, Barcode secondary (excluded when typing letters)
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      return;
    }

    const q = trimmed.toLowerCase();
    // Detect if search query contains letters (English a-z or Tamil characters \u0B80-\u0BFF)
    const hasLetters = /[a-zA-Z\u0B80-\u0BFF]/.test(trimmed);

    // 1. First Preference: Search Product Name in Tamil and English
    const nameMatches = products.filter(p => 
      (p.name_ta && p.name_ta.toLowerCase().includes(q)) ||
      (p.name_en && p.name_en.toLowerCase().includes(q))
    );

    // Sort name matches: exact match -> startsWith -> other matches, alphabetically sorted within each tier
    const sortedNameMatches = [...nameMatches].sort((a, b) => {
      const aTa = (a.name_ta || '').toLowerCase();
      const bTa = (b.name_ta || '').toLowerCase();
      const aEn = (a.name_en || '').toLowerCase();
      const bEn = (b.name_en || '').toLowerCase();

      const aExact = aTa === q || aEn === q;
      const bExact = bTa === q || bEn === q;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = aTa.startsWith(q) || aEn.startsWith(q);
      const bStarts = bTa.startsWith(q) || bEn.startsWith(q);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      const nameA = lang === 'ta' ? (a.name_ta || a.name_en || '') : (a.name_en || a.name_ta || '');
      const nameB = lang === 'ta' ? (b.name_ta || b.name_en || '') : (b.name_en || b.name_ta || '');
      return nameA.trim().localeCompare(nameB.trim(), lang === 'ta' ? 'ta' : 'en', {
        numeric: true,
        sensitivity: 'base'
      });
    });

    // 2. Barcode Matching:
    // When typing letters: do NOT search barcode substring!
    // Only if exact barcode match exists (e.g. manual alphanumeric code), include it after name matches.
    // When typing numbers or digits: search barcode, but name matches STILL have first preference!
    let barcodeMatches = [];
    if (!hasLetters) {
      barcodeMatches = products.filter(p => p.barcode && p.barcode.toLowerCase().includes(q));
      barcodeMatches.sort((a, b) => {
        const aExact = (a.barcode || '').toLowerCase() === q;
        const bExact = (b.barcode || '').toLowerCase() === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        const aStarts = (a.barcode || '').toLowerCase().startsWith(q);
        const bStarts = (b.barcode || '').toLowerCase().startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
    } else {
      const exact = products.find(p => p.barcode && p.barcode.toLowerCase() === q);
      if (exact) {
        barcodeMatches = [exact];
      }
    }

    // Combine: Name matches are always first preference, barcode matches appended if not already present
    const combined = [...sortedNameMatches];
    const seenIds = new Set(sortedNameMatches.map(p => p.id));
    for (const bm of barcodeMatches) {
      if (!seenIds.has(bm.id)) {
        combined.push(bm);
        seenIds.add(bm.id);
      }
    }

    setSearchResults(combined);
    setHighlightedIndex(0);
  }, [searchQuery, products, lang]);

  // Auto-scroll dropdown to keep highlighted item visible during keyboard navigation
  useEffect(() => {
    if (dropdownListRef.current && searchResults.length > 0) {
      const activeEl = dropdownListRef.current.children[highlightedIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, searchResults]);

  // Select Item from search dropdown
  const handleSelectProduct = (product) => {
    if (!product) return;
    setSelectedProduct(product);
    setSearchQuery(lang === 'ta' ? product.name_ta : product.name_en);
    setEntryPrice(String(product.selling_price));
    setSearchResults([]);
    setHighlightedIndex(0);
    if (qtyInputRef.current) {
      qtyInputRef.current.focus();
      qtyInputRef.current.select();
    }
  };

  // Add Item to Bill
  const handleAddItemToBill = () => {
    let prod = selectedProduct;
    if (!prod && searchResults.length > 0 && highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
      prod = searchResults[highlightedIndex];
    } else if (!prod && searchResults.length > 0) {
      prod = searchResults[0];
    } else if (!prod && searchQuery.trim()) {
      const qTrim = searchQuery.trim().toLowerCase();
      prod = products.find(p => 
        (p.name_ta && p.name_ta.toLowerCase() === qTrim) || 
        (p.name_en && p.name_en.toLowerCase() === qTrim)
      ) || products.find(p => p.barcode && p.barcode.toLowerCase() === qTrim);
    }

    if (!prod) return;

    const qty = parseFloat(entryQty) || 1;
    const price = parseFloat(entryPrice) || prod.selling_price;

    setCart(prev => {
      const existingIdx = prev.findIndex(it => it.product_id === prod.id);
      if (existingIdx >= 0) {
        const copy = [...prev];
        const newQty = Number((copy[existingIdx].quantity + qty).toFixed(3));
        copy[existingIdx] = calculateLineTotals({
          ...copy[existingIdx],
          quantity: newQty,
          unit_price: price
        });
        return copy;
      } else {
        const newItem = calculateLineTotals({
          product_id: prod.id,
          barcode: prod.barcode,
          name_en: prod.name_en,
          name_ta: prod.name_ta,
          hsn_code: prod.hsn_code,
          unit: prod.unit || 'kg',
          unit_price: price,
          mrp: prod.mrp || price,
          discount_percent: 0,
          gst_rate: prod.gst_rate || 0,
          quantity: qty
        });
        return [...prev, newItem];
      }
    });

    // Reset entry fields
    setSelectedProduct(null);
    setSearchQuery('');
    setEntryQty('1');
    setEntryPrice('');
    setSearchResults([]);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // GST Calculation per Line (MRP Inclusive Grocery Standard, or No-Tax for Estimate & Return)
  const calculateLineTotals = (item, currentMode = billingMode) => {
    const unitPrice = Number(item.unit_price);
    const qty = Number(item.quantity);
    const disc = Number(item.discount_percent || 0);

    const gross = unitPrice * qty;
    const discAmt = Number(((gross * disc) / 100).toFixed(2));
    const effectiveTotal = Number((gross - discAmt).toFixed(2));

    // For Estimate Bill or Return Bill: "no need apply tax"
    if (currentMode === 'estimate' || currentMode === 'return_bill') {
      return {
        ...item,
        discount_amount: discAmt,
        taxable_value: effectiveTotal,
        gst_rate: 0,
        cgst_rate: 0,
        cgst_amount: 0,
        sgst_rate: 0,
        sgst_amount: 0,
        total: effectiveTotal
      };
    }

    const gstRate = Number(item.gst_rate || 0);
    let taxable = effectiveTotal;
    let totalTax = 0;
    if (gstRate > 0) {
      taxable = Number((effectiveTotal / (1 + (gstRate / 100))).toFixed(2));
      totalTax = Number((effectiveTotal - taxable).toFixed(2));
    }

    const cgstAmt = Number((totalTax / 2).toFixed(2));
    const sgstAmt = Number((totalTax - cgstAmt).toFixed(2));

    return {
      ...item,
      discount_amount: discAmt,
      taxable_value: taxable,
      cgst_rate: gstRate / 2,
      cgst_amount: cgstAmt,
      sgst_rate: gstRate / 2,
      sgst_amount: sgstAmt,
      total: effectiveTotal
    };
  };

  // When billingMode changes, automatically recompute cart taxes
  useEffect(() => {
    if (cart.length > 0) {
      setCart(prev => prev.map(item => calculateLineTotals(item, billingMode)));
    }
  }, [billingMode]);

  // Update Cart Quantity
  const updateQuantity = (idx, newQty) => {
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== idx));
      return;
    }
    setCart(prev => {
      const copy = [...prev];
      copy[idx] = calculateLineTotals({ ...copy[idx], quantity: qty });
      return copy;
    });
  };

  // Remove item
  const removeFromCart = (idx) => {
    setCart(prev => prev.filter((_, i) => i !== idx));
  };

  // Customer Selection
  const handleCustomerChange = (customerId) => {
    setSelectedCustomerId(customerId);
    if (!customerId) {
      setCustomerName('Cash');
      setCustomerSearch('Cash');
      setCustomerPhone('');
      setCustomerGstin('');
      return;
    }
    const cust = customers.find(c => String(c.id) === String(customerId));
    if (cust) {
      setCustomerName(cust.name);
      setCustomerSearch(cust.name);
      setCustomerPhone(cust.phone || '');
      setCustomerGstin(cust.gstin || '');
    }
  };

  // Bill Financial Summary
  const billSummary = React.useMemo(() => {
    let subtotalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalDiscount = 0;
    let grossTotal = 0;
    let totalQty = 0;

    for (const item of cart) {
      subtotalTaxable += item.taxable_value || 0;
      totalCgst += item.cgst_amount || 0;
      totalSgst += item.sgst_amount || 0;
      totalDiscount += item.discount_amount || 0;
      grossTotal += item.total || 0;
      totalQty += item.quantity || 0;
    }

    const netBeforeRound = Math.max(0, grossTotal - Number(additionalDiscount || 0));
    const roundedTotal = Math.round(netBeforeRound);
    const roundOff = Number((roundedTotal - netBeforeRound).toFixed(2));

    return {
      subtotalTaxable: Number(subtotalTaxable.toFixed(2)),
      totalCgst: Number(totalCgst.toFixed(2)),
      totalSgst: Number(totalSgst.toFixed(2)),
      totalTax: Number((totalCgst + totalSgst).toFixed(2)),
      totalDiscount: Number((totalDiscount + Number(additionalDiscount || 0)).toFixed(2)),
      roundOff,
      grandTotal: roundedTotal,
      totalItems: cart.length,
      totalQty: Number(totalQty.toFixed(3))
    };
  }, [cart, additionalDiscount]);

  // Dynamic UPI QR code
  useEffect(() => {
    if (paymentMode === 'upi' && billSummary.grandTotal > 0 && storeSettings.upi_id) {
      const upiString = `upi://pay?pa=${encodeURIComponent(storeSettings.upi_id)}&pn=${encodeURIComponent(storeSettings.shop_name_en || 'Grocery')}&am=${billSummary.grandTotal}&cu=INR&tn=GroceryBill`;
      QRCode.toDataURL(upiString, { width: 110, margin: 1 })
        .then(url => setLiveUpiUrl(url))
        .catch(err => console.error(err));
    }
  }, [paymentMode, billSummary.grandTotal, storeSettings.upi_id]);

  // Cash Change
  const cashChange = React.useMemo(() => {
    const received = parseFloat(cashReceived);
    if (isNaN(received) || received < billSummary.grandTotal) return 0;
    return Number((received - billSummary.grandTotal).toFixed(2));
  }, [cashReceived, billSummary.grandTotal]);

  // New Bill
  const handleNewBill = () => {
    setPastBillIndex(-1);
    setViewingPastBill(null);
    setDraftBill(null);
    setCart([]);
    setSelectedCustomerId('');
    setCustomerName('Cash');
    setCustomerSearch('Cash');
    setCustomerPhone('');
    setCustomerGstin('');
    setCashReceived('');
    setAdditionalDiscount(0);
    setNotes('');
    setPaymentMode('cash');
    setSelectedProduct(null);
    setSearchQuery('');
    setHighlightedIndex(0);
    setEntryQty('1');
    setEntryPrice('');
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Hold Bill
  const handleHoldBill = () => {
    if (cart.length === 0) return;
    const item = {
      id: Date.now(),
      cart,
      customerName,
      customerPhone,
      customerGstin,
      selectedCustomerId,
      grandTotal: billSummary.grandTotal,
      time: new Date().toLocaleTimeString('en-IN', { hour12: true })
    };
    setHeldBills(prev => [item, ...prev]);
    handleNewBill();
  };

  // Recall Bill
  const handleRecallBill = (hb) => {
    setCart(hb.cart);
    setCustomerName(hb.customerName);
    setCustomerSearch(hb.customerName || 'Cash');
    setCustomerPhone(hb.customerPhone);
    setCustomerGstin(hb.customerGstin);
    setSelectedCustomerId(hb.selectedCustomerId);
    setHeldBills(prev => prev.filter(b => b.id !== hb.id));
  };

  // Save / Print Bill
  const handleSaveBill = async (shouldPrint = true) => {
    if (cart.length === 0) {
      alert(lang === 'ta' ? 'ரசீதில் பொருட்கள் சேர்க்கப்படவில்லை!' : 'Cart is empty!');
      return;
    }

    try {
      const payload = {
        bill_type: billingMode,
        customer_id: selectedCustomerId || null,
        customer_name: customerName,
        customer_phone: customerPhone,
        customer_gstin: customerGstin,
        place_of_supply: customerGstin && !customerGstin.startsWith('33') ? 'Other State' : '33-Tamil Nadu',
        payment_mode: paymentMode,
        received_amount: paymentMode === 'cash' ? (parseFloat(cashReceived) || billSummary.grandTotal) : billSummary.grandTotal,
        additional_discount: Number(additionalDiscount) || 0,
        notes,
        items: cart
      };

      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!data.success) {
        alert(data.error || 'Failed to save bill');
        return;
      }

      handleNewBill();
      loadPastInvoices();
      if (onInvoiceCreated) {
        onInvoiceCreated(data.data, shouldPrint);
      }
    } catch (err) {
      console.error(err);
      alert('Error saving bill');
    }
  };

  handleSaveBillRef.current = handleSaveBill;
  handleHoldBillRef.current = handleHoldBill;

  const activeCustomer = customers.find(c => String(c.id) === String(selectedCustomerId));

  // Current or Past Bill Summary
  const displaySummary = React.useMemo(() => {
    if (viewingPastBill) {
      const taxable = Number(viewingPastBill.taxable_amount || 0);
      const cgst = Number(viewingPastBill.cgst_amount || 0);
      const sgst = Number(viewingPastBill.sgst_amount || 0);
      const disc = Number(viewingPastBill.discount_amount || 0);
      const roundOff = Number(viewingPastBill.round_off || 0);
      const grand = Number(viewingPastBill.grand_total || 0);
      const itemsList = viewingPastBill.items || [];
      const totalQty = itemsList.reduce((acc, it) => acc + Number(it.quantity || 0), 0);

      return {
        subtotalTaxable: taxable.toFixed(2),
        totalCgst: cgst.toFixed(2),
        totalSgst: sgst.toFixed(2),
        totalTax: (cgst + sgst).toFixed(2),
        totalDiscount: disc.toFixed(2),
        roundOff: roundOff.toFixed(2),
        grandTotal: grand,
        totalItems: itemsList.length,
        totalQty: Number(totalQty.toFixed(3))
      };
    }
    return billSummary;
  }, [viewingPastBill, billSummary]);

  return (
    <div className="w-full h-full flex-1 flex flex-col p-1.5 space-y-1.5 overflow-hidden">
      
      {/* ======================================================== */}
      {/* TOP HEADER: BILL NO, CUSTOMER SELECTION & PAST BILL NAV  */}
      {/* ======================================================== */}
      <div className="bg-white px-2.5 py-1 rounded border border-slate-300 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0">
        
        {/* Bill Number, Date & Mode Indicator */}
        <div className="flex items-center space-x-1.5">
          <span className="font-bold text-slate-700 font-tamil whitespace-nowrap">
            {lang === 'ta' ? 'ரசீது எண்:' : 'Bill No:'}
          </span>
          <span className={`font-mono font-bold text-xs px-2 py-0.5 rounded border shadow-xs ${
            viewingPastBill 
              ? 'bg-amber-100 text-amber-900 border-amber-400' 
              : 'bg-slate-900 text-white border-slate-900'
          }`}>
            {viewingPastBill ? viewingPastBill.invoice_no : nextBillNo}
          </span>

          {/* Date display */}
          <span className="font-mono text-xs px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-300 whitespace-nowrap">
            {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: '2-digit' })}
          </span>

          {viewingPastBill ? (
            <span className="bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded text-[10px] flex items-center space-x-1 shadow-xs">
              <span>📋</span>
              <span>{lang === 'ta' ? 'முந்தைய ரசீது' : 'Past Bill'} ({pastBillIndex + 1}/{pastInvoices.length})</span>
            </span>
          ) : (
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={() => setBillingMode && setBillingMode('estimate')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1 whitespace-nowrap ${
                  billingMode === 'estimate'
                    ? 'bg-purple-700 text-white border-purple-800 shadow-xs ring-1 ring-purple-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Sales Order"
              >
                <span>📦</span>
                <span>{lang === 'ta' ? 'விற்பனை ஆணை' : 'Sales Order'}</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingMode && setBillingMode('tax_invoice')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1 whitespace-nowrap ${
                  billingMode === 'tax_invoice'
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Sales Bill"
              >
                <span>🧾</span>
                <span>{lang === 'ta' ? 'விற்பனை பில்' : 'Sales Bill'}</span>
              </button>

              <button
                type="button"
                onClick={() => setBillingMode && setBillingMode('return_bill')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors flex items-center space-x-1 whitespace-nowrap ${
                  billingMode === 'return_bill'
                    ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-1 ring-rose-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Sales Return"
              >
                <span>🔄</span>
                <span>{lang === 'ta' ? 'திருப்பல் பில்' : 'Sales Return'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Customer Name — free-type with autocomplete dropdown */}
        <div className="flex items-center space-x-1.5 flex-1 min-w-[240px] max-w-xl">
          <label className="font-bold text-slate-700 whitespace-nowrap font-tamil">
            {lang === 'ta' ? 'வாடிக்கையாளர்:' : 'Customer:'}
          </label>
          {viewingPastBill ? (
            <div className="flex-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-bold text-slate-900 truncate text-xs">
              {viewingPastBill.customer_name} {viewingPastBill.customer_phone ? `(${viewingPastBill.customer_phone})` : ''}
              {viewingPastBill.customer_gstin ? ` [GSTIN: ${viewingPastBill.customer_gstin}]` : ''}
            </div>
          ) : (
            <div ref={customerDropdownRef} className="relative flex-1">
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomerSearch(val);
                  setCustomerName(val);
                  setSelectedCustomerId('');
                  setCustomerPhone('');
                  setCustomerGstin('');
                  setShowCustomerDropdown(val.trim().length > 0);
                }}
                onFocus={() => {
                  if (customerSearch.trim().length > 0) setShowCustomerDropdown(true);
                }}
                onBlur={() => {
                  // Delay so click on dropdown item registers
                  setTimeout(() => setShowCustomerDropdown(false), 150);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setShowCustomerDropdown(false);
                    setCustomerSearch('Cash');
                    setCustomerName('Cash');
                    setSelectedCustomerId('');
                    setCustomerPhone('');
                    setCustomerGstin('');
                  }
                }}
                placeholder={lang === 'ta' ? 'ரொக்கம் / வாடிக்கையாளர் பெயர்' : 'Cash / Customer name'}
                className="w-full px-2 py-0.5 border border-slate-300 rounded text-xs font-semibold focus:border-emerald-600 focus:outline-none bg-white"
              />
              {showCustomerDropdown && (() => {
                const q = customerSearch.toLowerCase().trim();
                const filtered = q
                  ? customers.filter(c =>
                      (c.name && c.name.toLowerCase().includes(q)) ||
                      (c.phone && c.phone.includes(q))
                    )
                  : customers;
                return filtered.length > 0 ? (
                  <ul className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-300 rounded shadow-lg mt-0.5 max-h-40 overflow-y-auto text-xs">
                    {filtered.map(c => (
                      <li
                        key={c.id}
                        onMouseDown={() => {
                          setSelectedCustomerId(c.id);
                          setCustomerName(c.name);
                          setCustomerSearch(c.name);
                          setCustomerPhone(c.phone || '');
                          setCustomerGstin(c.gstin || '');
                          setShowCustomerDropdown(false);
                        }}
                        className="px-2 py-1 hover:bg-emerald-50 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0"
                      >
                        <span className="font-semibold text-slate-900">{c.name}</span>
                        <span className="text-slate-500 text-[10px]">
                          {c.phone || ''}{c.credit_balance > 0 ? ` | Due: ₹${c.credit_balance}` : ''}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null;
              })()}
            </div>
          )}
        </div>


        {/* Keyboard Up / Down Past Bill Navigators & Search Button */}
        <div className="flex items-center space-x-1.5 whitespace-nowrap ml-auto">
          {/* Alt+S Search Past Bills Button */}
          <button
            onClick={handleOpenSearchModal}
            title={lang === 'ta' ? 'பழைய ரசீதுகளைத் தேடுக [Alt+S]' : 'Search Past Bills [Alt+S]'}
            className="px-2.5 py-0.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded font-bold text-xs flex items-center space-x-1 transition-colors shadow-xs"
          >
            <span>🔍</span>
            <span className="font-tamil">{lang === 'ta' ? 'பில் தேடல்' : 'Search Bills'}</span>
            <span className="text-[10px] bg-blue-800 px-1 py-0.2 rounded font-mono text-blue-100">[Alt+S]</span>
          </button>

          <button
            onClick={handlePrevBill}
            disabled={pastInvoices.length === 0 || pastBillIndex >= pastInvoices.length - 1}
            title={lang === 'ta' ? 'முந்தைய பழைய பில் [↑ அல்லது PageUp]' : 'Previous / Older Bill [↑ or PageUp]'}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 border border-slate-300 rounded font-bold text-xs flex items-center space-x-1 transition-colors"
          >
            <span>↑</span>
            <span className="font-tamil">{lang === 'ta' ? 'பழைய பில்' : 'Older'}</span>
            <span className="text-[9px] text-slate-500 font-mono">[↑]</span>
          </button>
          
          <button
            onClick={handleNextBill}
            disabled={pastBillIndex <= -1}
            title={lang === 'ta' ? 'அடுத்த புதிய பில் [↓ அல்லது PageDown]' : 'Next / Newer Bill [↓ or PageDown]'}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 border border-slate-300 rounded font-bold text-xs flex items-center space-x-1 transition-colors"
          >
            <span>↓</span>
            <span className="font-tamil">{lang === 'ta' ? 'அடுத்த பில்' : 'Newer'}</span>
            <span className="text-[9px] text-slate-500 font-mono">[↓]</span>
          </button>

          {viewingPastBill && (
            <button
              onClick={handleReturnToNewBill}
              title="Return to New Bill [F2]"
              className="px-2 py-0.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs font-tamil flex items-center space-x-1 transition-colors shadow-xs"
            >
              <span>+</span>
              <span>{lang === 'ta' ? 'புதிய பில் [F2]' : 'New Bill [F2]'}</span>
            </button>
          )}
        </div>

      </div>

      {/* ======================================================== */}
      {/* 1. FAST ITEM ENTRY BAR OR PAST BILL VIEW BANNER          */}
      {/* ======================================================== */}
      {viewingPastBill ? (
        <div className="bg-amber-50 border border-amber-400 px-2.5 py-1 rounded flex flex-wrap items-center justify-between gap-1 shadow-xs flex-shrink-0 text-xs">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-sm">📋</span>
            <span className="font-bold text-amber-950 font-tamil">
              {lang === 'ta'
                ? `ரசீது #${viewingPastBill.invoice_no} பார்வை முறை | தேதி: ${viewingPastBill.date} ${viewingPastBill.time} | முறை: ${viewingPastBill.payment_mode?.toUpperCase()}`
                : `Viewing Past Bill #${viewingPastBill.invoice_no} | Date: ${viewingPastBill.date} ${viewingPastBill.time} | Mode: ${viewingPastBill.payment_mode?.toUpperCase()}`}
            </span>
            <span className="text-amber-800 font-mono text-[10px] bg-white px-1.5 py-0.5 rounded border border-amber-300">
              {lang === 'ta' ? '[↑ பழைய பில் | ↓ அடுத்த பில் | F2 புதிய பில்]' : '[↑ Older Bill | ↓ Newer Bill | F2 New Bill]'}
            </span>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => onInvoiceCreated && onInvoiceCreated(viewingPastBill, true)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-black text-white rounded text-xs font-bold font-tamil flex items-center space-x-1 shadow-xs"
            >
              <span>🖨️</span>
              <span>{lang === 'ta' ? 'ரசீது அச்சிடு [F9]' : 'Print Receipt [F9]'}</span>
            </button>
            <button
              onClick={handleReturnToNewBill}
              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold font-tamil flex items-center space-x-1 shadow-xs"
            >
              <span>+</span>
              <span>{lang === 'ta' ? 'புதிய பில்லிங் செல் [F2]' : 'Back to New Bill [F2]'}</span>
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Mode Notification Banners */}
          {billingMode === 'return_bill' && (
            <div className="bg-rose-700 text-white px-3 py-1.5 rounded flex items-center justify-between text-xs font-bold shadow-xs flex-shrink-0 animate-fade-in border border-rose-800">
              <div className="flex items-center space-x-2">
                <span className="text-base">🔄</span>
                <span className="font-tamil">
                  {lang === 'ta' 
                    ? 'பொருட்கள் திருப்பல் முறை: வாடிக்கையாளர் திருப்பும் பொருட்கள். வரி இல்லை. இப்பொருட்கள் சரக்கு இருப்புக்கு மீண்டும் சேர்க்கப்படும்!' 
                    : 'RETURN BILL MODE: Customer returning items. No tax applied. Products will be ADDED BACK to inventory stock!'}
                </span>
              </div>
              <span className="bg-rose-900 text-white px-2 py-0.5 rounded text-[10px] font-mono border border-rose-400 whitespace-nowrap">
                {lang === 'ta' ? 'சரக்கு இருப்பு கூடும் (+)' : 'Stock Will Be Restored (+)'}
              </span>
            </div>
          )}

          {billingMode === 'estimate' && (
            <div className="bg-purple-800 text-white px-3 py-1 rounded flex items-center justify-between text-xs font-semibold shadow-xs flex-shrink-0 animate-fade-in border border-purple-900">
              <div className="flex items-center space-x-2">
                <span className="text-sm">📦</span>
                <span className="font-tamil">
                  {lang === 'ta' ? 'விற்பனை ஆணை பதிவு முறை (Sales Order Mode)' : 'SALES ORDER BILLING MODE'}
                </span>
              </div>
              <span className="bg-purple-950 text-purple-200 px-2 py-0.2 rounded text-[10px] font-mono border border-purple-700 whitespace-nowrap">
                SO
              </span>
            </div>
          )}

          <div className="bg-white px-2.5 py-1 rounded border border-slate-300 shadow-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            
            {/* Barcode / Item Name Search with Alphabetical Listing on Backspace */}
            <div ref={searchContainerRef} className="relative flex-1 min-w-[240px]">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onClick={() => {
                  if (!searchQuery.trim()) {
                    showAllAlphabeticalProducts();
                  }
                }}
                onBlur={() => {
                  setTimeout(() => {
                    setSearchResults([]);
                  }, 180);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setSelectedProduct(null);
                  if (!val.trim()) {
                    showAllAlphabeticalProducts();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace') {
                    // When backspace is clicked or clears the search, show ALL products alphabetically!
                    if (!searchQuery.trim() || searchQuery.length <= 1) {
                      showAllAlphabeticalProducts();
                    }
                  } else if (e.key === 'ArrowDown') {
                    if (searchResults.length > 0) {
                      e.preventDefault();
                      setHighlightedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : 0));
                    } else if (!searchQuery.trim()) {
                      e.preventDefault();
                      showAllAlphabeticalProducts();
                    }
                  } else if (e.key === 'ArrowUp') {
                    if (searchResults.length > 0) {
                      e.preventDefault();
                      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : searchResults.length - 1));
                    } else if (!searchQuery.trim()) {
                      e.preventDefault();
                      handlePrevBill();
                    }
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchResults.length > 0 && highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
                      handleSelectProduct(searchResults[highlightedIndex]);
                    } else if (selectedProduct) {
                      handleAddItemToBill();
                    } else if (searchQuery.trim()) {
                      const qTrim = searchQuery.trim().toLowerCase();
                      const exactName = products.find(p => 
                        (p.name_ta && p.name_ta.toLowerCase() === qTrim) || 
                        (p.name_en && p.name_en.toLowerCase() === qTrim)
                      );
                      if (exactName) {
                        handleSelectProduct(exactName);
                      } else {
                        const exactBarcode = products.find(p => p.barcode && p.barcode.toLowerCase() === qTrim);
                        if (exactBarcode) {
                          handleSelectProduct(exactBarcode);
                        }
                      }
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchResults([]);
                    setHighlightedIndex(0);
                  }
                }}
                id="pos-search-input"
                placeholder={lang === 'ta' ? 'பார்கோடு ஸ்கேன் / பொருள் பெயர் தேடுக [F4]...' : 'Scan Barcode or Search Item [F4]...'}
                className="w-full px-2.5 py-1 border-2 border-slate-400 rounded text-xs font-semibold focus:border-emerald-600 focus:outline-none"
              />

            {/* Dropdown Suggestions with Sticky Header, Keyboard Scrolling & Highlight */}
            {searchResults.length > 0 && (
              <div 
                ref={dropdownListRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-emerald-600 rounded shadow-2xl z-30 max-h-60 overflow-y-auto divide-y divide-slate-200"
              >
                {/* Header showing count and alphabetical status */}
                <div className="sticky top-0 bg-slate-100 border-b border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-700 flex justify-between items-center z-10 select-none">
                  <span className="font-tamil text-emerald-900">
                    {!searchQuery.trim()
                      ? (lang === 'ta' ? `அனைத்து பொருட்கள் (${searchResults.length} - அகர வரிசை A-Z)` : `All Products (${searchResults.length} - Alphabetical A-Z)`)
                      : (lang === 'ta' ? `தேடல் முடிவுகள் (${searchResults.length})` : `Search Results (${searchResults.length})`)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {lang === 'ta' ? '[↑↓ நகர்த்த | Enter தேர்வு]' : '[↑↓ Move | Enter Select]'}
                  </span>
                </div>

                {searchResults.map((item, idx) => {
                  const isHighlighted = idx === highlightedIndex;
                  return (
                    <div
                      key={item.id}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectProduct(item);
                      }}
                      onClick={() => handleSelectProduct(item)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={`p-1.5 text-xs flex justify-between items-center cursor-pointer transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-100 text-slate-900 border-l-4 border-emerald-700 font-bold'
                          : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5">
                        <span className={`text-xs font-bold ${isHighlighted ? 'text-emerald-700' : 'text-transparent'}`}>
                          ►
                        </span>
                        <div>
                          <strong className="font-product text-slate-900">{item.name_ta}</strong>
                          <span className="text-slate-600 ml-1.5 font-sans font-normal">({item.name_en})</span>
                          <span className="ml-2 text-[10px] font-mono text-slate-500">[{item.barcode}]</span>
                        </div>
                      </div>
                      <div className="font-bold text-emerald-800 font-mono text-right ml-2 whitespace-nowrap">
                        ₹{item.selling_price} /{item.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Qty Input */}
          <div className="w-20">
            <input
              ref={qtyInputRef}
              type="number"
              step="any"
              value={entryQty}
              onChange={(e) => setEntryQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItemToBill();
                }
              }}
              placeholder={lang === 'ta' ? 'அளவு' : 'Qty'}
              className="w-full px-2 py-1 border border-slate-400 rounded text-xs text-center font-bold font-mono focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Rate Input */}
          <div className="w-20">
            <input
              type="number"
              step="any"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddItemToBill();
                }
              }}
              placeholder={lang === 'ta' ? 'விலை' : 'Rate'}
              className="w-full px-2 py-1 border border-slate-400 rounded text-xs text-right font-bold font-mono focus:border-emerald-600 focus:outline-none"
            />
          </div>

          {/* Add Button */}
          <button
            onClick={handleAddItemToBill}
            className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold font-tamil"
          >
            {lang === 'ta' ? 'சேர் [Enter]' : 'Add [Enter]'}
          </button>

          {/* Held Bills notification if any */}
          {heldBills.length > 0 && (
            <div className="flex items-center space-x-1 ml-auto">
              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">
                Held: {heldBills.length}
              </span>
              {heldBills.map(hb => (
                <button
                  key={hb.id}
                  onClick={() => handleRecallBill(hb)}
                  className="text-[10px] bg-amber-600 text-white px-1.5 py-0.5 rounded font-mono font-bold hover:bg-amber-700"
                >
                  ₹{hb.grandTotal} ({hb.time})
                </button>
              ))}
            </div>
          )}

        </div>
      </div>
      </>
      )}

      {/* ======================================================== */}
      {/* 2. PLAIN HIGH-CONTRAST BILLING TABLE                     */}
      {/* ======================================================== */}
      <div className="bg-white rounded border border-slate-300 shadow-xs overflow-hidden flex-1 min-h-[100px] flex flex-col">
        <div className="overflow-x-auto overflow-y-auto flex-1">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 bg-slate-200 text-slate-800 font-bold border-b border-slate-300 z-10 shadow-xs">
              <tr>
                <th className="py-1 px-2 text-center w-10 border-r border-slate-300">#</th>
                <th className="py-1 px-2.5 text-left border-r border-slate-300">
                  {lang === 'ta' ? 'பொருள் விளக்கம்' : 'Item Description'}
                </th>
                <th className="py-1 px-2 text-center w-16 border-r border-slate-300">HSN</th>
                <th className="py-1 px-2 text-center w-24 border-r border-slate-300">
                  {lang === 'ta' ? 'அளவு' : 'Quantity'}
                </th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-300">
                  {lang === 'ta' ? 'விலை (₹)' : 'Rate (₹)'}
                </th>
                <th className="py-1 px-2 text-center w-14 border-r border-slate-300">GST %</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-300">CGST (₹)</th>
                <th className="py-1 px-2 text-right w-20 border-r border-slate-300">SGST (₹)</th>
                <th className="py-1 px-2 text-right w-24 border-r border-slate-300">
                  {lang === 'ta' ? 'மொத்தம் (₹)' : 'Total (₹)'}
                </th>
                <th className="py-1 px-2 text-center w-12">
                  {lang === 'ta' ? 'நீக்கு' : 'Del'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {viewingPastBill ? (
                (viewingPastBill.items || []).map((item, idx) => (
                  <tr key={idx} className="hover:bg-amber-50/50 border-b border-slate-200">
                    <td className="py-1 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900 font-product text-xs leading-tight">
                        {item.name_ta}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {item.name_en}
                      </div>
                    </td>
                    <td className="py-1 px-2 text-center font-mono text-slate-600 border-r border-slate-200 text-xs">
                      {item.hsn_code}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-slate-200 font-mono font-bold text-xs">
                      {item.quantity} {item.unit || ''}
                    </td>
                    <td className="py-1 px-2 text-right font-mono border-r border-slate-200 text-xs">
                      {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-bold border-r border-slate-200 text-xs">
                      {item.gst_rate}%
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-slate-700 border-r border-slate-200 text-xs">
                      {Number(item.cgst_amount).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-slate-700 border-r border-slate-200 text-xs">
                      {Number(item.sgst_amount).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 text-xs border-r border-slate-200">
                      {Number(item.total).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-center text-slate-400 font-bold">
                      —
                    </td>
                  </tr>
                ))
              ) : cart.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-8 text-center text-slate-400">
                    {lang === 'ta' ? (
                      <span className="font-tamil">பில்லில் பொருட்கள் இல்லை. பார்கோடு ஸ்கேன் செய்யவும் அல்லது பொருள் பெயரைத் தட்டச்சு செய்யவும் [F4].</span>
                    ) : (
                      <span>No items added to bill yet. Scan barcode or type item name above [F4].</span>
                    )}
                  </td>
                </tr>
              ) : (
                cart.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="py-1 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900 font-product text-xs leading-tight">
                        {item.name_ta}
                      </div>
                      <div className="text-[10px] text-slate-600">
                        {item.name_en}
                      </div>
                    </td>
                    <td className="py-1 px-2 text-center font-mono text-slate-600 border-r border-slate-200 text-xs">
                      {item.hsn_code}
                    </td>
                    <td className="py-1 px-2 text-center border-r border-slate-200">
                      <div className="flex items-center justify-center space-x-1">
                        <input
                          type="number"
                          step="any"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(idx, e.target.value)}
                          className="w-14 text-center py-0.5 border border-slate-400 rounded font-mono font-bold text-xs"
                        />
                        <span className="text-[10px] text-slate-500">{item.unit}</span>
                      </div>
                    </td>
                    <td className="py-1 px-2 text-right font-mono border-r border-slate-200 text-xs">
                      {Number(item.unit_price).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-center font-mono font-bold border-r border-slate-200 text-xs">
                      {item.gst_rate}%
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-slate-700 border-r border-slate-200 text-xs">
                      {Number(item.cgst_amount).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono text-slate-700 border-r border-slate-200 text-xs">
                      {Number(item.sgst_amount).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 text-xs border-r border-slate-200">
                      {Number(item.total).toFixed(2)}
                    </td>
                    <td className="py-1 px-2 text-center">
                      <button
                        onClick={() => removeFromCart(idx)}
                        className="text-rose-700 hover:text-rose-900 font-bold px-1.5 py-0.5 border border-rose-300 rounded hover:bg-rose-50 text-xs"
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM SUMMARY & BILL ACTIONS                         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 text-xs flex-shrink-0">
        
        {/* Left: Payment Info */}
        <div className="bg-white p-2 rounded border border-slate-300 space-y-1.5">
          {viewingPastBill ? (
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-700 font-tamil">
                  {lang === 'ta' ? 'பணம் செலுத்திய முறை:' : 'Payment Mode:'}
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-mono font-bold uppercase text-[11px]">
                  {viewingPastBill.payment_mode}
                </span>
              </div>
              <div className="text-slate-600 space-y-0.5 text-xs">
                <div className="flex justify-between">
                  <span>{lang === 'ta' ? 'பெற்ற தொகை:' : 'Received Amount:'}</span>
                  <span className="font-mono font-bold">₹ {viewingPastBill.received_amount || viewingPastBill.grand_total}</span>
                </div>
                {viewingPastBill.change_amount > 0 && (
                  <div className="flex justify-between text-emerald-800 font-bold">
                    <span>{lang === 'ta' ? 'மீதி கொடுக்கப்பட்டது:' : 'Change Returned:'}</span>
                    <span className="font-mono">₹ {viewingPastBill.change_amount}</span>
                  </div>
                )}
                {viewingPastBill.notes && (
                  <div className="text-slate-500 italic text-[10px]">
                    {viewingPastBill.notes}
                  </div>
                )}
              </div>
              <div className="pt-1 flex items-center space-x-2">
                <button
                  onClick={() => onInvoiceCreated && onInvoiceCreated(viewingPastBill, true)}
                  className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded text-xs font-tamil flex items-center justify-center space-x-1"
                >
                  <span>🖨️</span>
                  <span>{lang === 'ta' ? 'மீண்டும் அச்சிடு [F9]' : 'Reprint Invoice [F9]'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              {/* Payment Mode Selector */}
              <div className="flex items-center space-x-2">
                <span className="font-bold text-slate-700 font-tamil text-xs">
                  {lang === 'ta' ? 'பணம் செலுத்தும் முறை:' : 'Payment Mode:'}
                </span>
                <div className="flex space-x-1">
                  {[
                    { id: 'cash', labelTa: 'ரொக்கம் (Cash)', labelEn: 'Cash' },
                    { id: 'upi', labelTa: 'UPI / GPay', labelEn: 'UPI' },
                    { id: 'card', labelTa: 'கார்டு (Card)', labelEn: 'Card' },
                    { id: 'credit', labelTa: 'கடன் (Credit)', labelEn: 'Credit' }
                  ].map(pm => (
                    <button
                      key={pm.id}
                      onClick={() => setPaymentMode(pm.id)}
                      className={`px-2 py-0.5 rounded border font-bold text-xs transition-colors ${
                        paymentMode === pm.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {lang === 'ta' ? pm.labelTa : pm.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cash Tender & Change */}
              {paymentMode === 'cash' && (
                <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded border border-slate-200 text-xs">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-slate-600 font-semibold font-tamil">
                      {lang === 'ta' ? 'பெற்ற தொகை:' : 'Received:'}
                    </span>
                    <input
                      type="number"
                      value={cashReceived}
                      onChange={(e) => setCashReceived(e.target.value)}
                      placeholder={`₹ ${displaySummary.grandTotal}`}
                      className="w-20 px-1.5 py-0.5 border border-slate-400 rounded text-right font-mono font-bold text-xs"
                    />
                  </div>

                  {cashChange > 0 && (
                    <div className="text-emerald-800 font-bold ml-auto">
                      <span>{lang === 'ta' ? 'மீதி:' : 'Change:'} </span>
                      <span className="font-mono text-sm underline">₹ {cashChange}</span>
                    </div>
                  )}
                </div>
              )}

              {/* UPI Live QR */}
              {paymentMode === 'upi' && liveUpiUrl && (
                <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                  <img src={liveUpiUrl} alt="UPI QR" className="w-12 h-12 border border-slate-400 bg-white" />
                  <div>
                    <span className="font-bold text-slate-900 font-tamil block text-xs">
                      {lang === 'ta' ? 'ஸ்கேன் செய்து செலுத்தவும்' : 'Scan to pay via UPI'}
                    </span>
                    <span className="font-mono text-emerald-800 font-bold text-sm">₹ {displaySummary.grandTotal}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Tax Breakdown, Grand Total & Actions */}
        <div className="bg-white p-2 rounded border border-slate-300 space-y-1.5">
          
          <div className="grid grid-cols-4 gap-1 p-1 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700 text-center font-medium">
            <div className="border-r border-slate-200 pr-0.5">
              <span className="block text-[10px] text-slate-500 font-tamil leading-tight">{lang === 'ta' ? 'வரிக்குட்பட்டது' : 'Taxable'}</span>
              <span className="font-mono font-bold">₹{displaySummary.subtotalTaxable}</span>
            </div>
            <div className="border-r border-slate-200 pr-0.5">
              <span className="block text-[10px] text-slate-500 font-tamil leading-tight">CGST</span>
              <span className="font-mono font-bold">₹{displaySummary.totalCgst}</span>
            </div>
            <div className="border-r border-slate-200 pr-0.5">
              <span className="block text-[10px] text-slate-500 font-tamil leading-tight">SGST</span>
              <span className="font-mono font-bold">₹{displaySummary.totalSgst}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 font-tamil leading-tight">{lang === 'ta' ? 'ரவுண்ட் ஆஃப்' : 'Round Off'}</span>
              <span className="font-mono font-bold">{displaySummary.roundOff}</span>
            </div>
          </div>

          {/* Bold Grand Total Box */}
          <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded flex items-center justify-between shadow-xs">
            <span className="text-xs sm:text-sm font-bold font-tamil tracking-wide">
              {billingMode === 'return_bill'
                ? (lang === 'ta' ? 'திருப்பிய தொகை (REFUND):' : 'REFUND TOTAL:')
                : billingMode === 'estimate'
                  ? (lang === 'ta' ? 'மொத்தத் தொகை (NET TOTAL):' : 'NET TOTAL:')
                  : (lang === 'ta' ? 'மொத்தத் தொகை (NET PAYABLE):' : 'GRAND TOTAL:')
              }
            </span>
            <span className={`text-xl sm:text-2xl font-extrabold font-mono ${
              billingMode === 'return_bill' ? 'text-rose-400' : billingMode === 'estimate' ? 'text-purple-300' : 'text-emerald-400'
            }`}>
              ₹ {Number(displaySummary.grandTotal).toFixed(2)}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-1.5">
            {viewingPastBill ? (
              <>
                <button
                  onClick={() => onInvoiceCreated && onInvoiceCreated(viewingPastBill, true)}
                  className="col-span-2 py-1.5 bg-slate-900 hover:bg-black text-white font-bold rounded text-xs shadow-xs font-tamil flex items-center justify-center space-x-1.5"
                >
                  <span>🖨️</span>
                  <span>{lang === 'ta' ? 'ரசீது அச்சிடு [F9]' : 'Print Receipt [F9]'}</span>
                </button>
                <button
                  onClick={handleReturnToNewBill}
                  className="py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-xs shadow-xs font-tamil"
                >
                  {lang === 'ta' ? 'புதிய பில் [F2]' : 'New Bill [F2]'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSaveBill(true)}
                  disabled={cart.length === 0}
                  className={`py-1.5 text-white font-bold rounded text-xs shadow-xs disabled:opacity-40 font-tamil transition-colors ${
                    billingMode === 'return_bill'
                      ? 'bg-rose-700 hover:bg-rose-800'
                      : billingMode === 'estimate'
                        ? 'bg-purple-700 hover:bg-purple-800'
                        : 'bg-emerald-700 hover:bg-emerald-800'
                  }`}
                >
                  {billingMode === 'return_bill'
                    ? (lang === 'ta' ? 'திருப்பல் அச்சிடு [F9]' : 'Save & Print Return [F9]')
                    : billingMode === 'estimate'
                      ? (lang === 'ta' ? 'ஆணை அச்சிடு [F9]' : 'Save & Print [F9]')
                      : (lang === 'ta' ? 'அச்சிடு & சேமி [F9]' : 'Save & Print [F9]')
                  }
                </button>

                <button
                  onClick={() => handleSaveBill(false)}
                  disabled={cart.length === 0}
                  className="py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-xs shadow-xs disabled:opacity-40 font-tamil"
                >
                  {billingMode === 'return_bill'
                    ? (lang === 'ta' ? 'திருப்பல் சேமி [F8]' : 'Save Return [F8]')
                    : billingMode === 'estimate'
                      ? (lang === 'ta' ? 'ஆணை சேமி [F8]' : 'Save [F8]')
                      : (lang === 'ta' ? 'சேமிக்க மட்டும் [F8]' : 'Save Only [F8]')
                  }
                </button>

                <button
                  onClick={handleNewBill}
                  className="py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded text-xs shadow-xs font-tamil"
                >
                  {lang === 'ta' ? 'புதிய பில் [F2]' : 'New Bill [F2]'}
                </button>
              </>
            )}
          </div>

        </div>

      </div>

      {/* ======================================================== */}
      {/* ALT + S: PAST BILLS SEARCH MODAL (DATE, BILL NO, CUSTOMER) */}
      {/* ======================================================== */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 animate-fade-in select-none">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl flex flex-col max-h-[88vh] overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center space-x-2">
                <span className="text-base">🔍</span>
                <h3 className="font-bold text-sm font-tamil">
                  {lang === 'ta' ? 'பழைய ரசீதுகளைத் தேடுக (Search Past Bills)' : 'Search Past Bills'}
                </h3>
                <span className="bg-blue-900 border border-blue-600 text-blue-200 text-[10px] font-mono px-1.5 py-0.5 rounded">
                  Alt+S
                </span>
              </div>
              <button
                onClick={() => setShowSearchModal(false)}
                title="Close [Esc]"
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded font-bold text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* 3 Search Filter Input Boxes (Typeable Date, Bill No, Autocomplete Customer) */}
            <div className="bg-slate-100 p-3 border-b border-slate-300 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              
              {/* 1. Typeable Date Box (no calendar dropdown, plain text DD/MM/YYYY) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-tamil">
                  {lang === 'ta' ? '📅 தேதி [நாள்/மாதம்/வருடம்]:' : '📅 Date [DD/MM/YYYY]:'}
                </label>
                <input
                  ref={searchModalDateInputRef}
                  type="text"
                  value={searchDate}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchDate(val);
                    fetchFilteredInvoices(val, searchBillNo, searchCustomer);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (searchModalBillNoInputRef.current) {
                        searchModalBillNoInputRef.current.focus();
                        searchModalBillNoInputRef.current.select();
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedInvoiceIndex(0);
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono font-bold focus:border-blue-600 focus:outline-none shadow-2xs"
                />
              </div>

              {/* 2. Bill No Search Box */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 font-tamil">
                  {lang === 'ta' ? '🧾 ரசீது எண் (Bill No):' : '🧾 Bill No:'}
                </label>
                <input
                  ref={searchModalBillNoInputRef}
                  type="text"
                  value={searchBillNo}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchBillNo(val);
                    fetchFilteredInvoices(searchDate, val, searchCustomer);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (modalInvoices.length > 0) {
                        loadSpecificInvoice(modalInvoices[selectedInvoiceIndex]?.id || modalInvoices[0].id);
                      }
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setSelectedInvoiceIndex(prev => Math.min(modalInvoices.length - 1, prev + 1));
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setSelectedInvoiceIndex(prev => Math.max(0, prev - 1));
                    }
                  }}
                  placeholder={lang === 'ta' ? 'எ.கா: BILL/1010 அல்லது 1010' : 'e.g. BILL/1010 or 1010'}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-mono font-semibold focus:border-blue-600 focus:outline-none shadow-2xs"
                />
              </div>

              {/* 3. Customer Name Search Box with Autocomplete Dropdown & Keyboard Selection */}
              <div className="relative">
                <label className="block font-bold text-slate-700 mb-1 font-tamil">
                  {lang === 'ta' ? '👤 வாடிக்கையாளர் பெயர்:' : '👤 Customer Name / Ph:'}
                </label>
                <input
                  ref={searchModalCustInputRef}
                  type="text"
                  value={searchCustomer}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSearchCustomer(val);
                    setShowModalCustDropdown(true);
                    setModalCustHighlightIndex(0);
                    fetchFilteredInvoices(searchDate, searchBillNo, val);
                  }}
                  onFocus={() => {
                    setShowModalCustDropdown(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowModalCustDropdown(false), 200);
                  }}
                  onKeyDown={(e) => {
                    // Filtered customers list
                    const q = searchCustomer.toLowerCase().trim();
                    const filteredCust = q
                      ? customers.filter(c =>
                          (c.name && c.name.toLowerCase().includes(q)) ||
                          (c.phone && c.phone.includes(q))
                        )
                      : customers;

                    if (e.key === 'Backspace' && searchCustomer === '') {
                      // Pressing backspace when empty shows all customers
                      setShowModalCustDropdown(true);
                      setModalCustHighlightIndex(0);
                    } else if (e.key === 'ArrowDown') {
                      if (showModalCustDropdown && filteredCust.length > 0) {
                        e.preventDefault();
                        setModalCustHighlightIndex(prev => Math.min(filteredCust.length - 1, prev + 1));
                      } else if (modalInvoices.length > 0) {
                        e.preventDefault();
                        setSelectedInvoiceIndex(prev => Math.min(modalInvoices.length - 1, prev + 1));
                      }
                    } else if (e.key === 'ArrowUp') {
                      if (showModalCustDropdown && filteredCust.length > 0) {
                        e.preventDefault();
                        setModalCustHighlightIndex(prev => Math.max(0, prev - 1));
                      } else if (modalInvoices.length > 0) {
                        e.preventDefault();
                        setSelectedInvoiceIndex(prev => Math.max(0, prev - 1));
                      }
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (showModalCustDropdown && filteredCust.length > 0) {
                        const chosen = filteredCust[modalCustHighlightIndex] || filteredCust[0];
                        if (chosen) {
                          setSearchCustomer(chosen.name);
                          setShowModalCustDropdown(false);
                          fetchFilteredInvoices(searchDate, searchBillNo, chosen.name);
                        }
                      } else if (modalInvoices.length > 0) {
                        loadSpecificInvoice(modalInvoices[selectedInvoiceIndex]?.id || modalInvoices[0].id);
                      }
                    }
                  }}
                  placeholder={lang === 'ta' ? 'பெயர் அல்லது எண் தட்டச்சு செய்க' : 'Type name or phone'}
                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 font-semibold focus:border-blue-600 focus:outline-none shadow-2xs"
                />

                {/* Customer Autocomplete Dropdown List */}
                {showModalCustDropdown && (() => {
                  const q = searchCustomer.toLowerCase().trim();
                  const filteredCust = q
                    ? customers.filter(c =>
                        (c.name && c.name.toLowerCase().includes(q)) ||
                        (c.phone && c.phone.includes(q))
                      )
                    : customers;

                  return filteredCust.length > 0 ? (
                    <ul 
                      ref={modalCustDropdownRef}
                      className="absolute z-50 top-full left-0 right-0 bg-white border border-slate-300 rounded-b shadow-xl mt-0.5 max-h-48 overflow-y-auto text-xs"
                    >
                      {filteredCust.map((c, idx) => (
                        <li
                          key={c.id}
                          onMouseDown={() => {
                            setSearchCustomer(c.name);
                            setShowModalCustDropdown(false);
                            fetchFilteredInvoices(searchDate, searchBillNo, c.name);
                          }}
                          className={`px-2.5 py-1.5 cursor-pointer flex items-center justify-between border-b border-slate-100 last:border-0 ${
                            idx === modalCustHighlightIndex ? 'bg-blue-600 text-white' : 'hover:bg-blue-50 text-slate-900'
                          }`}
                        >
                          <span className="font-semibold">{c.name}</span>
                          <span className={`text-[10px] font-mono ${idx === modalCustHighlightIndex ? 'text-blue-100' : 'text-slate-500'}`}>
                            {c.phone || ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null;
                })()}
              </div>

            </div>

            {/* Quick Filter Reset & Status Bar */}
            <div className="px-3 py-1 bg-slate-200/80 border-b border-slate-300 flex items-center justify-between text-[11px] text-slate-600 font-mono">
              <div>
                <span>{lang === 'ta' ? 'கண்டுபிடிக்கப்பட்ட ரசீதுகள்:' : 'Invoices found:'} </span>
                <strong className="text-slate-900 font-bold">{modalInvoices.length}</strong>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-[10px] text-slate-500">
                  {lang === 'ta' ? '↑ / ↓: ரசீதை தேர்வு செய்ய | Enter: பில்லை திறக்க | Esc: வெளியேற' : '↑ / ↓: Select | Enter: Open Bill | Esc: Exit'}
                </span>
                {(searchDate || searchBillNo || searchCustomer) && (
                  <button
                    onClick={() => {
                      setSearchDate('');
                      setSearchBillNo('');
                      setSearchCustomer('');
                      fetchFilteredInvoices('', '', '');
                    }}
                    className="text-blue-700 hover:text-blue-900 hover:underline font-bold"
                  >
                    ✕ {lang === 'ta' ? 'வடிகட்டிகளை நீக்கு' : 'Clear'}
                  </button>
                )}
              </div>
            </div>

            {/* Invoices Results Table with Keyboard Arrow Selection */}
            <div className="flex-1 overflow-y-auto p-2 bg-slate-50 min-h-[240px]">
              {loadingModalInvoices ? (
                <div className="text-center py-10 text-slate-500 font-bold">
                  {lang === 'ta' ? 'தேடப்படுகிறது...' : 'Searching...'}
                </div>
              ) : modalInvoices.length === 0 ? (
                <div className="text-center py-10 text-slate-500">
                  {lang === 'ta' ? 'ரசீதுகள் எதுவும் கிடைக்கவில்லை' : 'No matching invoices found'}
                </div>
              ) : (
                <table className="w-full text-left text-xs bg-white rounded border border-slate-200 shadow-2xs divide-y divide-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2 px-2.5 border-r border-slate-200">{lang === 'ta' ? 'ரசீது எண்' : 'Bill No'}</th>
                      <th className="py-2 px-2 border-r border-slate-200">{lang === 'ta' ? 'தேதி / நேரம்' : 'Date / Time'}</th>
                      <th className="py-2 px-2.5 border-r border-slate-200">{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}</th>
                      <th className="py-2 px-2 border-r border-slate-200 text-center">{lang === 'ta' ? 'முறை' : 'Mode'}</th>
                      <th className="py-2 px-2.5 border-r border-slate-200 text-right">{lang === 'ta' ? 'மொத்தம்' : 'Total'}</th>
                      <th className="py-2 px-2 text-center">{lang === 'ta' ? 'செயல்' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {modalInvoices.map((inv, idx) => {
                      const isSelected = idx === selectedInvoiceIndex;
                      return (
                        <tr 
                          key={inv.id} 
                          className={`transition-colors cursor-pointer group ${
                            isSelected ? 'bg-blue-100/90 ring-1 ring-blue-500' : 'hover:bg-blue-50/70'
                          }`}
                          onClick={() => setSelectedInvoiceIndex(idx)}
                          onDoubleClick={() => loadSpecificInvoice(inv.id)}
                        >
                          <td className="py-2 px-2.5 font-mono font-bold text-blue-900 border-r border-slate-100">
                            {isSelected && <span className="mr-1 text-blue-600 font-bold">▶</span>}
                            {inv.invoice_no}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-600 border-r border-slate-100 whitespace-nowrap">
                            {inv.date} {inv.time}
                          </td>
                          <td className="py-2 px-2.5 text-slate-900 border-r border-slate-100 font-tamil">
                            <div className="font-bold">{inv.customer_name}</div>
                            {inv.customer_phone && (
                              <div className="text-[10px] text-slate-500 font-mono">{inv.customer_phone}</div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center border-r border-slate-100">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              inv.payment_mode === 'cash' ? 'bg-emerald-100 text-emerald-800' :
                              inv.payment_mode === 'upi' ? 'bg-indigo-100 text-indigo-800' :
                              inv.payment_mode === 'credit' ? 'bg-amber-100 text-amber-800' :
                              'bg-slate-100 text-slate-800'
                            }`}>
                              {inv.payment_mode}
                            </span>
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 border-r border-slate-100">
                            ₹{Number(inv.grand_total).toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => loadSpecificInvoice(inv.id)}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded font-bold text-[11px] shadow-2xs font-tamil flex items-center justify-center space-x-1 mx-auto"
                            >
                              <span>{lang === 'ta' ? 'பார்வை' : 'View'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex items-center justify-between text-xs text-slate-600">
              <span className="font-mono text-[11px]">
                {lang === 'ta' ? '↑ / ↓: வரிசை தேர்வு | Enter: ரசீதை திறக்க | Esc: மூட' : '↑ / ↓: Navigate | Enter: Open Bill | Esc: Close'}
              </span>
              <button
                onClick={() => setShowSearchModal(false)}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white font-bold rounded"
              >
                ✕ {lang === 'ta' ? 'மூடு [Esc]' : 'Close [Esc]'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
