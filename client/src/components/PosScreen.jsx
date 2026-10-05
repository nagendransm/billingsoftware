import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export default function PosScreen({
  products = [],
  customers = [],
  storeSettings = {},
  lang = 'ta',
  t = {},
  onInvoiceCreated
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

  // Refs
  const searchContainerRef = useRef(null);
  const searchInputRef = useRef(null);
  const dropdownListRef = useRef(null);
  const qtyInputRef = useRef(null);
  const customerDropdownRef = useRef(null);

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
    const prefix = storeSettings.bill_prefix || 'BILL/';
    if (storeSettings.next_bill_number) {
      return `${prefix}${storeSettings.next_bill_number}`;
    }
    if (pastInvoices.length > 0) {
      const topId = pastInvoices[0].id || 0;
      return `${prefix}${1001 + topId}`;
    }
    return `${prefix}1001`;
  }, [storeSettings, pastInvoices]);

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
  // Latest function references so keyboard listener NEVER executes stale closures
  const handleSaveBillRef = useRef(null);
  handleSaveBillRef.current = handleSaveBill;

  const handleHoldBillRef = useRef(null);
  handleHoldBillRef.current = handleHoldBill;

  const handleReturnToNewBillRef = useRef(null);
  handleReturnToNewBillRef.current = handleReturnToNewBill;

  const handlePrevBillRef = useRef(null);
  handlePrevBillRef.current = handlePrevBill;

  const handleNextBillRef = useRef(null);
  handleNextBillRef.current = handleNextBill;

  useEffect(() => {
    const handleKeyDown = (e) => {
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

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setSearchResults([]);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live Search filter with alphabetical sorting
  useEffect(() => {
    if (!searchQuery.trim()) {
      return;
    }

    const q = searchQuery.toLowerCase().trim();
    const matches = products.filter(p => 
      (p.name_en && p.name_en.toLowerCase().includes(q)) ||
      (p.name_ta && p.name_ta.includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q)) ||
      (p.hsn_code && p.hsn_code.includes(q))
    );

    const sortedMatches = sortProductsAlphabetically(matches, lang);
    setSearchResults(sortedMatches);
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
      prod = products.find(p => p.barcode === searchQuery.trim());
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

  // GST Calculation per Line (MRP Inclusive Grocery Standard)
  const calculateLineTotals = (item) => {
    const unitPrice = Number(item.unit_price);
    const qty = Number(item.quantity);
    const disc = Number(item.discount_percent || 0);
    const gstRate = Number(item.gst_rate || 0);

    const gross = unitPrice * qty;
    const discAmt = Number(((gross * disc) / 100).toFixed(2));
    const effectiveTotal = Number((gross - discAmt).toFixed(2));

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
            <span className="bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded text-[10px] border border-emerald-300">
              ● {lang === 'ta' ? 'புதிய பில்' : 'New Bill'}
            </span>
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


        {/* Keyboard Up / Down Past Bill Navigators */}
        <div className="flex items-center space-x-1 whitespace-nowrap ml-auto">
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
              [↑ பழைய பில் | ↓ அடுத்த பில் | F2 புதிய பில்]
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
        <div className="bg-white px-2.5 py-1 rounded border border-slate-300 shadow-xs flex-shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            
            {/* Barcode / Item Name Search with Alphabetical Listing on Backspace */}
            <div ref={searchContainerRef} className="relative flex-1 min-w-[240px]">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (!searchQuery.trim()) {
                    showAllAlphabeticalProducts();
                  }
                }}
                onClick={() => {
                  if (!searchQuery.trim()) {
                    showAllAlphabeticalProducts();
                  }
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
                      const exact = products.find(p => p.barcode === searchQuery.trim());
                      if (exact) {
                        handleSelectProduct(exact);
                      }
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setSearchResults([]);
                    setHighlightedIndex(0);
                  }
                }}
                placeholder={lang === 'ta' ? 'பார்கோடு ஸ்கேன் / பொருள் பெயர் தேடுக [F4]...' : 'Scan Barcode or Search Item [F4]...'}
                className="w-full px-2.5 py-1 border-2 border-slate-400 rounded text-xs font-semibold focus:border-emerald-600 focus:outline-none"
              />

            {/* Dropdown Suggestions with Sticky Header, Keyboard Scrolling & Highlight */}
            {searchResults.length > 0 && (
              <div 
                ref={dropdownListRef}
                className="absolute left-0 right-0 top-full mt-1 bg-white border-2 border-emerald-600 rounded shadow-2xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-200"
              >
                {/* Header showing count and alphabetical status */}
                <div className="sticky top-0 bg-slate-100 border-b border-slate-300 px-2 py-1 text-[10px] font-bold text-slate-700 flex justify-between items-center z-10 select-none">
                  <span className="font-tamil text-emerald-900">
                    {!searchQuery.trim()
                      ? (lang === 'ta' ? `அனைத்து பொருட்கள் (${searchResults.length} - அகர வரிசை A-Z)` : `All Products (${searchResults.length} - Alphabetical A-Z)`)
                      : (lang === 'ta' ? `தேடல் முடிவுகள் (${searchResults.length})` : `Search Results (${searchResults.length})`)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">[↑↓ நகர்த்த | Enter தேர்வு]</span>
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
                          <strong className="font-tamil text-slate-900">{item.name_ta}</strong>
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
              placeholder="Qty / அளவு"
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
              placeholder="Rate / விலை"
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
                  {lang === 'ta' ? 'பொருள் விளக்கம் (Item Name)' : 'Item Description'}
                </th>
                <th className="py-1 px-2 text-center w-16 border-r border-slate-300">HSN</th>
                <th className="py-1 px-2 text-center w-24 border-r border-slate-300">
                  {lang === 'ta' ? 'அளவு (Qty)' : 'Quantity'}
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
                      <div className="font-bold text-slate-900 font-tamil text-xs leading-tight">
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
                  <td colSpan="10" className="py-8 text-center text-slate-400 font-tamil">
                    பில்லில் பொருட்கள் இல்லை. பார்கோடு ஸ்கேன் செய்யவும் அல்லது பொருள் பெயரைத் தட்டச்சு செய்யவும் [F4].
                    <br />
                    <span className="text-[11px] font-mono text-slate-500 mt-1 block">
                      (No items added yet. Scan barcode or type above to add items)
                    </span>
                  </td>
                </tr>
              ) : (
                cart.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                    <td className="py-1 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                      {idx + 1}
                    </td>
                    <td className="py-1 px-2.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900 font-tamil text-xs leading-tight">
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
                    <span className="text-slate-600 font-semibold font-tamil">பெற்ற தொகை:</span>
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
                      மீதி: <span className="font-mono text-sm underline">₹ {cashChange}</span>
                    </div>
                  )}
                </div>
              )}

              {/* UPI Live QR */}
              {paymentMode === 'upi' && liveUpiUrl && (
                <div className="flex items-center space-x-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                  <img src={liveUpiUrl} alt="UPI QR" className="w-12 h-12 border border-slate-400 bg-white" />
                  <div>
                    <span className="font-bold text-slate-900 font-tamil block text-xs">ஸ்கேன் செய்து செலுத்தவும்</span>
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
              {lang === 'ta' ? 'மொத்தத் தொகை (NET PAYABLE):' : 'GRAND TOTAL:'}
            </span>
            <span className="text-xl sm:text-2xl font-extrabold font-mono text-emerald-400">
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
                  className="py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded text-xs shadow-xs disabled:opacity-40 font-tamil"
                >
                  {lang === 'ta' ? 'அச்சிடு & சேமி [F9]' : 'Save & Print [F9]'}
                </button>

                <button
                  onClick={() => handleSaveBill(false)}
                  disabled={cart.length === 0}
                  className="py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-xs shadow-xs disabled:opacity-40 font-tamil"
                >
                  {lang === 'ta' ? 'சேமிக்க மட்டும் [F8]' : 'Save Only [F8]'}
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

    </div>
  );
}
