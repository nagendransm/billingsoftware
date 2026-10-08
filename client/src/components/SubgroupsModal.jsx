import React, { useState, useEffect } from 'react';

export default function SubgroupsModal({
  isOpen,
  onClose,
  subgroups = [],
  categories = [],
  onRefresh,
  lang = 'ta'
}) {
  const [nameEn, setNameEn] = useState('');
  const [nameTa, setNameTa] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [editingSubgroup, setEditingSubgroup] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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

  if (!isOpen) return null;

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

  const handleDelete = async (id, name) => {
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

  const filtered = subgroups.filter(sg => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (sg.name_en && sg.name_en.toLowerCase().includes(q)) ||
      (sg.name_ta && sg.name_ta.includes(q)) ||
      (sg.category_name_ta && sg.category_name_ta.includes(q)) ||
      (sg.category_name_en && sg.category_name_en.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 select-none">
      <div className="bg-white rounded-lg border border-slate-400 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 py-2.5 flex justify-between items-center text-xs">
          <div className="font-bold flex items-center space-x-2">
            <span className="text-base">🏷️</span>
            <span className="font-tamil text-sm">
              {lang === 'ta' ? 'துணைப் பிரிவு மேலாண்மை (Sub Group Master)' : 'Sub Group Master'}
            </span>
            <span className="text-[10px] bg-emerald-700 text-white font-mono px-2 py-0.5 rounded-full">
              {subgroups.length} {lang === 'ta' ? 'பிரிவுகள்' : 'Groups'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
          >
            ✕ {lang === 'ta' ? 'மூடு' : 'Close'}
          </button>
        </div>

        {/* Modal Content */}
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
                {lang === 'ta' ? 'பிரிவுகள் பட்டியல்' : 'Sub Groups List'} ({filtered.length})
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
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-6 text-center text-slate-500 font-tamil">
                        {lang === 'ta' ? 'துணைப் பிரிவுகள் எதுவும் இல்லை!' : 'No sub groups found!'}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((sg, idx) => (
                      <tr key={sg.id} className="hover:bg-slate-50">
                        <td className="py-2 px-2 text-center font-mono text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-2 px-3 font-bold text-slate-900 font-product border-r border-slate-200">
                          {sg.name_ta}
                        </td>
                        <td className="py-2 px-3 text-slate-700 border-r border-slate-200">
                          {sg.name_en}
                        </td>
                        <td className="py-2 px-3 text-slate-600 font-tamil border-r border-slate-200">
                          {sg.category_name_ta || sg.category_name_en || (
                            <span className="text-slate-400 italic font-sans">{lang === 'ta' ? 'பொதுவானது' : 'General'}</span>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-emerald-800 border-r border-slate-200">
                          <span className="bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded text-[11px]">
                            {sg.product_count || 0}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center whitespace-nowrap">
                          <button
                            onClick={() => setEditingSubgroup(sg)}
                            className="text-blue-700 hover:underline font-bold px-1.5 text-xs mr-2 font-tamil"
                          >
                            {lang === 'ta' ? 'திருத்து' : 'Edit'}
                          </button>
                          <button
                            onClick={() => handleDelete(sg.id, sg.name_ta || sg.name_en)}
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

        {/* Modal Footer */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex justify-between items-center text-xs text-slate-600 font-sans">
          <span>
            {lang === 'ta' ? 'குறிப்பு: பொருட்கள் சேர்க்கும் போது இந்தப் பிரிவுகளைத் தேர்ந்தெடுக்கலாம்.' : 'Note: You can select these sub groups when adding products.'}
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-bold font-tamil"
          >
            {lang === 'ta' ? 'மூடு [Close]' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
}
