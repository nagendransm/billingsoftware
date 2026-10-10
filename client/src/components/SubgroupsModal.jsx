import React, { useState, useEffect } from 'react';

export default function SubgroupsModal({
  isOpen,
  onClose,
  subgroups = [],
  categories = [],
  products = [],
  onRefresh,
  lang = 'ta'
}) {
  // Main view state
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);

  // Subgroup creation / edit state
  const [nameEn, setNameEn] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [editingSubgroup, setEditingSubgroup] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Items drill-down state
  const [subgroupItems, setSubgroupItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsSearch, setItemsSearch] = useState('');
  const [editedPrices, setEditedPrices] = useState({}); // { [productId]: { selling_price, mrp, cost_price } }
  const [savingItemId, setSavingItemId] = useState(null);
  const [savedItemIds, setSavedItemIds] = useState({}); // { [productId]: true }
  const [assignProductId, setAssignProductId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (editingSubgroup) {
      setNameEn(editingSubgroup.name_en || '');
      setNameTa(editingSubgroup.name_ta || '');
      setCategoryId(editingSubgroup.category_id ? String(editingSubgroup.category_id) : '');
    } else {
      setNameEn('');
      setNameTa('');
      setCategoryId('');
    }
    setErrorMsg('');
    setSuccessMsg('');
  }, [editingSubgroup, isOpen]);

  // When modal closes, reset selection
  useEffect(() => {
    if (!isOpen) {
      setSelectedSubgroup(null);
      setEditingSubgroup(null);
      setEditedPrices({});
      setSavedItemIds({});
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedSubgroup) {
          setSelectedSubgroup(null);
        } else if (editingSubgroup) {
          setEditingSubgroup(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, selectedSubgroup, editingSubgroup, onClose]);

  // Load items when a subgroup is selected
  const loadSubgroupItems = async (subgroupId) => {
    setLoadingItems(true);
    setEditedPrices({});
    try {
      const res = await fetch(`/api/subgroups/${subgroupId}/products`);
      const data = await res.json();
      if (data.success) {
        setSubgroupItems(data.data || []);
      } else {
        alert(data.error || 'Failed to load subgroup products');
      }
    } catch (err) {
      console.error(err);
      alert('Error fetching products for subgroup');
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSelectSubgroup = (sg) => {
    setSelectedSubgroup(sg);
    loadSubgroupItems(sg.id);
  };

  const handleBackToList = () => {
    setSelectedSubgroup(null);
    setSubgroupItems([]);
    setEditedPrices({});
    setItemsSearch('');
    if (onRefresh) onRefresh();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nameEn.trim() || !nameTa.trim()) {
      setErrorMsg(lang === 'ta' ? 'தமிழ் மற்றும் ஆங்கிலப் பெயர்களை உள்ளிடவும்!' : 'Enter both Tamil and English names!');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const url = editingSubgroup ? `/api/subgroups/${editingSubgroup.id}` : '/api/subgroups';
      const method = editingSubgroup ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_en: nameEn.trim(),
          name_ta: nameTa.trim(),
          category_id: categoryId ? Number(categoryId) : null
        })
      });

      const data = await res.json();
      if (data.success) {
        setSuccessMsg(editingSubgroup 
          ? (lang === 'ta' ? 'துணைப் பிரிவு புதுப்பிக்கப்பட்டது!' : 'Sub Group updated successfully!')
          : (lang === 'ta' ? 'புதிய துணைப் பிரிவு சேர்க்கப்பட்டது!' : 'Sub Group added successfully!'));
        setEditingSubgroup(null);
        setNameEn('');
        setNameTa('');
        setCategoryId('');
        if (onRefresh) onRefresh();
      } else {
        setErrorMsg(data.error || data.message || 'Error saving subgroup');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubgroup = async (id, name, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm(lang === 'ta' ? `"${name}" துணைப் பிரிவை நீக்க வேண்டுமா?` : `Delete subgroup "${name}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subgroups/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        if (editingSubgroup && editingSubgroup.id === id) {
          setEditingSubgroup(null);
        }
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || data.message || 'Error deleting subgroup');
      }
    } catch (err) {
      console.error(err);
      alert('Network error deleting subgroup');
    }
  };

  // Price change handler for drill-down items
  const handlePriceChange = (productId, field, value) => {
    setEditedPrices(prev => {
      const current = prev[productId] || {};
      const originalItem = subgroupItems.find(it => it.id === productId);
      return {
        ...prev,
        [productId]: {
          selling_price: current.selling_price !== undefined ? current.selling_price : originalItem.selling_price,
          mrp: current.mrp !== undefined ? current.mrp : (originalItem.mrp || originalItem.selling_price),
          cost_price: current.cost_price !== undefined ? current.cost_price : originalItem.cost_price,
          [field]: value
        }
      };
    });
  };

  // Save single item price
  const handleSavePrice = async (item) => {
    const edits = editedPrices[item.id];
    if (!edits) return;

    setSavingItemId(item.id);
    try {
      const res = await fetch(`/api/products/${item.id}/price`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selling_price: Number(edits.selling_price !== undefined ? edits.selling_price : item.selling_price),
          mrp: Number(edits.mrp !== undefined ? edits.mrp : (item.mrp || item.selling_price)),
          cost_price: Number(edits.cost_price !== undefined ? edits.cost_price : item.cost_price)
        })
      });

      const data = await res.json();
      if (data.success) {
        // Update local item in subgroupItems
        setSubgroupItems(prev => prev.map(p => p.id === item.id ? { ...p, ...data.data } : p));
        // Clear edited state for this item
        setEditedPrices(prev => {
          const next = { ...prev };
          delete next[item.id];
          return next;
        });
        // Show success badge
        setSavedItemIds(prev => ({ ...prev, [item.id]: true }));
        setTimeout(() => {
          setSavedItemIds(prev => {
            const next = { ...prev };
            delete next[item.id];
            return next;
          });
        }, 2500);

        if (onRefresh) onRefresh();
      } else {
        alert(data.error || data.message || 'Failed to update price');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating price');
    } finally {
      setSavingItemId(null);
    }
  };

  // Bulk save all edited prices in this subgroup
  const handleSaveAllPrices = async () => {
    const editKeys = Object.keys(editedPrices);
    if (editKeys.length === 0) return;

    setLoading(true);
    try {
      for (const prodId of editKeys) {
        const edits = editedPrices[prodId];
        const item = subgroupItems.find(it => it.id === Number(prodId));
        if (!item) continue;

        await fetch(`/api/products/${prodId}/price`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            selling_price: Number(edits.selling_price !== undefined ? edits.selling_price : item.selling_price),
            mrp: Number(edits.mrp !== undefined ? edits.mrp : (item.mrp || item.selling_price)),
            cost_price: Number(edits.cost_price !== undefined ? edits.cost_price : item.cost_price)
          })
        });
      }
      await loadSubgroupItems(selectedSubgroup.id);
      if (onRefresh) onRefresh();
      alert(lang === 'ta' ? 'அனைத்து விலைகளும் சேமிக்கப்பட்டன!' : 'All prices updated successfully!');
    } catch (err) {
      console.error(err);
      alert('Error saving some prices');
    } finally {
      setLoading(false);
    }
  };

  // Remove an item from the subgroup
  const handleRemoveItem = async (productId, productName) => {
    if (!window.confirm(lang === 'ta' 
      ? `"${productName}" பொருளை இந்தப் பிரிவிலிருந்து நீக்கவா? (பொருள் அழிக்கப்படாது)` 
      : `Remove "${productName}" from this sub group? (Item will not be deleted)`)) {
      return;
    }

    try {
      const res = await fetch(`/api/subgroups/${selectedSubgroup.id}/products/${productId}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSubgroupItems(prev => prev.filter(p => p.id !== productId));
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || 'Failed to remove product');
      }
    } catch (err) {
      console.error(err);
      alert('Error removing product');
    }
  };

  // Assign an existing product to this subgroup
  const handleAssignProduct = async () => {
    if (!assignProductId) return;
    setIsAssigning(true);
    try {
      const res = await fetch(`/api/subgroups/${selectedSubgroup.id}/assign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: Number(assignProductId) })
      });
      const data = await res.json();
      if (data.success) {
        setAssignProductId('');
        await loadSubgroupItems(selectedSubgroup.id);
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || 'Failed to assign product');
      }
    } catch (err) {
      console.error(err);
      alert('Error assigning product');
    } finally {
      setIsAssigning(false);
    }
  };

  if (!isOpen) return null;

  // Filtered subgroups list
  const filteredSubgroups = subgroups.filter(sg => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (sg.name_en && sg.name_en.toLowerCase().includes(q)) ||
      (sg.name_ta && sg.name_ta.includes(q)) ||
      (sg.category_name_ta && sg.category_name_ta.includes(q)) ||
      (sg.category_name_en && sg.category_name_en.toLowerCase().includes(q))
    );
  });

  // Filtered items in drill-down view
  const filteredItems = subgroupItems.filter(item => {
    const q = itemsSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      (item.name_ta && item.name_ta.toLowerCase().includes(q)) ||
      (item.name_en && item.name_en.toLowerCase().includes(q)) ||
      (item.barcode && item.barcode.toLowerCase().includes(q))
    );
  });

  // Products available to assign (not already in this subgroup)
  const availableToAssign = products.filter(p => p.subgroup_id !== selectedSubgroup?.id);

  const hasUnsavedChanges = Object.keys(editedPrices).length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 select-none">
      <div className="bg-white rounded-lg border border-slate-400 max-w-4xl w-full max-h-[94vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center text-xs">
          <div className="font-bold flex items-center space-x-2">
            {selectedSubgroup ? (
              <>
                <button
                  onClick={handleBackToList}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-emerald-700 text-emerald-400 hover:text-white font-bold flex items-center space-x-1 border border-slate-700 transition-colors"
                  title={lang === 'ta' ? 'துணைப் பிரிவுகள் பட்டியலுக்குத் திரும்பு' : 'Back to Sub Groups list'}
                >
                  <span>←</span>
                  <span className="font-tamil">{lang === 'ta' ? 'பின்செல்' : 'Back'}</span>
                </button>
                <span className="text-slate-500">|</span>
                <span className="text-base">📁</span>
                <span className="font-product text-sm text-emerald-300 font-bold">
                  {lang === 'ta' ? selectedSubgroup.name_ta : (selectedSubgroup.name_en || selectedSubgroup.name_ta)}
                </span>
                <span className="text-xs text-slate-300 font-sans">
                  ({lang === 'ta' ? selectedSubgroup.name_en : selectedSubgroup.name_ta})
                </span>
                <span className="text-[10px] bg-emerald-700 text-white font-mono px-2 py-0.5 rounded-full ml-1">
                  {subgroupItems.length} {lang === 'ta' ? 'பொருட்கள்' : 'Items'}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold text-sm">
                  Sub Group Master
                </span>
                <span className="text-[10px] bg-emerald-700 text-white font-mono px-2 py-0.5 rounded-full">
                  {subgroups.length} {lang === 'ta' ? 'பிரிவுகள்' : 'Groups'}
                </span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
          >
            ✕ {lang === 'ta' ? 'மூடு' : 'Close'}
          </button>
        </div>

        {/* Modal Body */}
        {selectedSubgroup ? (
          /* ========================================================================= */
          /* DRILL-DOWN VIEW: ITEMS IN SELECTED SUBGROUP WITH PRICE EDITING */
          /* ========================================================================= */
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs bg-slate-50">
            
            {/* Top Toolbar */}
            <div className="bg-white p-3 rounded border border-slate-300 shadow-xs flex flex-wrap justify-between items-center gap-3">
              
              {/* Search in items */}
              <div className="flex items-center space-x-2 flex-1 min-w-[200px]">
                <input
                  type="text"
                  placeholder={lang === 'ta' ? 'இந்தப் பிரிவில் பொருட்கள் தேடுக...' : 'Search items in this sub group...'}
                  value={itemsSearch}
                  onChange={(e) => setItemsSearch(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              {/* Assign existing product to this subgroup */}
              <div className="flex items-center space-x-1.5">
                <select
                  value={assignProductId}
                  onChange={(e) => setAssignProductId(e.target.value)}
                  className="px-2 py-1.5 border border-slate-400 rounded text-xs font-tamil bg-white max-w-[220px]"
                >
                  <option value="">
                    {lang === 'ta' ? '-- பொருளைச் சேர்க்க தேர்வு செய் --' : '-- Add Item to Group --'}
                  </option>
                  {availableToAssign.map(p => (
                    <option key={p.id} value={p.id}>
                      {lang === 'ta' ? `${p.name_ta} (${p.name_en})` : `${p.name_en || p.name_ta} (${p.name_ta})`}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleAssignProduct}
                  disabled={!assignProductId || isAssigning}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded font-bold font-tamil text-xs shadow-xs"
                >
                  {isAssigning ? '...' : (lang === 'ta' ? '+ சேர்' : '+ Add')}
                </button>
              </div>

              {/* Bulk save changes if multiple items are edited */}
              {hasUnsavedChanges && (
                <button
                  type="button"
                  onClick={handleSaveAllPrices}
                  disabled={loading}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold font-tamil text-xs shadow-xs animate-pulse flex items-center space-x-1"
                >
                  <span>💾</span>
                  <span>{lang === 'ta' ? 'அனைத்து மாற்றங்களையும் சேமி' : 'Save All Changes'} ({Object.keys(editedPrices).length})</span>
                </button>
              )}
            </div>

            {/* Instruction banner */}
            <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-blue-900 text-[11px] flex justify-between items-center">
              <span>
                💡 <b>{lang === 'ta' ? 'விலை திருத்தம்:' : 'Price Edit:'}</b> {lang === 'ta' 
                  ? 'கீழே உள்ள MRP மற்றும் விற்பனை விலையை நேரடியாகத் திருத்தி "சேமி" பொத்தானை அழுத்தவும் அல்லது Enter அழுத்தவும்.' 
                  : 'Edit MRP and Selling Price directly in the inputs below and click Save or press Enter.'}
              </span>
              <span className="font-mono text-slate-500 font-bold">
                {filteredItems.length} {lang === 'ta' ? 'பொருட்கள்' : 'items'}
              </span>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded border border-slate-300 shadow-xs overflow-hidden">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-200 text-slate-800 font-bold sticky top-0 border-b border-slate-300 z-10">
                    <tr>
                      <th className="py-2 px-2 text-center w-10 border-r border-slate-300">#</th>
                      <th className="py-2 px-2 border-r border-slate-300 w-28">
                        {lang === 'ta' ? 'பார்கோடு' : 'Barcode'}
                      </th>
                      <th className="py-2 px-3 border-r border-slate-300 font-tamil">
                        {lang === 'ta' ? 'பொருளின் பெயர் (தமிழ் & English)' : 'Product Name'}
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-16">
                        {lang === 'ta' ? 'அலகு' : 'Unit'}
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-16">
                        {lang === 'ta' ? 'இருப்பு' : 'Stock'}
                      </th>
                      <th className="py-2 px-2 text-right border-r border-slate-300 w-20">
                        {lang === 'ta' ? 'கொள்முதல் (₹)' : 'Cost Price (₹)'}
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-28 bg-amber-100/60 text-amber-950 font-bold">
                        MRP (₹) ✏️
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-300 w-32 bg-emerald-100/60 text-emerald-950 font-bold">
                        {lang === 'ta' ? 'விற்பனை விலை (₹) ✏️' : 'Selling Price (₹) ✏️'}
                      </th>
                      <th className="py-2 px-2 text-center w-28">
                        {lang === 'ta' ? 'செயல்' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {loadingItems ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-500 font-tamil">
                          ⏳ {lang === 'ta' ? 'பொருட்கள் ஏற்றப்படுகின்றன...' : 'Loading items...'}
                        </td>
                      </tr>
                    ) : filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="py-8 text-center text-slate-500 font-tamil space-y-2">
                          <p className="text-sm font-bold">
                            {lang === 'ta' ? 'இந்தப் பிரிவில் பொருட்கள் எதுவும் இல்லை!' : 'No items found in this sub group!'}
                          </p>
                          <p className="text-xs text-slate-400">
                            {lang === 'ta' 
                              ? 'மேலே உள்ள பட்டியலில் இருந்து பொருட்களை இந்தப் பிரிவுக்கு இணைக்கலாம்.' 
                              : 'Select products from the dropdown above to add them to this sub group.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const edits = editedPrices[item.id] || {};
                        const currentSelling = edits.selling_price !== undefined ? edits.selling_price : item.selling_price;
                        const currentMrp = edits.mrp !== undefined ? edits.mrp : (item.mrp || item.selling_price);
                        const isEdited = edits.selling_price !== undefined || edits.mrp !== undefined;
                        const isSaving = savingItemId === item.id;
                        const isSaved = savedItemIds[item.id];

                        return (
                          <tr key={item.id} className={`hover:bg-slate-50 ${isEdited ? 'bg-amber-50/30' : ''}`}>
                            <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-2 font-mono text-slate-600 border-r border-slate-200 text-[11px]">
                              {item.barcode}
                            </td>
                            <td className="py-2 px-3 border-r border-slate-200">
                              <div className="font-bold text-slate-900 font-product text-xs">
                                {lang === 'ta' ? item.name_ta : (item.name_en || item.name_ta)}
                              </div>
                              <div className="text-[11px] text-slate-500 font-sans">
                                {lang === 'ta' ? item.name_en : item.name_ta}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-center text-slate-600 border-r border-slate-200 font-mono text-[11px]">
                              {item.unit}
                            </td>
                            <td className="py-2 px-2 text-center font-mono border-r border-slate-200 text-[11px]">
                              <span className={item.stock_quantity <= item.min_stock_alert ? 'text-rose-700 font-bold' : 'text-slate-700'}>
                                {item.stock_quantity}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono text-slate-500 border-r border-slate-200 text-[11px]">
                              ₹{item.cost_price || 0}
                            </td>
                            
                            {/* Editable MRP */}
                            <td className="py-1.5 px-2 border-r border-slate-200 bg-amber-50/20">
                              <input
                                type="number"
                                step="any"
                                value={currentMrp}
                                onChange={(e) => handlePriceChange(item.id, 'mrp', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSavePrice(item);
                                }}
                                className="w-full px-2 py-1 border border-amber-400 focus:border-amber-600 bg-white rounded font-mono font-bold text-right text-amber-900 text-xs focus:ring-1 focus:ring-amber-500"
                              />
                            </td>

                            {/* Editable Selling Price */}
                            <td className="py-1.5 px-2 border-r border-slate-200 bg-emerald-50/20">
                              <input
                                type="number"
                                step="any"
                                value={currentSelling}
                                onChange={(e) => handlePriceChange(item.id, 'selling_price', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSavePrice(item);
                                }}
                                className="w-full px-2 py-1 border border-emerald-400 focus:border-emerald-600 bg-white rounded font-mono font-bold text-right text-emerald-950 text-xs focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>

                            {/* Action Buttons */}
                            <td className="py-1.5 px-2 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center space-x-1.5">
                                {isSaved ? (
                                  <span className="text-emerald-700 font-bold text-[11px] px-2 py-0.5 bg-emerald-100 rounded animate-fade-in font-tamil">
                                    {lang === 'ta' ? '✓ சேமிக்கப்பட்டது!' : '✓ Saved!'}
                                  </span>
                                ) : isEdited ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSavePrice(item)}
                                    disabled={isSaving}
                                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-bold font-tamil text-[11px] shadow-xs flex items-center space-x-1"
                                    title={lang === 'ta' ? 'விலையை சேமி' : 'Save Price'}
                                  >
                                    <span>💾</span>
                                    <span>{isSaving ? '...' : (lang === 'ta' ? 'சேமி' : 'Save')}</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSavePrice(item)}
                                    className="px-2 py-0.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded text-[11px]"
                                    title={lang === 'ta' ? 'விலையை மாற்றி சேமிக்கவும்' : 'Save Price'}
                                  >
                                    {lang === 'ta' ? 'சேமி' : 'Save'}
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(item.id, item.name_ta || item.name_en)}
                                  className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-1 rounded font-bold text-xs"
                                  title={lang === 'ta' ? 'பிரிவிலிருந்து நீக்கு' : 'Remove from group'}
                                >
                                  ✕
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* DEFAULT VIEW: SUBGROUPS LIST & ADD/EDIT FORM */
          /* ========================================================================= */
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs bg-slate-50">
            
            {/* Add / Edit Form Card */}
            <div className="bg-white p-3.5 rounded border border-slate-300 shadow-xs space-y-3">
              <div className="flex justify-between items-center border-b pb-1.5">
                <h4 className="font-bold text-slate-900 font-tamil text-xs flex items-center space-x-1.5">
                  <span>{editingSubgroup ? '✏️' : '➕'}</span>
                  <span>
                    {editingSubgroup 
                      ? (lang === 'ta' ? 'துணைப் பிரிவு திருத்தம்' : 'Edit Sub Group') 
                      : (lang === 'ta' ? 'புதிய துணைப் பிரிவு சேர்க்க' : 'Add New Sub Group')}
                  </span>
                </h4>
                {editingSubgroup && (
                  <button
                    type="button"
                    onClick={() => setEditingSubgroup(null)}
                    className="text-xs text-rose-600 hover:underline font-bold"
                  >
                    ✕ {lang === 'ta' ? 'திருத்தம் ரத்து' : 'Cancel Edit'}
                  </button>
                )}
              </div>

              {errorMsg && (
                <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  ⚠️ {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                  ✓ {successMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1 font-tamil">
                      {lang === 'ta' ? 'துணைப் பிரிவு (தமிழில்) *' : 'Sub Group Name (Tamil) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="எ.கா. மசாலா பொருட்கள்"
                      value={nameTa}
                      onChange={(e) => setNameTa(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-400 rounded font-product text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">
                      {lang === 'ta' ? 'பெயர் (ஆங்கிலத்தில்) *' : 'Sub Group Name (English) *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Masala Items"
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-400 rounded text-xs focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1 font-tamil">
                      {lang === 'ta' ? 'முதன்மை பிரிவு (Parent Category)' : 'Category (Optional)'}
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-400 rounded text-xs font-tamil bg-white"
                    >
                      <option value="">-- {lang === 'ta' ? 'பொது / தேர்வு செய்க' : 'General / Select'} --</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>
                          {lang === 'ta' ? (c.name_ta || c.name_en) : (c.name_en || c.name_ta)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white rounded font-bold font-tamil text-xs shadow-xs flex items-center space-x-1"
                  >
                    <span>{editingSubgroup ? '💾' : '➕'}</span>
                    <span>
                      {editingSubgroup 
                        ? (lang === 'ta' ? 'புதுப்பி [Save]' : 'Update Sub Group') 
                        : (lang === 'ta' ? 'சேர் [Add Sub Group]' : 'Save Sub Group')}
                    </span>
                  </button>
                </div>
              </form>
            </div>

            {/* Subgroups List Card */}
            <div className="bg-white rounded border border-slate-300 shadow-xs overflow-hidden">
              <div className="p-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap justify-between items-center gap-2">
                <span className="font-bold text-slate-800 font-tamil">
                  {lang === 'ta' ? 'பிரிவுகள் பட்டியல்' : 'Sub Groups List'} ({filteredSubgroups.length})
                </span>
                <span className="text-[11px] text-slate-500 italic font-tamil">
                  {lang === 'ta' ? '💡 ஒரு பிரிவை கிளிக் செய்தால் அதில் உள்ள பொருட்கள் மற்றும் விலையைத் திருத்தலாம்' : '💡 Click a sub group row to view items and edit prices'}
                </span>
                <input
                  type="text"
                  placeholder={lang === 'ta' ? 'பிரிவு தேடுக...' : 'Search sub group...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="px-2.5 py-1 border border-slate-400 rounded text-xs w-48 focus:outline-none"
                />
              </div>

              <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-200 text-slate-700 font-bold sticky top-0 border-b border-slate-300 z-10">
                    <tr>
                      <th className="py-2 px-2 text-center w-10 border-r border-slate-300">#</th>
                      <th className="py-2 px-3 border-r border-slate-300 font-tamil">
                        {lang === 'ta' ? 'துணைப் பிரிவு (தமிழ்)' : 'Tamil Name'}
                      </th>
                      <th className="py-2 px-3 border-r border-slate-300">
                        {lang === 'ta' ? 'ஆங்கிலப் பெயர்' : 'English Name'}
                      </th>
                      <th className="py-2 px-3 border-r border-slate-300 font-tamil">
                        {lang === 'ta' ? 'முதன்மை பிரிவு' : 'Parent Category'}
                      </th>
                      <th className="py-2 px-2 text-center border-r border-slate-300">
                        {lang === 'ta' ? 'பொருட்கள்' : 'Items'}
                      </th>
                      <th className="py-2 px-3 text-center">
                        {lang === 'ta' ? 'செயல்' : 'Action'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSubgroups.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-6 text-center text-slate-500 font-tamil">
                          {lang === 'ta' ? 'துணைப் பிரிவுகள் எதுவும் இல்லை!' : 'No sub groups found!'}
                        </td>
                      </tr>
                    ) : (
                      filteredSubgroups.map((sg, idx) => (
                        <tr 
                          key={sg.id} 
                          onClick={() => handleSelectSubgroup(sg)}
                          className="hover:bg-emerald-50/60 cursor-pointer transition-colors group"
                          title={lang === 'ta' ? 'பொருட்கள் மற்றும் விலையைத் திருத்த கிளிக் செய்க' : 'Click to view items and edit prices'}
                        >
                          <td className="py-2.5 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-slate-900 font-product border-r border-slate-200 group-hover:text-emerald-900">
                            <span className="flex items-center space-x-1.5">
                              <span>📁</span>
                              <span>{sg.name_ta}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200">
                            {sg.name_en}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 font-tamil border-r border-slate-200">
                            {sg.category_name_ta || sg.category_name_en || (
                              <span className="text-slate-400 italic font-sans">{lang === 'ta' ? 'பொதுவானது' : 'General'}</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center border-r border-slate-200">
                            <span className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-xs inline-flex items-center space-x-1 shadow-2xs">
                              <span>📦</span>
                              <span>{sg.product_count || 0}</span>
                              <span className="text-[10px] text-emerald-700 font-tamil underline ml-1">
                                {lang === 'ta' ? 'பார்' : 'View'}
                              </span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleSelectSubgroup(sg)}
                              className="text-emerald-800 hover:text-emerald-950 font-bold px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded text-xs mr-2 font-tamil"
                            >
                              👁️ {lang === 'ta' ? 'பொருட்கள்' : 'Items'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubgroup(sg)}
                              className="text-blue-700 hover:underline font-bold px-1.5 text-xs mr-2 font-tamil"
                            >
                              {lang === 'ta' ? 'திருத்து' : 'Edit'}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteSubgroup(sg.id, sg.name_ta || sg.name_en, e)}
                              className="text-rose-700 hover:underline font-bold px-1.5 text-xs font-tamil"
                            >
                              {lang === 'ta' ? 'நீக்கு' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* Modal Footer */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex justify-between items-center text-xs text-slate-600 font-sans">
          <span>
            {selectedSubgroup ? (
              <span className="font-tamil font-bold text-slate-700">
                {lang === 'ta' ? 'விலை திருத்தம் செய்தவுடன் உடனடியாக பில்லிங்கில் பிரதிபலிக்கும்.' : 'Price updates will reflect immediately in billing.'}
              </span>
            ) : (
              <span>
                {lang === 'ta' ? 'குறிப்பு: பொருட்கள் சேர்க்கும் போது இந்தப் பிரிவுகளைத் தேர்ந்தெடுக்கலாம்.' : 'Note: You can select these sub groups when adding products.'}
              </span>
            )}
          </span>
          <div className="flex space-x-2">
            {selectedSubgroup && (
              <button
                onClick={handleBackToList}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded font-bold font-tamil"
              >
                ← {lang === 'ta' ? 'பிரிவுகள் பட்டியல்' : 'Sub Groups List'}
              </button>
            )}
            <button
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold font-tamil"
            >
              {lang === 'ta' ? 'மூடு [Close]' : 'Close'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
