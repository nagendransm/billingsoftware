import React, { useState } from 'react';

export default function ProductsScreen({
  products = [],
  categories = [],
  lang = 'ta',
  t = {},
  onRefresh
}) {
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  const [formData, setFormData] = useState({
    barcode: '',
    name_en: '',
    name_ta: '',
    category_id: '',
    hsn_code: '1006',
    unit: 'kg',
    cost_price: '',
    selling_price: '',
    mrp: '',
    gst_rate: '5',
    stock_quantity: '100',
    min_stock_alert: '10'
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      barcode: 'GCR' + Math.floor(10000000 + Math.random() * 90000000),
      name_en: '',
      name_ta: '',
      category_id: categories.length > 0 ? categories[0].id : '',
      hsn_code: '1006',
      unit: 'kg',
      cost_price: '',
      selling_price: '',
      mrp: '',
      gst_rate: '5',
      stock_quantity: '100',
      min_stock_alert: '10'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      barcode: p.barcode,
      name_en: p.name_en,
      name_ta: p.name_ta,
      category_id: p.category_id || '',
      hsn_code: p.hsn_code,
      unit: p.unit,
      cost_price: p.cost_price,
      selling_price: p.selling_price,
      mrp: p.mrp || p.selling_price,
      gst_rate: String(p.gst_rate),
      stock_quantity: p.stock_quantity,
      min_stock_alert: p.min_stock_alert
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name_en || !formData.name_ta || !formData.selling_price || !formData.hsn_code) {
      alert('Fill mandatory fields: Name (Tamil), Name (English), Price, HSN');
      return;
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (data.success) {
        setIsModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(lang === 'ta' ? 'இந்த பொருளை நீக்கவா?' : 'Delete this item?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success && onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const sortedAndFiltered = [...products]
    .filter(p => {
      const q = search.toLowerCase().trim();
      const match = !q || (
        (p.name_en && p.name_en.toLowerCase().includes(q)) ||
        (p.name_ta && p.name_ta.includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.hsn_code && p.hsn_code.includes(q))
      );
      const catMatch = selectedCat === 'all' || String(p.category_id) === selectedCat;
      return match && catMatch;
    })
    .sort((a, b) => {
      const nameA = lang === 'ta'
        ? (a.name_ta || a.name_en || '')
        : (a.name_en || a.name_ta || '');
      const nameB = lang === 'ta'
        ? (b.name_ta || b.name_en || '')
        : (b.name_en || b.name_ta || '');
      return nameA.trim().localeCompare(nameB.trim(), lang === 'ta' ? 'ta' : 'en', {
        numeric: true,
        sensitivity: 'base'
      });
    });

  return (
    <div className="w-full px-2 sm:px-4 py-3 space-y-3">
      
      {/* Header bar */}
      <div className="bg-white p-3 rounded border border-slate-300 flex flex-wrap justify-between items-center gap-2">
        <h2 className="font-bold text-sm sm:text-base text-slate-900 font-tamil flex items-center space-x-2">
          <span>{lang === 'ta' ? 'பொருட்கள் பட்டியல்' : 'Products List'} ({sortedAndFiltered.length})</span>
          <span className="text-[11px] font-normal text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
            {lang === 'ta' ? 'அகர வரிசைப்படி (A-Z)' : 'Alphabetical (A-Z)'}
          </span>
        </h2>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && (!search || search.length <= 1)) {
                setSearch('');
              }
            }}
            placeholder={lang === 'ta' ? 'பொருள் பெயர் / பார்கோடு கொண்டு தேடுக...' : 'Search product / barcode...'}
            className="px-3 py-1.5 border border-slate-400 rounded text-xs w-64 focus:outline-none"
          />

          <button
            onClick={openAddModal}
            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold font-tamil"
          >
            {lang === 'ta' ? '+ புதிய பொருள் சேர்க்க' : '+ Add New Item'}
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded border border-slate-300 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-200 text-slate-800 font-bold border-b border-slate-300">
            <tr>
              <th className="py-2 px-2 text-center w-10 border-r border-slate-300">#</th>
              <th className="py-2 px-3 border-r border-slate-300">பார்கோடு (Barcode)</th>
              <th className="py-2 px-3 border-r border-slate-300">பொருளின் பெயர் (தமிழில்)</th>
              <th className="py-2 px-3 border-r border-slate-300">Item Name (English)</th>
              <th className="py-2 px-2 text-center border-r border-slate-300">HSN</th>
              <th className="py-2 px-2 text-center border-r border-slate-300">GST %</th>
              <th className="py-2 px-2 text-right border-r border-slate-300">விற்பனை விலை (₹)</th>
              <th className="py-2 px-2 text-right border-r border-slate-300">கொள்முதல் விலை (₹)</th>
              <th className="py-2 px-2 text-center border-r border-slate-300">இருப்பு (Stock)</th>
              <th className="py-2 px-2 text-center">செயல்</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {sortedAndFiltered.map((p, idx) => (
              <tr key={p.id} className="hover:bg-slate-50 border-b border-slate-200">
                <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">{idx + 1}</td>
                <td className="py-2 px-3 font-mono text-slate-700 border-r border-slate-200">{p.barcode}</td>
                <td className="py-2 px-3 font-bold text-slate-900 font-tamil border-r border-slate-200">{p.name_ta}</td>
                <td className="py-2 px-3 text-slate-700 border-r border-slate-200">{p.name_en}</td>
                <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{p.hsn_code}</td>
                <td className="py-2 px-2 text-center font-mono font-bold border-r border-slate-200">{p.gst_rate}%</td>
                <td className="py-2 px-2 text-right font-mono font-bold text-slate-900 border-r border-slate-200">₹{p.selling_price} /{p.unit}</td>
                <td className="py-2 px-2 text-right font-mono text-slate-500 border-r border-slate-200">₹{p.cost_price}</td>
                <td className="py-2 px-2 text-center font-mono font-bold border-r border-slate-200">
                  <span className={p.stock_quantity <= p.min_stock_alert ? 'text-rose-700 font-extrabold' : 'text-slate-800'}>
                    {p.stock_quantity} {p.unit}
                  </span>
                </td>
                <td className="py-2 px-2 text-center whitespace-nowrap">
                  <button
                    onClick={() => openEditModal(p)}
                    className="text-blue-700 hover:underline font-bold px-1.5 text-xs mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-rose-700 hover:underline font-bold px-1.5 text-xs"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Simple Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="bg-white rounded border border-slate-400 max-w-lg w-full p-4 space-y-3 shadow-lg">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-slate-900 text-sm font-tamil">
                {editingProduct ? 'பொருள் திருத்த (Edit Item)' : 'புதிய பொருள் சேர்க்க (Add New Item)'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-black font-bold">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1 font-tamil">பொருளின் பெயர் (தமிழில்) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name_ta}
                    onChange={(e) => setFormData({ ...formData, name_ta: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-tamil"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Item Name (English) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold block mb-1">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">HSN Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.hsn_code}
                    onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">GST %</label>
                  <select
                    value={formData.gst_rate}
                    onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-bold"
                  >
                    <option value="0">0%</option>
                    <option value="5">5% (CGST 2.5% + SGST 2.5%)</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                    <option value="28">28%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-bold block mb-1">விற்பனை விலை (Selling Price) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">கொள்முதல் விலை (Cost)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">அலகு (Unit)</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded"
                  >
                    <option value="kg">kg (கிலோ)</option>
                    <option value="g">g (கிராம்)</option>
                    <option value="ltr">ltr (லிட்டர்)</option>
                    <option value="pkt">pkt (பாக்கெட்)</option>
                    <option value="pcs">pcs (எண்ணிக்கை)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold block mb-1">தற்போதைய இருப்பு (Current Stock)</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.stock_quantity}
                    onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">எச்சரிக்கை அளவு (Alert Level)</label>
                  <input
                    type="number"
                    value={formData.min_stock_alert}
                    onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
                    className="w-full p-1.5 border border-slate-400 rounded font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 font-bold"
                >
                  ரத்து (Cancel)
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold"
                >
                  சேமிக்க (Save)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
