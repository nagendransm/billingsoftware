import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { cleanTamilText } from '../utils/tamilConverter';

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

  // Excel Import States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState([]);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

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

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Barcode': 'GCR10001001',
        'Item Name (English)': 'Ponni Boiled Rice 25kg',
        'பொருள் பெயர் (தமிழ்)': 'பொன்னி புழுங்கல் அரிசி 25கிலோ',
        'Selling Price': 1250,
        'Cost Price': 1150,
        'MRP': 1300,
        'HSN Code': '1006',
        'GST Rate (%)': 5,
        'Unit': 'bag',
        'Stock Quantity': 50,
        'Min Alert': 5
      },
      {
        'Barcode': '8901030383182',
        'Item Name (English)': 'Toor Dal 1kg',
        'பொருள் பெயர் (தமிழ்)': 'துவரம் பருப்பு 1 கிலோ',
        'Selling Price': 160,
        'Cost Price': 140,
        'MRP': 170,
        'HSN Code': '0713',
        'GST Rate (%)': 0,
        'Unit': 'kg',
        'Stock Quantity': 100,
        'Min Alert': 10
      },
      {
        'Barcode': '',
        'Item Name (English)': 'Groundnut Oil 1L',
        'பொருள் பெயர் (தமிழ்)': 'கடலை எண்ணெய் 1 லிட்டர்',
        'Selling Price': 195,
        'Cost Price': 175,
        'MRP': 210,
        'HSN Code': '1515',
        'GST Rate (%)': 5,
        'Unit': 'ltr',
        'Stock Quantity': 30,
        'Min Alert': 5
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
    XLSX.writeFile(workbook, 'Grocery_Products_Template.xlsx');
  };

  // Handle Excel File Upload & Parse
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setImportStatus(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

        if (!rawJson || rawJson.length === 0) {
          alert(lang === 'ta' ? 'எக்செல் கோப்பில் விவரங்கள் இல்லை!' : 'Excel sheet is empty!');
          return;
        }

        // Map flexible column headers (English & Tamil variations)
        const mapped = rawJson.map((row) => {
          // Detect Tamil name from all common column variations
          const rawTa = (
            row['பொருள் பெயர் (தமிழ்)'] ||
            row['பொருள் பெயர்'] ||
            row['பொருளின் பெயர்'] ||
            row['தமிழ் பெயர்'] ||
            row['பெயர்'] ||
            row['பொருட்கள்'] ||
            row['Tamil Name'] ||
            row['Tamil'] ||
            row['TAMIL NAME'] ||
            row['Item Name (Tamil)'] ||
            row['Product Name (Tamil)'] ||
            row['name_ta'] ||
            ''
          ).toString().trim();

          // Detect English name from all common column variations
          const rawEn = (
            row['Item Name (English)'] ||
            row['Item Name'] ||
            row['Product Name'] ||
            row['Name'] ||
            row['English Name'] ||
            row['Product'] ||
            row['Description'] ||
            row['Particulars'] ||
            row['name_en'] ||
            ''
          ).toString().trim();

          // Clean Tamil text: decodes mojibake, converts TSCII if needed, normalizes Unicode
          let name_ta = cleanTamilText(rawTa);
          let name_en = rawEn;

          // If only one name is provided, auto-fill both
          if (!name_ta && name_en) {
            name_ta = cleanTamilText(name_en);
          } else if (name_ta && !name_en) {
            name_en = name_ta;
          }

          let barcode = (row['Barcode'] || row['barcode'] || row['பார்கோடு'] || row['Bar Code'] || row['Code'] || '').toString().trim();
          if (barcode.includes('e+') || barcode.includes('E+')) {
            const num = Number(barcode);
            if (!isNaN(num)) barcode = BigInt(Math.round(num)).toString();
          }

          const selling_price = row['Selling Price'] || row['selling_price'] || row['Price'] || row['Rate'] || row['விலை'] || row['விற்பனை விலை'] || 0;
          const cost_price = row['Cost Price'] || row['cost_price'] || row['Cost'] || row['கொள்முதல் விலை'] || 0;
          const mrp = row['MRP'] || row['mrp'] || selling_price;
          const hsn_code = (row['HSN Code'] || row['hsn_code'] || row['HSN'] || '1006').toString().trim();
          const gst_rate = row['GST Rate (%)'] || row['GST Rate'] || row['gst_rate'] || row['GST'] || row['GST %'] || 5;
          const unit = (row['Unit'] || row['unit'] || row['UOM'] || row['அலகு'] || 'kg').toString().toLowerCase().trim();
          const stock_quantity = row['Stock Quantity'] || row['stock_quantity'] || row['Stock'] || row['Qty'] || row['இருப்பு'] || 100;
          const min_stock_alert = row['Min Alert'] || row['min_stock_alert'] || row['Min Stock'] || 10;

          return {
            barcode,
            name_en: name_en || name_ta,
            name_ta: name_ta || name_en,
            selling_price: Number(selling_price) || Number(mrp) || Number(cost_price) || 0,
            cost_price: Number(cost_price) || 0,
            mrp: Number(mrp) || Number(selling_price) || 0,
            hsn_code: hsn_code || '1006',
            gst_rate: Number(gst_rate) || 0,
            unit: unit || 'kg',
            stock_quantity: Number(stock_quantity) || 0,
            min_stock_alert: Number(min_stock_alert) || 10
          };
        }).filter(item => item.name_en || item.name_ta);

        setImportPreview(mapped);
      } catch (err) {
        console.error('Failed to parse excel:', err);
        alert(lang === 'ta' ? 'எக்செல் கோப்பை படிக்க முடியவில்லை!' : 'Failed to parse Excel file: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Submit Bulk Import to Server
  const handleConfirmImport = async () => {
    if (!importPreview || importPreview.length === 0) return;

    setImporting(true);
    setImportStatus(null);
    try {
      const res = await fetch('/api/products/bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: importPreview })
      });

      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error(`Server response error (HTTP ${res.status}: ${res.statusText})`);
      }

      if (data.success) {
        setImportStatus({
          type: 'success',
          message: data.message
        });
        if (onRefresh) onRefresh();
        setTimeout(() => {
          setIsImportModalOpen(false);
          setImportPreview([]);
          setImportStatus(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }, 1800);
      } else {
        setImportStatus({
          type: 'error',
          message: data.error || data.message || 'Import failed'
        });
      }
    } catch (err) {
      console.error(err);
      setImportStatus({
        type: 'error',
        message: err.message || 'Network error during import'
      });
    } finally {
      setImporting(false);
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
            className="px-3 py-1.5 border border-slate-400 rounded text-xs w-56 sm:w-64 focus:outline-none"
          />

          {/* Import from Excel Button */}
          <button
            onClick={() => {
              setImportPreview([]);
              setImportStatus(null);
              setIsImportModalOpen(true);
            }}
            className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-bold font-tamil flex items-center space-x-1 shadow-xs"
            title={lang === 'ta' ? 'எக்செல் மூலம் பொருட்களை இறக்குமதி செய்க' : 'Import products from Excel sheet'}
          >
            <span>📊</span>
            <span>{lang === 'ta' ? 'எக்செல் இறக்குமதி' : 'Import Excel'}</span>
          </button>

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

      {/* ======================================================== */}
      {/* EXCEL IMPORT MODAL & PREVIEW TABLE                       */}
      {/* ======================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-slate-400 max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-xs">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center space-x-2">
                <span className="text-base">📊</span>
                <span className="font-bold text-sm font-tamil">
                  {lang === 'ta' ? 'எக்செல் மூலம் பொருட்கள் இறக்குமதி (Excel Import)' : 'Import Products from Excel Sheet'}
                </span>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-base px-1.5"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              
              {/* Instructions and Download Template Bar */}
              <div className="bg-blue-50 border border-blue-200 rounded p-3 flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h4 className="font-bold text-blue-900 font-tamil text-xs">
                    {lang === 'ta' ? 'மாதிரி எக்செல் கோப்பு (Sample Template):' : 'Sample Excel Template:'}
                  </h4>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    {lang === 'ta' 
                      ? 'முதலில் மாதிரி கோப்பைப் பதிவிறக்கி அதில் உங்கள் பொருட்களை நிரப்பி பதிவேற்றலாம்.' 
                      : 'Download our template, enter your items, and upload the file below.'}
                  </p>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded text-xs flex items-center space-x-1 shadow-xs font-tamil"
                >
                  <span>⬇️</span>
                  <span>{lang === 'ta' ? 'மாதிரி எக்செல் பதிவிறக்கு (.xlsx)' : 'Download Template (.xlsx)'}</span>
                </button>
              </div>

              {/* File Upload Box */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-5 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-file-input"
                />
                <label htmlFor="excel-file-input" className="cursor-pointer block">
                  <span className="text-3xl block mb-1">📁</span>
                  <span className="font-bold text-slate-800 text-xs block font-tamil">
                    {lang === 'ta' ? 'எக்செல் கோப்பைத் தேர்வு செய்க (.xlsx, .xls, .csv)' : 'Click to select Excel File (.xlsx, .xls, .csv)'}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Supported: Microsoft Excel (.xlsx, .xls) and CSV
                  </span>
                </label>
              </div>

              {/* Status Message */}
              {importStatus && (
                <div className={`p-2.5 rounded border text-xs font-bold ${
                  importStatus.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-rose-50 text-rose-800 border-rose-300'
                }`}>
                  {importStatus.type === 'success' ? '✅ ' : '⚠️ '}
                  {importStatus.message}
                </div>
              )}

              {/* Import Preview */}
              {importPreview.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs font-tamil">
                      {lang === 'ta' ? 'இறக்குமதி செய்யப்பட உள்ள பொருட்கள்' : 'Items Ready for Import'} ({importPreview.length}):
                    </h4>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {importPreview.length} items parsed
                    </span>
                  </div>

                  <div className="border border-slate-300 rounded max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-300 text-slate-700 font-bold">
                        <tr>
                          <th className="p-1.5 border-r border-slate-300 text-center w-8">#</th>
                          <th className="p-1.5 border-r border-slate-300">பொருள் பெயர் (தமிழ்)</th>
                          <th className="p-1.5 border-r border-slate-300">Item Name (EN)</th>
                          <th className="p-1.5 border-r border-slate-300 text-right">விலை (₹)</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">HSN</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">GST %</th>
                          <th className="p-1.5 border-r border-slate-300 text-center">அலகு (Unit)</th>
                          <th className="p-1.5 text-center">இருப்பு (Stock)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-1.5 text-center font-mono border-r border-slate-200 text-slate-500">{idx + 1}</td>
                            <td className="p-1.5 font-bold font-tamil border-r border-slate-200">{item.name_ta}</td>
                            <td className="p-1.5 border-r border-slate-200 text-slate-700">{item.name_en}</td>
                            <td className="p-1.5 text-right font-mono font-bold border-r border-slate-200">₹{item.selling_price}</td>
                            <td className="p-1.5 text-center font-mono border-r border-slate-200">{item.hsn_code}</td>
                            <td className="p-1.5 text-center font-mono border-r border-slate-200">{item.gst_rate}%</td>
                            <td className="p-1.5 text-center font-mono border-r border-slate-200">{item.unit}</td>
                            <td className="p-1.5 text-center font-mono">{item.stock_quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-2.5 border-t border-slate-300 flex justify-end space-x-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportPreview([]);
                  setImportStatus(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="px-3 py-1.5 rounded border border-slate-300 font-bold bg-white hover:bg-slate-50"
              >
                ரத்து (Close)
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importing || importPreview.length === 0}
                className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold rounded flex items-center space-x-1 font-tamil shadow-xs"
              >
                {importing ? (
                  <span>சேமிக்கிறது...</span>
                ) : (
                  <>
                    <span>✓</span>
                    <span>{lang === 'ta' ? `பொருட்களை இறக்குமதி செய் (${importPreview.length})` : `Import ${importPreview.length} Products`}</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
