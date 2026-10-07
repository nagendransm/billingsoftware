import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export default function ReceiptModal({
  invoice,
  storeSettings,
  isOpen,
  onClose,
  lang,
  t
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

  return (
    <div className="receipt-modal-overlay fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-2">
      <div className="receipt-modal-dialog bg-white rounded border border-slate-400 max-w-2xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Top Control Bar */}
        <div className="no-print bg-slate-900 text-white px-3 py-2 flex justify-between items-center text-xs">
          <div className="font-bold font-mono flex items-center space-x-2">
            <span>{invoice.invoice_no} ({invoice.date})</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-sans font-bold uppercase ${
              isReturn ? 'bg-rose-700 text-white' : isEstimate ? 'bg-amber-600 text-white' : 'bg-emerald-700 text-white'
            }`}>
              {isReturn ? 'Return Bill' : isEstimate ? 'Estimate' : 'Tax Invoice'}
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
              className={`thermal-receipt-container bg-white p-3 text-black border border-slate-300 ${
                thermalWidth === '58mm' ? 'width-58mm max-w-[240px]' : 'max-w-[310px]'
              }`}
              style={{ width: thermalWidth === '58mm' ? '54mm' : '78mm' }}
            >
              {/* Header */}
              <div className="text-center pb-1.5 border-b border-dashed border-black">
                {storeSettings.shop_name_ta && (
                  <h2 className="text-sm font-bold font-tamil leading-tight">
                    {storeSettings.shop_name_ta}
                  </h2>
                )}
                {storeSettings.shop_name_en && (
                  <h3 className="text-xs font-bold leading-tight">
                    {storeSettings.shop_name_en}
                  </h3>
                )}
                <div className="mt-1 text-[11px] font-bold border border-black py-0.5 uppercase tracking-wide font-tamil">
                  {isReturn ? 'RETURN BILL / பொருட்கள் திருப்பல் ரசீது' : isEstimate ? 'ESTIMATE / விற்பனை மதிப்பீடு' : 'TAX INVOICE / வரி விலைப்பட்டியல்'}
                </div>
                {(storeSettings.address_ta || storeSettings.address_en) && (
                  <p className="text-[10px] mt-0.5">{storeSettings.address_ta || storeSettings.address_en}</p>
                )}
                {storeSettings.phone && (
                  <p className="text-[10px] font-semibold">Ph: {storeSettings.phone}</p>
                )}
                {!isEstimate && !isReturn && storeSettings.gstin && (
                  <div className="text-[10px] font-mono mt-0.5">
                    <strong>GSTIN:</strong> {storeSettings.gstin} | TN-33
                  </div>
                )}
              </div>

              {/* Meta */}
              <div className="py-1 text-[10px] border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span><strong>Bill:</strong> {invoice.invoice_no}</span>
                  <span>{invoice.date} {invoice.time}</span>
                </div>
                {invoice.customer_name && invoice.customer_name !== 'Retail Cash Customer / ரொக்க வாடிக்கையாளர்' && (
                  <div><strong>Cust:</strong> {invoice.customer_name} ({invoice.customer_phone || ''})</div>
                )}
              </div>

              {/* Items Table */}
              <table className="w-full text-[10px] my-1 text-left border-collapse">
                <thead>
                  <tr className="border-b border-black font-bold">
                    <th className="py-0.5">Item</th>
                    <th className="py-0.5 text-center">Qty</th>
                    <th className="py-0.5 text-right">Rate</th>
                    <th className="py-0.5 text-right">Amt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dotted divide-black">
                  {invoice.items && invoice.items.map((it, idx) => (
                    <tr key={idx} className="align-top">
                      <td className="py-0.5 pr-1">
                        <div className="font-bold font-product">{it.name_ta}</div>
                        <div className="text-[8.5px] text-gray-600 font-mono">
                          HSN:{it.hsn_code} {!isEstimate && !isReturn ? `GST:${it.gst_rate}%` : isReturn ? '[RETURN]' : ''}
                        </div>
                      </td>
                      <td className="py-0.5 text-center font-mono">{it.quantity} {it.unit}</td>
                      <td className="py-0.5 text-right font-mono">{Number(it.unit_price).toFixed(2)}</td>
                      <td className="py-0.5 text-right font-mono font-bold">{Number(it.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-dashed border-black pt-1 text-[10.5px] space-y-0.5">
                {!isEstimate && !isReturn && (
                  <div className="flex justify-between">
                    <span>வரிக்குட்பட்டது (Taxable):</span>
                    <span className="font-mono">₹ {Number(invoice.subtotal_taxable).toFixed(2)}</span>
                  </div>
                )}
                {!isEstimate && !isReturn && invoice.total_cgst > 0 && (
                  <div className="flex justify-between">
                    <span>CGST (மத்திய வரி):</span>
                    <span className="font-mono">₹ {Number(invoice.total_cgst).toFixed(2)}</span>
                  </div>
                )}
                {!isEstimate && !isReturn && invoice.total_sgst > 0 && (
                  <div className="flex justify-between">
                    <span>SGST (மாநில வரி):</span>
                    <span className="font-mono">₹ {Number(invoice.total_sgst).toFixed(2)}</span>
                  </div>
                )}
                {invoice.round_off !== 0 && (
                  <div className="flex justify-between">
                    <span>Round Off:</span>
                    <span className="font-mono">{invoice.round_off}</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-extrabold border-t-2 border-b-2 border-black py-1 my-0.5">
                  <span>
                    {isReturn 
                      ? 'REFUND (திருப்பிய தொகை):' 
                      : isEstimate 
                        ? 'ESTIMATE (மதிப்பீட்டுத் தொகை):' 
                        : 'TOTAL (மொத்தம்):'}
                  </span>
                  <span>₹ {Number(invoice.grand_total).toFixed(2)}</span>
                </div>
              </div>

              {/* HSN Summary (Only for GST Tax Invoices) */}
              {!isEstimate && !isReturn && invoice.hsn_summary && invoice.hsn_summary.length > 0 && (
                <div className="mt-1 pt-1 border-t border-dotted border-black text-[8px]">
                  <table className="w-full text-center border-collapse">
                    <thead>
                      <tr className="border-b border-black font-bold">
                        <th>HSN</th>
                        <th>Taxable</th>
                        <th>CGST</th>
                        <th>SGST</th>
                        <th>Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.hsn_summary.map((row, idx) => (
                        <tr key={idx}>
                          <td>{row.hsn_code} ({row.gst_rate}%)</td>
                          <td>{row.taxable_value}</td>
                          <td>{row.cgst_amount}</td>
                          <td>{row.sgst_amount}</td>
                          <td className="font-bold">{row.total_tax}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* QR Code */}
              {!isReturn && upiQrUrl && (
                <div className="text-center my-1.5 pt-1 border-t border-dashed border-black flex flex-col items-center">
                  <img src={upiQrUrl} alt="UPI QR" className="w-20 h-20 border border-black p-0.5" />
                  <span className="text-[8px] font-bold mt-0.5">Scan to Pay via GPay / PhonePe</span>
                </div>
              )}

              {/* Footer */}
              <div className="text-center pt-1 border-t border-dashed border-black text-[9px]">
                <p className="font-bold font-tamil">{storeSettings.receipt_footer_ta || 'நன்றி! மீண்டும் வருக!'}</p>
                <p className="text-[8px] text-gray-500">
                  {isReturn ? 'Return Receipt - Stock Updated' : isEstimate ? 'Estimate Only - Not a Tax Invoice' : 'GST Tax Invoice'}
                </p>
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
                    {isReturn ? 'RETURN BILL / பொருட்கள் திருப்பல் ரசீது' : isEstimate ? 'ESTIMATE / விற்பனை மதிப்பீடு' : 'TAX INVOICE / வரி விலைப்பட்டியல்'}
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
