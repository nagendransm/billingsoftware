import React, { useState } from 'react';

export default function SettingsScreen({
  storeSettings = {},
  lang = 'ta',
  t = {},
  onSave
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
            {saving ? 'சேமிக்கப்படுகிறது...' : 'அமைப்புகளைச் சேமிக்க (Save Settings)'}
          </button>
        </div>

      </form>
    </div>
  );
}
