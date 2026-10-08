import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function ReceiptModal({
  invoice,
  storeSettings,
  isOpen,
  onClose,
  lang,
  t,
  customers = []
}) {
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' or 'a4'
  const thermalWidth = storeSettings.thermal_printer_width || '80mm';

  useEffect(() => {
    if (invoice && storeSettings.upi_id) {
      const upiString = `upi://pay?pa=${encodeURIComponent(storeSettings.upi_id)}&pn=${encodeURIComponent(storeSettings.shop_name_en || 'Grocery')}&am=${invoice.grand_total}&cu=INR&tn=Bill${invoice.invoice_no}`;
      QRCode.toDataURL(upiString, { width: 120, margin: 1 })
        .then(url => setUpiQrUrl(url))
        .catch(err => console.error(err));
    }
  }, [invoice, storeSettings]);

  if (!isOpen || !invoice) return null;

  const isEstimate = invoice.bill_type === 'estimate';
  const isReturn = invoice.bill_type === 'return_bill';

  const handlePrint = () => {
    window.print();
  };

  // Helper to format integer amounts (NO DECIMALS, NO DOT!)
  const formatInt = (val) => {
    if (val === null || val === undefined || val === '') return '0';
    const num = typeof val === 'number' ? val : parseFloat(val);
    if (isNaN(num)) return '0';
    return Math.round(num).toString();
  };

  // Helper to format quantity cleanly
  const formatQty = (qty) => {
    const n = Number(qty);
    if (isNaN(n)) return '1';
    if (n % 1 === 0) return n.toString();
    return n.toString();
  };

  // Helper to get Tamil unit abbreviation
  const getUnitTa = (unit) => {
    if (!unit) return '';
    const u = String(unit).trim().toLowerCase();
    if (u === 'kg') return 'கி';
    if (u === 'g' || u === 'gm') return 'கி.ரா';
    if (u === 'l' || u === 'ltr' || u === 'liter' || u === 'litre') return 'லி';
    if (u === 'ml') return 'மி.லி';
    if (u === 'pcs' || u === 'piece' || u === 'pc') return 'பீஸ்';
    if (u === 'pkt' || u === 'packet') return 'பாக்கெட்';
    if (u === 'box') return 'பாக்ஸ்';
    if (u === 'bag') return 'பை';
    if (u === 'bundle') return 'கட்டு';
    return unit;
  };

  // Helper to format date like 07.10.2026
  const formatReceiptDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to format time like 04:51 P.m
  const formatReceiptTime = (timeStr) => {
    if (!timeStr) {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'P.m' : 'A.m';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    const parts = String(timeStr).split(':');
    if (parts.length >= 2) {
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1].padStart(2, '0');
      const ampm = hours >= 12 ? 'P.m' : 'A.m';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
    }
    return timeStr;
  };

  // Previous Balance for Credit Bills (Khata)
  const customerObj = customers?.find(c => String(c.id) === String(invoice.customer_id));
  const previousBalance = invoice.previous_balance !== undefined && invoice.previous_balance !== null
    ? Number(invoice.previous_balance)
    : (invoice.payment_mode === 'credit' && customerObj
        ? Number(customerObj.credit_balance || 0)
        : (invoice.customer_balance ? Number(invoice.customer_balance) : 0));
  const hasPreviousBalance = previousBalance > 0;

  const hasCustomer = invoice.customer_name && 
    invoice.customer_name !== 'Cash' && 
    invoice.customer_name !== 'Retail Cash Customer / ரொக்க வாடிக்கையாளர்' &&
    invoice.customer_name !== 'வாடிக்கையாளர்';

  return (
    <div className="receipt-modal-overlay fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2">
      <div className="receipt-modal-dialog bg-white rounded border border-slate-400 max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Top Control Bar */}
        <div className="no-print bg-slate-900 text-white px-3 py-2 flex justify-between items-center text-xs">
          <div className="font-bold font-mono flex items-center space-x-2">
            <span>{invoice.invoice_no} ({invoice.date})</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-bold uppercase ${
              isReturn ? 'bg-rose-700 text-white' : isEstimate ? 'bg-purple-700 text-white' : 'bg-emerald-700 text-white'
            }`}>
              {isReturn ? 'Return Bill' : isEstimate ? 'Sales Order' : 'Tax Invoice'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPrintFormat(printFormat === 'thermal' ? 'a4' : 'thermal')}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white font-bold"
            >
              {printFormat === 'thermal' ? 'A4 Invoice' : 'Thermal (80mm)'}
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {lang === 'ta' ? 'அச்சிடு [Print]' : 'Print'}
            </button>

            <button
              onClick={onClose}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
            >
              ✕ {lang === 'ta' ? 'மூடு' : 'Close'}
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="receipt-scroll-area flex-1 overflow-y-auto p-4 bg-slate-100 flex justify-center text-xs">
          
          {/* ======================================================== */}
          {/* 1. THERMAL POS RECEIPT FORMAT (80mm / 58mm)               */}
          {/* ======================================================== */}
          {printFormat === 'thermal' && (
            <div 
              className={`thermal-receipt-container bg-white text-black border border-slate-300 mx-auto ${
                thermalWidth === '58mm' ? 'width-58mm max-w-[220px]' : 'max-w-[290px]'
              }`}
              style={{ 
                width: thermalWidth === '58mm' ? '48mm' : '68mm',
                padding: '2mm 1.5mm',
                boxSizing: 'border-box'
              }}
            >
              {/* Header */}
              <div className="text-center pb-1">
                {storeSettings.shop_name_ta && (
                  <h2 className="text-sm font-black font-tamil leading-tight tracking-wide">
                    {storeSettings.shop_name_ta}
                  </h2>
                )}
                {storeSettings.shop_name_en && (
                  <h3 className="text-xs font-bold leading-tight mt-0.5">
                    {storeSettings.shop_name_en}
                  </h3>
                )}
                {(storeSettings.address_ta || storeSettings.address_en) && (
                  <p className="text-[10px] leading-tight mt-0.5 font-tamil">
                    {storeSettings.address_ta || storeSettings.address_en}
                  </p>
                )}
                {storeSettings.phone && (
                  <p className="text-[10px] font-bold font-mono tracking-wide mt-0.5">
                    CEL- {storeSettings.phone}
                  </p>
                )}
                <div className="mt-1 text-[11px] font-bold tracking-wider uppercase font-tamil">
                  {isReturn 
                    ? 'ரிட்டன் பில்' 
                    : isEstimate 
                      ? 'ESTIMATE' 
                      : (invoice.payment_mode === 'credit' ? 'CREDIT' : 'CASH')}
                </div>
              </div>

              <div className="border-b border-dashed border-black my-1" />

              {/* Meta */}
              <div className="text-[10px] leading-tight space-y-0.5 font-tamil">
                <div className="flex justify-between items-center">
                  <span>
                    <span className="font-bold">எண் :</span>{' '}
                    <span className="font-mono font-bold">{invoice.invoice_no}</span>
                  </span>
                  <span>
                    <span className="font-bold">நாள் :</span>{' '}
                    <span className="font-mono">{formatReceiptDate(invoice.date)}</span>
                  </span>
                </div>
                {hasCustomer && (
                  <div className="flex justify-between items-center pt-0.5">
                    <span className="truncate pr-1">
                      <span className="font-bold">திரு :</span> {invoice.customer_name}
                    </span>
                    {invoice.customer_phone && (
                      <span className="whitespace-nowrap font-mono text-[9.5px]">
                        PHONE : {invoice.customer_phone}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-black my-1" />

              {/* Items Table: MRP | பொருள் | அளவு | மதிப்பு */}
              <table className="w-full text-[10px] border-collapse table-fixed my-0.5">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '50%' }} />
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '18%' }} />
                </colgroup>
                <thead>
                  <tr className="border-b border-dashed border-black font-bold">
                    <th className="py-0.5 text-left font-mono">MRP</th>
                    <th className="py-0.5 text-left font-tamil">பொருள்</th>
                    <th className="py-0.5 text-center font-tamil">அளவு</th>
                    <th className="py-0.5 text-right font-tamil pr-1">மதிப்பு</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-gray-300">
                  {invoice.items && invoice.items.map((it, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-1 text-left font-mono font-semibold">
                        {formatInt(it.mrp || it.unit_price)}
                      </td>
                      <td className="py-1 pr-1 text-left">
                        <div className="font-bold font-product leading-tight break-words line-clamp-2">
                          {it.name_ta || it.name_en}
                        </div>
                      </td>
                      <td className="py-1 text-center font-mono whitespace-nowrap">
                        {formatQty(it.quantity)} {getUnitTa(it.unit)}
                      </td>
                      <td className="py-1 text-right font-mono font-bold pr-1">
                        {formatInt(it.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Section */}
              <div className="border-t border-dashed border-black pt-1 space-y-0.5 text-[10.5px]">
                <div className="flex justify-between items-center font-bold">
                  <span className="font-mono">Items : {invoice.items?.length || 0}</span>
                  <span className="font-tamil pr-1">
                    {isReturn ? 'திருப்பிய தொகை' : 'மொத்தம்'} ₹ {formatInt(invoice.grand_total)}
                  </span>
                </div>

                {hasPreviousBalance && (
                  <>
                    <div className="flex justify-between items-center pt-0.5 text-[10.5px]">
                      <span className="font-tamil">முன் பாக்கி</span>
                      <span className="font-mono font-bold pr-1">{formatInt(previousBalance)}</span>
                    </div>
                    <div className="border-b border-dashed border-black my-0.5" />
                    <div className="flex justify-between items-center text-xs font-black">
                      <span className="font-tamil">மொத்தம் :</span>
                      <span className="font-mono pr-1">
                        {formatInt(Number(invoice.grand_total) + Number(previousBalance))}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="border-b border-dashed border-black my-1" />

              {/* Time */}
              <div className="text-left text-[10px] font-mono py-0.5">
                <span>{formatReceiptTime(invoice.time)}</span>
              </div>

              {/* QR Code (if configured) */}
              {!isReturn && upiQrUrl && (
                <div className="text-center my-1 pt-1 border-t border-dashed border-black flex flex-col items-center">
                  <img src={upiQrUrl} alt="UPI QR" className="w-16 h-16 border border-black p-0.5" />
                  <span className="text-[8px] font-bold mt-0.5">Scan to Pay via UPI</span>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-1 border-t border-dashed border-black text-[9.5px]">
                <p className="font-bold font-tamil">{storeSettings.receipt_footer_ta || 'நன்றி! மீண்டும் வருக!'}</p>
                {storeSettings.receipt_footer_en && (
                  <p className="text-[8px] text-gray-500 mt-0.5">{storeSettings.receipt_footer_en}</p>
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. PLAIN A4 TAX INVOICE FORMAT                           */}
          {/* ======================================================== */}
          {printFormat === 'a4' && (
            <div className="a4-invoice-container bg-white p-6 max-w-xl w-full border border-black text-black text-xs">
              <div className="border border-black p-3 mb-3 flex justify-between">
                <div>
                  {storeSettings.shop_name_ta && <h2 className="text-base font-bold font-tamil">{storeSettings.shop_name_ta}</h2>}
                  {storeSettings.shop_name_en && <h1 className="text-sm font-bold">{storeSettings.shop_name_en}</h1>}
                  <div className="text-xs font-bold border border-black px-1.5 py-0.5 inline-block uppercase mt-1">
                    {isReturn ? 'RETURN BILL / ரிட்டன் பில்' : isEstimate ? 'SALES ORDER / விற்பனை ஆணை' : 'TAX INVOICE / வரி விலைப்பட்டியல்'}
                  </div>
                  {(storeSettings.address_ta || storeSettings.address_en) && (
                    <p className="text-[11px]">{storeSettings.address_ta || storeSettings.address_en}</p>
                  )}
                  {storeSettings.phone && <p className="text-[11px]">Ph: {storeSettings.phone}</p>}
                </div>
                <div className="text-right text-[11px]">
                  {storeSettings.gstin && <div><strong>GSTIN:</strong> {storeSettings.gstin}</div>}
                  <div>State Code: 33 - Tamil Nadu</div>
                  {storeSettings.fssai_no && <div>FSSAI: {storeSettings.fssai_no}</div>}
                </div>
              </div>

              <div className="grid grid-cols-2 border border-black text-xs mb-3">
                <div className="p-2 border-r border-black">
                  <p><strong>Billed To:</strong> {invoice.customer_name}</p>
                  {invoice.customer_phone && <p>Phone: {invoice.customer_phone}</p>}
                  {invoice.customer_gstin && <p>GSTIN: {invoice.customer_gstin}</p>}
                </div>
                <div className="p-2">
                  <p><strong>Invoice No:</strong> {invoice.invoice_no}</p>
                  <p><strong>Date:</strong> {invoice.date} {invoice.time}</p>
                  <p><strong>Payment:</strong> {invoice.payment_mode}</p>
                </div>
              </div>

              <table className="w-full border border-black text-xs text-left mb-3 border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-black font-bold">
                    <th className="border-r border-black p-1 text-center w-8">#</th>
                    <th className="border-r border-black p-1">Item Description</th>
                    <th className="border-r border-black p-1 text-center w-14">HSN</th>
                    <th className="border-r border-black p-1 text-center w-14">Qty</th>
                    <th className="border-r border-black p-1 text-right w-16">Rate (₹)</th>
                    <th className="border-r border-black p-1 text-right w-16">Taxable (₹)</th>
                    <th className="border-r border-black p-1 text-center w-12">GST %</th>
                    <th className="p-1 text-right w-20">Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.map((it, idx) => (
                    <tr key={idx} className="border-b border-slate-300">
                      <td className="border-r border-black p-1 text-center">{idx + 1}</td>
                      <td className="border-r border-black p-1">
                        <div className="font-bold font-product">{it.name_ta}</div>
                        <div className="text-[10px] text-gray-600">{it.name_en}</div>
                      </td>
                      <td className="border-r border-black p-1 text-center font-mono">{it.hsn_code}</td>
                      <td className="border-r border-black p-1 text-center font-mono">{it.quantity} {it.unit}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{Number(it.unit_price).toFixed(2)}</td>
                      <td className="border-r border-black p-1 text-right font-mono">{Number(it.taxable_value).toFixed(2)}</td>
                      <td className="border-r border-black p-1 text-center font-mono">{it.gst_rate}%</td>
                      <td className="p-1 text-right font-mono font-bold">{Number(it.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 gap-4 border border-black p-2 text-xs">
                <div>
                  <p className="italic font-bold">{invoice.amount_in_words || ''}</p>
                </div>
                <div className="text-right space-y-0.5">
                  <div className="flex justify-between">
                    <span>Taxable Value:</span>
                    <span className="font-mono">₹ {Number(invoice.subtotal_taxable).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>CGST:</span>
                    <span className="font-mono">₹ {Number(invoice.total_cgst).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST:</span>
                    <span className="font-mono">₹ {Number(invoice.total_sgst).toFixed(2)}</span>
                  </div>
                  {invoice.round_off !== 0 && (
                    <div className="flex justify-between">
                      <span>Round Off:</span>
                      <span className="font-mono">{invoice.round_off}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm border-t border-black pt-1">
                    <span>TOTAL:</span>
                    <span>₹ {Number(invoice.grand_total).toFixed(2)}</span>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
