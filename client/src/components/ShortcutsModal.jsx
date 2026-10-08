import React from 'react';

export default function ShortcutsModal({ isOpen, onClose, lang = 'en' }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'F1', descTa: 'பில்லிங் (ஜிஎஸ்டி விற்பனை பில்) / மெனு', descEn: 'Sales Bill (GST Invoice) / Transactions' },
    { key: 'F2', descTa: 'புதிய பில் தொடங்கு / பொருட்கள் முதன்மை', descEn: 'New Bill Entry / Products Master' },
    { key: 'F3', descTa: 'விற்பனை ஏடு / கடந்த பில்கள்', descEn: 'Sales Day Book / Invoices' },
    { key: 'F4', descTa: 'பொருட்கள் தேடல் / ஜிஎஸ்டி அறிக்கை', descEn: 'Search Item in POS / GST Reports' },
    { key: 'F5', descTa: 'வாடிக்கையாளர் கடன் கணக்கு', descEn: 'Customer Credit & Accounts' },
    { key: 'F6', descTa: 'கடை அமைப்புகள் & மேலாண்மை', descEn: 'Settings & Administration' },
    { key: 'F8', descTa: 'பில் சேமித்தல் (அச்சு இன்றி)', descEn: 'Save Bill (Without Print)' },
    { key: 'F9', descTa: 'பில் சேமித்து அச்சிடுதல் (Print)', descEn: 'Save & Print Invoice' },
    { key: 'F10', descTa: 'பில் நிலுவை வைத்தல் (Hold Order)', descEn: 'Hold Bill (Sales Order)' },
    { key: 'Alt + S', descTa: 'பழைய பில்களைத் தேடுதல்', descEn: 'Search Past Bills Instantly' },
    { key: 'Alt + T', descTa: 'பரிவர்த்தனைகள் மெனு (Transactions)', descEn: 'Transactions Menu' },
    { key: 'Alt + M', descTa: 'முதன்மை அமைப்புகள் (Masters)', descEn: 'Masters Menu' },
    { key: 'Alt + A', descTa: 'கணக்குகள் மெனு (Accounts)', descEn: 'Accounts Menu' },
    { key: 'Alt + U', descTa: 'பயன்பாடுகள் மெனு (Utility)', descEn: 'Utility Menu' },
    { key: 'Esc', descTa: 'மெனு / சாளரம் மூடுதல்', descEn: 'Close Menu / Dialog' },
  ];

  return (
    <div className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-white border-2 border-slate-400 rounded shadow-2xl w-full max-w-lg overflow-hidden text-slate-800 font-sans">
        {/* Title Bar */}
        <div className="bg-slate-100 border-b border-slate-300 px-3 py-1.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-purple-700 font-bold text-sm">⌨</span>
            <span className="font-bold text-xs text-slate-800">
              {lang === 'ta' ? 'விசைப்பலகை குறுக்குவழிகள் வழிகாட்டி' : 'Keyboard Shortcuts Guide'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-500 hover:text-rose-600 hover:bg-slate-200 px-2 py-0.5 rounded text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Shortcuts Table */}
        <div className="p-3 max-h-96 overflow-y-auto bg-slate-50">
          <table className="w-full text-xs text-left border border-slate-200 bg-white">
            <thead className="bg-slate-200 text-slate-700 font-bold uppercase text-[10px]">
              <tr>
                <th className="px-3 py-1.5 border-b border-slate-300 w-28">Shortcut</th>
                <th className="px-3 py-1.5 border-b border-slate-300">
                  {lang === 'ta' ? 'செயல்பாடு' : 'Action'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {shortcuts.map((sc, i) => (
                <tr key={i} className="hover:bg-purple-50 transition-colors">
                  <td className="px-3 py-1 border-r border-slate-200 font-mono font-bold text-purple-900 bg-slate-50">
                    <span className="bg-white border border-purple-200 px-1.5 py-0.5 rounded shadow-2xs">
                      {sc.key}
                    </span>
                  </td>
                  <td className="px-3 py-1 text-slate-700">
                    {lang === 'ta' ? sc.descTa : sc.descEn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 border-t border-slate-200 px-3 py-2 flex justify-between items-center text-[11px] text-slate-500">
          <span>{lang === 'ta' ? 'முழு விசைப்பலகை கட்டுப்பாடு ஆதரிக்கப்படுகிறது.' : 'Full keyboard workflow supported.'}</span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded transition-colors shadow-xs"
          >
            {lang === 'ta' ? 'சரி (OK)' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
}
