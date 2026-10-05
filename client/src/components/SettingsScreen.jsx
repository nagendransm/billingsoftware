import React, { useState } from 'react';

export default function SettingsScreen({
  storeSettings = {},
  lang = 'ta',
  t = {},
  onSave,
  onRefreshProducts,
  onRefreshCustomers
}) {
  const [formData, setFormData] = useState({
    shop_name_en: storeSettings.shop_name_en || '',
    shop_name_ta: storeSettings.shop_name_ta || '',
    gstin: storeSettings.gstin || '',
    fssai_no: storeSettings.fssai_no || '',
    address_en: storeSettings.address_en || '',
    address_ta: storeSettings.address_ta || '',
    phone: storeSettings.phone || '',
    email: storeSettings.email || '',
    bill_prefix: storeSettings.bill_prefix || 'BILL/',
    upi_id: storeSettings.upi_id || '',
    thermal_printer_width: storeSettings.thermal_printer_width || '80mm',
    receipt_footer_ta: storeSettings.receipt_footer_ta || '',
    receipt_footer_en: storeSettings.receipt_footer_en || ''
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Built-in Confirmation Dialog State (Works 100% reliably in Electron / Desktop without window.prompt)
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    type: null, // 'products' or 'customers'
    title: '',
    description: '',
    confirmText: '',
    inputValue: '',
    loading: false,
    error: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setMsg('அமைப்புகள் சேமிக்கப்பட்டன! (Saved Successfully)');
        setTimeout(() => setMsg(''), 3000);
        if (onSave) onSave(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto px-2 sm:px-4 py-3 space-y-3 text-xs">
      
      <div className="bg-white p-3 rounded border border-slate-300 flex justify-between items-center">
        <div>
          <h2 className="font-bold text-sm sm:text-base text-slate-900 font-tamil">
            கடை அமைப்புகள் & ஜிஎஸ்டி விபரங்கள் (Store Profile & Settings)
          </h2>
          <p className="text-[11px] text-slate-500 font-tamil mt-0.5">
            உங்கள் கடையின் பெயர், முகவரி மற்றும் ஜிஎஸ்டி விபரங்களை இங்கு பதிவிடவும். இவை ரசீதுகளில் அச்சிடப்படும்.
          </p>
        </div>
        {msg && <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">{msg}</span>}
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-4 rounded border border-slate-300 space-y-3">
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold block mb-1 font-tamil">கடையின் பெயர் (தமிழில்) *</label>
            <input
              type="text"
              required
              value={formData.shop_name_ta}
              onChange={(e) => setFormData({ ...formData, shop_name_ta: e.target.value })}
              placeholder="எ.கா: லட்சுமி மளிகை ஸ்டோர்ஸ்"
              className="w-full p-1.5 border border-slate-400 rounded font-tamil font-bold"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">Shop Name (English) *</label>
            <input
              type="text"
              required
              value={formData.shop_name_en}
              onChange={(e) => setFormData({ ...formData, shop_name_en: e.target.value })}
              placeholder="e.g. Lakshmi Grocery Stores"
              className="w-full p-1.5 border border-slate-400 rounded font-bold"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold block mb-1">ஜிஎஸ்டி எண் (GSTIN) - விருப்பப்பட்டால்</label>
            <input
              type="text"
              value={formData.gstin}
              onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
              placeholder="33AAAAA0000A1Z5"
              className="w-full p-1.5 border border-slate-400 rounded font-mono font-bold uppercase"
            />
            <span className="text-[10px] text-slate-500">Tamil Nadu State Code: 33</span>
          </div>

          <div>
            <label className="font-bold block mb-1">உணவு பாதுகாப்பு உரிமம் (FSSAI No)</label>
            <input
              type="text"
              value={formData.fssai_no}
              onChange={(e) => setFormData({ ...formData, fssai_no: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold block mb-1 font-tamil">முகவரி (தமிழ்)</label>
            <textarea
              rows="2"
              value={formData.address_ta}
              onChange={(e) => setFormData({ ...formData, address_ta: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded font-tamil"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">Address (English)</label>
            <textarea
              rows="2"
              value={formData.address_en}
              onChange={(e) => setFormData({ ...formData, address_en: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold block mb-1">தொலைபேசி எண் (Phone Number)</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">மின்னஞ்சல் (Email)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 border-t pt-3">
          <div>
            <label className="font-bold block mb-1">பில் முன்னொட்டு (Bill Prefix)</label>
            <input
              type="text"
              value={formData.bill_prefix}
              onChange={(e) => setFormData({ ...formData, bill_prefix: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded font-mono font-bold"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">தெர்மல் பிரிண்டர் அளவு (Printer Width)</label>
            <select
              value={formData.thermal_printer_width}
              onChange={(e) => setFormData({ ...formData, thermal_printer_width: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded font-bold"
            >
              <option value="80mm">80mm (3-Inch Standard POS)</option>
              <option value="58mm">58mm (2-Inch Mini Thermal)</option>
            </select>
          </div>

          <div>
            <label className="font-bold block mb-1">கடையின் UPI ID (QR Code-க்கு)</label>
            <input
              type="text"
              value={formData.upi_id}
              onChange={(e) => setFormData({ ...formData, upi_id: e.target.value })}
              placeholder="store@upi"
              className="w-full p-1.5 border border-slate-400 rounded font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-bold block mb-1 font-tamil">ரசீது நன்றி வாசகம் (தமிழ்)</label>
            <input
              type="text"
              value={formData.receipt_footer_ta}
              onChange={(e) => setFormData({ ...formData, receipt_footer_ta: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded font-tamil"
            />
          </div>

          <div>
            <label className="font-bold block mb-1">Receipt Footer (English)</label>
            <input
              type="text"
              value={formData.receipt_footer_en}
              onChange={(e) => setFormData({ ...formData, receipt_footer_en: e.target.value })}
              className="w-full p-1.5 border border-slate-400 rounded"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold text-xs"
          >
            {saving ? 'Saving...' : 'Save Settings / அமைப்புகளைச் சேமிக்க'}
          </button>
        </div>

      </form>

      {/* ======================================================== */}
      {/* ADMIN DATA MANAGEMENT: DELETE PRODUCTS & CUSTOMERS       */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded border border-rose-300 space-y-3">
        <div className="border-b border-rose-200 pb-2">
          <h3 className="font-bold text-sm text-rose-900 flex items-center space-x-1.5">
            <span>⚠️</span>
            <span>Admin Data Management (தரவு மேலாண்மை)</span>
          </h3>
          <p className="text-[11px] text-slate-600 mt-0.5">
            Completely erase all products or all customers from the system when resetting store inventory or starting fresh.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          
          {/* Delete All Products Card */}
          <div className="p-3 bg-rose-50/60 rounded border border-rose-200 flex flex-col justify-between space-y-2">
            <div>
              <h4 className="font-bold text-xs text-rose-950 flex items-center space-x-1">
                <span>📦</span>
                <span>Completely Delete All Products</span>
              </h4>
              <p className="text-[10px] text-rose-800 mt-1 leading-relaxed">
                Permanently removes all items and stock counts from the database. (அனைத்துப் பொருட்களையும் நீக்கு)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  type: 'products',
                  title: 'Completely Delete All Products?',
                  description: 'This will permanently delete all product records, prices, barcodes, and stock quantities from your database. This action CANNOT be undone.',
                  confirmText: 'DELETE',
                  inputValue: '',
                  loading: false,
                  error: ''
                });
              }}
              className="w-full py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-xs shadow-xs"
            >
              🗑️ Delete All Products
            </button>
          </div>

          {/* Delete All Customers Card */}
          <div className="p-3 bg-rose-50/60 rounded border border-rose-200 flex flex-col justify-between space-y-2">
            <div>
              <h4 className="font-bold text-xs text-rose-950 flex items-center space-x-1">
                <span>👥</span>
                <span>Completely Delete All Customers</span>
              </h4>
              <p className="text-[10px] text-rose-800 mt-1 leading-relaxed">
                Permanently removes all customer records and credit ledgers from the database. (அனைத்து வாடிக்கையாளர் விபரங்களை நீக்கு)
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setConfirmDialog({
                  isOpen: true,
                  type: 'customers',
                  title: 'Completely Delete All Customers & Credit Ledgers?',
                  description: 'This will permanently delete all customer names, phone numbers, GSTINs, and entire credit purchase & payment transaction histories. This action CANNOT be undone.',
                  confirmText: 'DELETE',
                  inputValue: '',
                  loading: false,
                  error: ''
                });
              }}
              className="w-full py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded font-bold text-xs shadow-xs"
            >
              🗑️ Delete All Customers
            </button>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* BUILT-IN DANGER ZONE CONFIRMATION MODAL                  */}
      {/* ======================================================== */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border-2 border-rose-600 max-w-md w-full shadow-2xl overflow-hidden text-xs">
            
            {/* Modal Header */}
            <div className="bg-rose-700 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="font-bold text-sm flex items-center space-x-1.5">
                <span>⚠️</span>
                <span>{confirmDialog.title}</span>
              </span>
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="text-rose-200 hover:text-white font-bold text-base"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-3">
              <p className="text-slate-700 leading-relaxed">
                {confirmDialog.description}
              </p>

              {confirmDialog.error && (
                <div className="p-2 bg-rose-100 border border-rose-300 rounded text-rose-900 font-bold text-[11px]">
                  ⚠️ {confirmDialog.error}
                </div>
              )}

              <div className="bg-rose-50 p-2.5 rounded border border-rose-200">
                <label className="block font-bold text-rose-950 mb-1">
                  Type <span className="font-mono bg-white px-1 py-0.5 rounded border border-rose-300 text-rose-700">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={confirmDialog.inputValue}
                  onChange={(e) => setConfirmDialog(prev => ({ ...prev, inputValue: e.target.value, error: '' }))}
                  placeholder="Type DELETE here"
                  className="w-full px-2.5 py-1.5 border border-rose-300 rounded font-mono font-bold text-xs uppercase focus:outline-none focus:border-rose-700 bg-white"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-300 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel / ரத்து
              </button>

              <button
                type="button"
                disabled={confirmDialog.inputValue.trim().toUpperCase() !== 'DELETE' || confirmDialog.loading}
                onClick={async () => {
                  setConfirmDialog(prev => ({ ...prev, loading: true, error: '' }));
                  try {
                    const endpoint = confirmDialog.type === 'products' ? '/api/products' : '/api/customers';
                    const res = await fetch(endpoint, { method: 'DELETE' });
                    const data = await res.json();
                    if (data.success) {
                      setConfirmDialog(prev => ({ ...prev, isOpen: false, loading: false }));
                      alert(data.message || 'Data deleted successfully!');
                      if (confirmDialog.type === 'products' && onRefreshProducts) {
                        onRefreshProducts();
                      }
                      if (confirmDialog.type === 'customers' && onRefreshCustomers) {
                        onRefreshCustomers();
                      }
                    } else {
                      setConfirmDialog(prev => ({ ...prev, loading: false, error: data.error || data.message || 'Failed to delete' }));
                    }
                  } catch (err) {
                    console.error(err);
                    setConfirmDialog(prev => ({ ...prev, loading: false, error: 'Network error deleting data' }));
                  }
                }}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 disabled:opacity-40 text-white font-bold rounded shadow-xs"
              >
                {confirmDialog.loading ? 'Deleting...' : 'Permanently Delete Now'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
