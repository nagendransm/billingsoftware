import React, { useState, useEffect } from 'react';

export default function InvoicesScreen({
  lang = 'ta',
  t = {},
  onViewInvoice
}) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [billTypeFilter, setBillTypeFilter] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      let url = '/api/invoices?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (startDate) url += `start_date=${startDate}&`;
      if (endDate) url += `end_date=${endDate}&`;
      if (billTypeFilter) url += `bill_type=${billTypeFilter}&`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [startDate, endDate, billTypeFilter]);

  const handleCancelInvoice = async (invoiceId) => {
    if (!window.confirm(lang === 'ta' ? 'இந்த ரசீதை ரத்து செய்யவா? சரக்கு இருப்பு திரும்ப சேர்க்கப்படும்.' : 'Cancel this invoice? Stock will be restored.')) return;

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchInvoices();
      } else {
        alert(data.message || 'Failed to cancel');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePrintClick = async (invoiceId) => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      const data = await res.json();
      if (data.success && onViewInvoice) {
        onViewInvoice(data.data, true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="w-full px-2 sm:px-4 py-3 space-y-3">
      {/* Search Header */}
      <div className="bg-white p-3 rounded border border-slate-300 flex flex-wrap justify-between items-center gap-2 text-xs">
        <h2 className="font-bold text-sm sm:text-base text-slate-900 font-tamil">
          {lang === 'ta' ? 'விற்பனை ரசீதுகள் பட்டியல்' : 'Sales Invoices List'} ({invoices.length})
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Bill No / Phone..."
            className="px-2.5 py-1.5 border border-slate-400 rounded w-48 focus:outline-none"
          />

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2 py-1 border border-slate-400 rounded focus:outline-none"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2 py-1 border border-slate-400 rounded focus:outline-none"
          />

          <select
            value={billTypeFilter}
            onChange={(e) => setBillTypeFilter(e.target.value)}
            className="px-2 py-1.5 border border-slate-400 rounded focus:outline-none font-bold bg-white text-xs"
          >
            <option value="">{lang === 'ta' ? 'அனைத்து பில்கள் (All)' : 'All Bill Types'}</option>
            <option value="tax_invoice">{lang === 'ta' ? 'ஜிஎஸ்டி விற்பனை பில் (With Tax)' : 'GST Sales Bill (With Tax)'}</option>
            <option value="estimate">{lang === 'ta' ? 'விற்பனை மதிப்பீடு (No Tax)' : 'Estimate Bill (No Tax)'}</option>
            <option value="return_bill">{lang === 'ta' ? 'பொருட்கள் திருப்பல் பில் (Return)' : 'Return Bill (Sales Return)'}</option>
          </select>

          <button
            onClick={fetchInvoices}
            className="px-3 py-1 bg-slate-800 text-white rounded font-bold"
          >
            {lang === 'ta' ? 'தேடு' : 'Search'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded border border-slate-300 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
            <tr>
              <th className="py-2 px-2.5 border-r border-slate-300">{lang === 'ta' ? 'ரசீது எண் & வகை' : 'Bill No & Type'}</th>
              <th className="py-2 px-2.5 border-r border-slate-300">{lang === 'ta' ? 'தேதி & நேரம்' : 'Date & Time'}</th>
              <th className="py-2 px-2.5 border-r border-slate-300">{lang === 'ta' ? 'வாடிக்கையாளர்' : 'Customer'}</th>
              <th className="py-2 px-2 text-center border-r border-slate-300">{lang === 'ta' ? 'பணம் செலுத்திய முறை' : 'Payment Mode'}</th>
              <th className="py-2 px-2 text-right border-r border-slate-300">{lang === 'ta' ? 'வரிக்குட்பட்டது (₹)' : 'Taxable (₹)'}</th>
              <th className="py-2 px-2 text-right border-r border-slate-300">CGST (₹)</th>
              <th className="py-2 px-2 text-right border-r border-slate-300">SGST (₹)</th>
              <th className="py-2 px-2.5 text-right border-r border-slate-300">{lang === 'ta' ? 'மொத்தத் தொகை (₹)' : 'Total (₹)'}</th>
              <th className="py-2 px-2 text-center border-r border-slate-300">{lang === 'ta' ? 'நிலை' : 'Status'}</th>
              <th className="py-2 px-2 text-center">{lang === 'ta' ? 'செயல்' : 'Action'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {loading ? (
              <tr>
                <td colSpan="10" className="py-8 text-center text-slate-400">
                  {lang === 'ta' ? 'ஏற்றப்படுகிறது...' : 'Loading...'}
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="10" className="py-8 text-center text-slate-400">
                  {lang === 'ta' ? 'ரசீதுகள் எதுவும் இல்லை' : 'No invoices found'}
                </td>
              </tr>
            ) : (
              invoices.map(inv => {
                const isCancelled = inv.payment_status === 'cancelled';
                const isReturn = inv.bill_type === 'return_bill';
                const isEstimate = inv.bill_type === 'estimate';

                return (
                  <tr key={inv.id} className={`hover:bg-slate-50 border-b border-slate-200 ${isCancelled ? 'bg-rose-50 text-slate-400 line-through' : ''}`}>
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900 border-r border-slate-200">
                      <div className="flex items-center space-x-1">
                        <span>{inv.invoice_no}</span>
                        {isReturn && (
                          <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1 py-0.2 rounded border border-rose-300">
                            {lang === 'ta' ? 'திருப்பல்' : 'RET'}
                          </span>
                        )}
                        {isEstimate && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 py-0.2 rounded border border-amber-300">
                            {lang === 'ta' ? 'மதிப்பீடு' : 'EST'}
                          </span>
                        )}
                        {!isReturn && !isEstimate && (
                          <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 py-0.2 rounded border border-emerald-300">
                            {lang === 'ta' ? 'ஜிஎஸ்டி' : 'GST'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-600 border-r border-slate-200">{inv.date} {inv.time}</td>
                    <td className="py-2 px-2.5 border-r border-slate-200">
                      <div className="font-bold text-slate-900">{inv.customer_name}</div>
                      {inv.customer_phone && <div className="text-[10px] text-slate-500 font-mono">{inv.customer_phone}</div>}
                    </td>
                    <td className="py-2 px-2 text-center capitalize border-r border-slate-200 font-bold">{inv.payment_mode}</td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-200">₹{Number(inv.subtotal_taxable).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-200">₹{Number(inv.total_cgst).toFixed(2)}</td>
                    <td className="py-2 px-2 text-right font-mono border-r border-slate-200">₹{Number(inv.total_sgst).toFixed(2)}</td>
                    <td className="py-2 px-2.5 text-right font-mono font-bold border-r border-slate-200">
                      <span className={`text-sm ${isReturn ? 'text-rose-700' : 'text-slate-900'}`}>
                        {isReturn ? `(₹${Number(inv.grand_total).toFixed(2)})` : `₹${Number(inv.grand_total).toFixed(2)}`}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center border-r border-slate-200">
                      {isCancelled 
                        ? <span className="text-rose-700 font-bold">{lang === 'ta' ? 'ரத்து' : 'Cancelled'}</span> 
                        : <span className="text-emerald-800 font-bold">{lang === 'ta' ? 'முடிந்தது' : 'Paid'}</span>}
                    </td>
                    <td className="py-2 px-2 text-center whitespace-nowrap">
                      <button
                        onClick={() => handlePrintClick(inv.id)}
                        className="text-emerald-700 hover:underline font-bold px-1.5 mr-2"
                      >
                        [Print]
                      </button>
                      {!isCancelled && (
                        <button
                          onClick={() => handleCancelInvoice(inv.id)}
                          className="text-rose-700 hover:underline font-bold px-1.5"
                        >
                          [Cancel]
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
