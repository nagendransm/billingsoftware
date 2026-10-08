import React, { useState } from 'react';

export default function BarcodeModal({ isOpen, onClose, products = [], storeSettings = {}, lang = 'en' }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [search, setSearch] = useState('');
  const [printCount, setPrintCount] = useState(1);

  if (!isOpen) return null;

  const shopName = lang === 'ta'
    ? (storeSettings.shop_name_ta || storeSettings.shop_name_en || 'மளிகை கடை')
    : (storeSettings.shop_name_en || storeSettings.shop_name_ta || 'Grocery POS');

  const filtered = products.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (p.name_ta && p.name_ta.toLowerCase().includes(q)) ||
      (p.name_en && p.name_en.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.toLowerCase().includes(q))
    );
  }).slice(0, 10);

  const prod = selectedProduct || (products.length > 0 ? products[0] : null);

  const handlePrintBarcode = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white border-2 border-slate-400 rounded shadow-2xl w-full max-w-lg overflow-hidden text-slate-800 font-sans">
        {/* Title Bar */}
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-purple-700 font-bold text-sm">❚█║▌</span>
            <span className="font-bold text-xs text-slate-800">
              {lang === 'ta' ? 'பார்கோடு லேபிள் அச்சிடுதல் (Barcode Generation)' : 'Barcode Label Generation'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-rose-600 hover:bg-slate-200 px-2 py-0.5 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-slate-50 space-y-3 text-xs">
          {/* Product Search */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              {lang === 'ta' ? 'பொருளைத் தேர்வு செய்க:' : 'Select Product:'}
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={lang === 'ta' ? 'பொருளின் பெயர் அல்லது பார்கோடு...' : 'Type Product name or barcode...'}
              className="w-full px-2.5 py-1.5 border border-slate-300 rounded text-xs focus:border-purple-600 focus:outline-none bg-white"
            />
            {search && filtered.length > 0 && (
              <div className="mt-1 bg-white border border-slate-300 rounded max-h-32 overflow-y-auto divide-y divide-slate-100 shadow-sm">
                {filtered.map(p => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setSearch('');
                    }}
                    className="p-1.5 hover:bg-purple-50 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <strong className="text-slate-900">{p.name_ta}</strong>
                      <span className="text-slate-500 ml-1">({p.name_en})</span>
                    </div>
                    <span className="font-mono text-purple-700 font-bold">₹{p.selling_price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Label Preview Box */}
          {prod && (
            <div className="border border-slate-300 rounded bg-white p-4 flex flex-col items-center justify-center text-center shadow-xs">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{shopName}</div>
              <div className="font-bold text-sm text-slate-900 mt-0.5">{prod.name_ta}</div>
              <div className="text-[11px] text-slate-500">{prod.name_en}</div>

              {/* Barcode SVG simulation */}
              <div className="my-2 flex flex-col items-center">
                <div className="flex items-center space-x-[2px] h-10 px-4 bg-slate-50 border border-slate-200 rounded">
                  {[3,1,2,1,3,2,1,1,2,3,1,2,1,3,1,2,3,1,1,2,1,3,2,1,2].map((w, idx) => (
                    <div 
                      key={idx} 
                      className="bg-black h-8" 
                      style={{ width: `${w * 1.5}px` }} 
                    />
                  ))}
                </div>
                <div className="font-mono text-[11px] font-bold text-slate-700 tracking-widest mt-1">
                  {prod.barcode || '8901030000000'}
                </div>
              </div>

              <div className="flex items-center space-x-3 text-xs font-bold">
                {prod.mrp > prod.selling_price && (
                  <span className="line-through text-slate-400">MRP ₹{prod.mrp}</span>
                )}
                <span className="text-emerald-700 text-sm">
                  {lang === 'ta' ? 'விலை' : 'PRICE'}: ₹{prod.selling_price} /{prod.unit || 'kg'}
                </span>
              </div>
            </div>
          )}

          {/* Copies */}
          <div className="flex items-center justify-between pt-1">
            <span className="font-medium text-slate-600">
              {lang === 'ta' ? 'அச்சிட வேண்டிய எண்ணிக்கை (Copies):' : 'Number of Labels:'}
            </span>
            <input
              type="number"
              min="1"
              max="500"
              value={printCount}
              onChange={(e) => setPrintCount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-20 px-2 py-1 border border-slate-300 rounded text-center font-bold font-mono focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex justify-between items-center">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded transition-colors"
          >
            {lang === 'ta' ? 'மூடு (Close)' : 'Close'}
          </button>
          <button
            onClick={handlePrintBarcode}
            className="px-4 py-1 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded transition-colors shadow-xs flex items-center space-x-1"
          >
            <span>🖨️</span>
            <span>{lang === 'ta' ? 'பார்கோடு அச்சிடு' : 'Print Barcode'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
