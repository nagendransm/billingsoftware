import React, { useState } from 'react';

export default function CustomersScreen({
  customers = [],
  lang = 'ta',
  t = {},
  onRefresh
}) {
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const [newCust, setNewCust] = useState({
    name: '',
    phone: '',
    address: '',
    gstin: '',
    state_code: '33'
  });

  const [payAmount, setPayAmount] = useState('');
  const [payNotes, setPayNotes] = useState('கடன் பாக்கி வரவு');

  const fetchLedger = async (customerId) => {
    try {
      const res = await fetch(`/api/customers/${customerId}/ledger`);
      const data = await res.json();
      if (data.success) {
        setLedgerData(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCustomer = (cust) => {
    setSelectedCustomer(cust);
    fetchLedger(cust.id);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCust.name) return;

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCust)
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewCust({ name: '', phone: '', address: '', gstin: '', state_code: '33' });
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !payAmount) return;

    try {
      const res = await fetch(`/api/customers/${selectedCustomer.id}/pay-credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: payAmount, notes: payNotes })
      });
      const data = await res.json();
      if (data.success) {
        setIsPayModalOpen(false);
        setPayAmount('');
        fetchLedger(selectedCustomer.id);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = customers.filter(c => {
    const q = search.toLowerCase();
    return !search || (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.gstin && c.gstin.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full px-2 sm:px-4 py-3 space-y-3 text-xs">
      
      {/* Top Header */}
      <div className="bg-white p-2.5 rounded border border-slate-300 flex justify-between items-center">
        <h2 className="font-bold text-sm sm:text-base text-slate-900 font-tamil">
          வாடிக்கையாளர் கடன் கணக்கு (Credit Ledger)
        </h2>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-3 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
        >
          + புதிய வாடிக்கையாளர் சேர்க்க
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        
        {/* Customer Directory */}
        <div className="bg-white rounded border border-slate-300 overflow-hidden flex flex-col h-[520px]">
          <div className="p-2 border-b border-slate-300">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search customer / phone..."
              className="w-full px-2 py-1 border border-slate-400 rounded focus:outline-none"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
            {filtered.map(c => {
              const isSelected = selectedCustomer && selectedCustomer.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCustomer(c)}
                  className={`p-2.5 cursor-pointer hover:bg-slate-100 flex justify-between items-center ${
                    isSelected ? 'bg-slate-200 font-bold border-l-4 border-slate-900' : ''
                  }`}
                >
                  <div>
                    <div className="font-tamil text-slate-900">{c.name}</div>
                    {c.phone && <div className="text-[11px] text-slate-500 font-mono">{c.phone}</div>}
                  </div>
                  {c.credit_balance > 0 && (
                    <span className="font-mono font-bold text-rose-700">
                      ₹{c.credit_balance}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Customer Ledger */}
        <div className="md:col-span-2 bg-white rounded border border-slate-300 p-3 flex flex-col h-[520px]">
          {selectedCustomer ? (
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded border border-slate-300">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 font-tamil">{selectedCustomer.name}</h3>
                  <div className="text-slate-600 font-mono text-[11px]">{selectedCustomer.phone}</div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-slate-600 block text-[11px] font-tamil">கடன் பாக்கி:</span>
                    <span className="text-lg font-bold font-mono text-rose-700">
                      ₹ {selectedCustomer.credit_balance}
                    </span>
                  </div>

                  <button
                    onClick={() => setIsPayModalOpen(true)}
                    className="px-3 py-1 bg-emerald-700 text-white rounded font-bold"
                  >
                    வரவு வைக்க (Pay)
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="flex-1 overflow-y-auto border border-slate-300 rounded">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-200 font-bold border-b border-slate-300">
                    <tr>
                      <th className="py-2 px-2.5 border-r border-slate-300">தேதி</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">வகை</th>
                      <th className="py-2 px-2.5 border-r border-slate-300">விளக்கம்</th>
                      <th className="py-2 px-2.5 text-right border-r border-slate-300">பற்று (Debit ₹)</th>
                      <th className="py-2 px-2.5 text-right">வரவு (Credit ₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-medium">
                    {ledgerData && ledgerData.transactions && ledgerData.transactions.length > 0 ? (
                      ledgerData.transactions.map((tx, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                          <td className="py-2 px-2.5 font-mono text-slate-600 border-r border-slate-200">{tx.date}</td>
                          <td className="py-2 px-2.5 border-r border-slate-200 font-bold">
                            {tx.type === 'debit' ? <span className="text-rose-700">பில் கடன்</span> : <span className="text-emerald-700">பணம் பெற்றது</span>}
                          </td>
                          <td className="py-2 px-2.5 border-r border-slate-200 font-tamil">{tx.notes}</td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-rose-700 border-r border-slate-200">
                            {tx.type === 'debit' ? `₹ ${tx.amount}` : '-'}
                          </td>
                          <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-700">
                            {tx.type === 'credit' ? `₹ ${tx.amount}` : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-400">பரிவர்த்தனைகள் எதுவும் இல்லை</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 font-tamil text-center">
              வாடிக்கையாளரைத் தேர்வு செய்து கடன் பதிவேட்டைப் பார்க்கவும்
            </div>
          )}
        </div>

      </div>

      {/* Add Customer Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white rounded border border-slate-400 max-w-sm w-full p-4 space-y-3">
            <h3 className="font-bold text-sm border-b pb-1.5 font-tamil">புதிய வாடிக்கையாளர்</h3>
            <form onSubmit={handleAddCustomer} className="space-y-2">
              <div>
                <label className="font-bold block mb-1">பெயர் *</label>
                <input
                  type="text"
                  required
                  value={newCust.name}
                  onChange={(e) => setNewCust({ ...newCust, name: e.target.value })}
                  className="w-full p-1.5 border border-slate-400 rounded"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">தொலைபேசி எண்</label>
                <input
                  type="text"
                  value={newCust.phone}
                  onChange={(e) => setNewCust({ ...newCust, phone: e.target.value })}
                  className="w-full p-1.5 border border-slate-400 rounded font-mono"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">GSTIN (வணிக வாடிக்கையாளர் எனில்)</label>
                <input
                  type="text"
                  value={newCust.gstin}
                  onChange={(e) => setNewCust({ ...newCust, gstin: e.target.value })}
                  className="w-full p-1.5 border border-slate-400 rounded font-mono"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-3 py-1 rounded border">ரத்து</button>
                <button type="submit" className="px-3 py-1 bg-emerald-700 text-white rounded font-bold">சேமிக்க</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white rounded border border-slate-400 max-w-sm w-full p-4 space-y-3">
            <h3 className="font-bold text-sm border-b pb-1.5 font-tamil">கடன் பாக்கி வரவு வைக்க</h3>
            <div className="bg-slate-50 p-2 rounded border border-slate-200">
              Customer: <strong>{selectedCustomer.name}</strong> | Due: <strong className="text-rose-700">₹ {selectedCustomer.credit_balance}</strong>
            </div>
            <form onSubmit={handleRecordPayment} className="space-y-2">
              <div>
                <label className="font-bold block mb-1">செலுத்திய தொகை (₹) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full p-2 border-2 border-slate-900 rounded font-mono font-bold text-base"
                />
              </div>
              <div>
                <label className="font-bold block mb-1">குறிப்புகள்</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full p-1.5 border border-slate-400 rounded"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={() => setIsPayModalOpen(false)} className="px-3 py-1 rounded border">ரத்து</button>
                <button type="submit" className="px-3 py-1 bg-emerald-700 text-white rounded font-bold">வரவு வை</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
