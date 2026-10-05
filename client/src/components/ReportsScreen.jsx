import React, { useState, useEffect } from 'react';

export default function ReportsScreen({
  lang = 'ta',
  t = {}
}) {
  const [activeReportTab, setActiveReportTab] = useState('gstr1');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [dashboard, setDashboard] = useState(null);
  const [gstr1Data, setGstr1Data] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/reports/dashboard');
      const data = await res.json();
      if (data.success) setDashboard(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGstr1 = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/gstr1?month=${selectedMonth}&year=${selectedYear}`);
      const data = await res.json();
      if (data.success) setGstr1Data(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDaily = async () => {
    try {
      const res = await fetch('/api/reports/daily-register');
      const data = await res.json();
      if (data.success) setDailyData(data.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDashboard();
    fetchGstr1();
    fetchDaily();
  }, [selectedMonth, selectedYear]);

  const exportToCsv = (filename, rows) => {
    if (!rows || rows.length === 0) return;
    const separator = ',';
    const keys = Object.keys(rows[0]);
    const csvContent =
      keys.join(separator) +
      '\n' +
      rows.map(row => {
        return keys.map(k => {
          let cell = row[k] === null || row[k] === undefined ? '' : row[k];
          cell = cell instanceof Date ? cell.toLocaleString() : cell.toString().replace(/"/g, '""');
          if (cell.search(/("|,|\n)/g) >= 0) cell = `"${cell}"`;
          return cell;
        }).join(separator);
      }).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full px-2 sm:px-4 py-3 space-y-3 text-xs">
      
      {/* Plain High-Contrast Sales Summary Boxes */}
      {dashboard && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded border border-slate-300">
            <div className="text-slate-600 font-tamil">இன்றைய மொத்த விற்பனை</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              ₹ {Number(dashboard.today.total_sales).toFixed(2)}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-300">
            <div className="text-slate-600 font-tamil">இன்றைய ரசீதுகள்</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              {dashboard.today.total_bills}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-300">
            <div className="text-slate-600 font-tamil">வசூலான ஜிஎஸ்டி வரி</div>
            <div className="text-xl font-bold font-mono text-slate-900 mt-0.5">
              ₹ {Number(dashboard.today.total_cgst + dashboard.today.total_sgst).toFixed(2)}
            </div>
          </div>

          <div className="bg-white p-2.5 rounded border border-slate-300">
            <div className="text-slate-600 font-tamil">குறைந்த இருப்பு பொருட்கள்</div>
            <div className="text-xl font-bold font-mono text-rose-700 mt-0.5">
              {dashboard.lowStockCount}
            </div>
          </div>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="bg-white p-2 rounded border border-slate-300 flex flex-wrap justify-between items-center gap-2">
        <div className="flex space-x-1.5">
          <button
            onClick={() => setActiveReportTab('gstr1')}
            className={`px-3 py-1 rounded font-bold border ${
              activeReportTab === 'gstr1'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
            }`}
          >
            GSTR-1 மாத அறிக்கை
          </button>

          <button
            onClick={() => setActiveReportTab('daily')}
            className={`px-3 py-1 rounded font-bold border ${
              activeReportTab === 'daily'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
            }`}
          >
            தினசரி விற்பனை பதிவேடு
          </button>
        </div>

        {activeReportTab === 'gstr1' && (
          <div className="flex items-center space-x-2">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="p-1 border border-slate-400 rounded font-bold"
            >
              {[
                { val: 1, name: '01 - January / ஜனவரி' },
                { val: 2, name: '02 - February / பிப்ரவரி' },
                { val: 3, name: '03 - March / பங்குனி' },
                { val: 4, name: '04 - April / சித்திரை' },
                { val: 5, name: '05 - May / வைகாசி' },
                { val: 6, name: '06 - June / ஆனி' },
                { val: 7, name: '07 - July / ஆடி' },
                { val: 8, name: '08 - August / ஆவணி' },
                { val: 9, name: '09 - September / புரட்டாசி' },
                { val: 10, name: '10 - October / ஐப்பசி' },
                { val: 11, name: '11 - November / கார்த்திகை' },
                { val: 12, name: '12 - December / மார்கழி' }
              ].map(m => (
                <option key={m.val} value={m.val}>{m.name}</option>
              ))}
            </select>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-1 border border-slate-400 rounded font-bold font-mono"
            >
              {[2025, 2026, 2027].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* GSTR-1 View */}
      {activeReportTab === 'gstr1' && gstr1Data && (
        <div className="space-y-3">
          
          {/* Table 7: B2CS Summary */}
          <div className="bg-white rounded border border-slate-300 overflow-hidden">
            <div className="p-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center font-bold">
              <span>அட்டவணை 7: B2C சில்லறை விற்பனை அறிக்கை (Table 7 B2CS Summary)</span>
              <button
                onClick={() => exportToCsv(`GSTR1_Table7_${selectedMonth}_${selectedYear}`, gstr1Data.table7_b2cs)}
                className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded border border-slate-400"
              >
                [Excel / CSV பதிவிறக்கம்]
              </button>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-200 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-3 border-r border-slate-300">வரி விகிதம் (GST Rate)</th>
                  <th className="py-2 px-3 border-r border-slate-300">சப்ளை செய்யும் இடம் (POS)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">வரிக்குட்பட்ட தொகை (₹)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">மத்திய வரி CGST (₹)</th>
                  <th className="py-2 px-3 text-right border-r border-slate-300">மாநில வரி SGST (₹)</th>
                  <th className="py-2 px-3 text-right">மொத்த ரசீது மதிப்பு (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {gstr1Data.table7_b2cs && gstr1Data.table7_b2cs.length > 0 ? (
                  gstr1Data.table7_b2cs.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                      <td className="py-2 px-3 font-bold font-mono border-r border-slate-200">{row.gst_rate}%</td>
                      <td className="py-2 px-3 font-mono border-r border-slate-200">{row.place_of_supply}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{row.taxable_value}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{row.central_tax}</td>
                      <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{row.state_tax}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold">₹{row.total_value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">தகவல்கள் எதுவும் இல்லை</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table 12: HSN Summary */}
          <div className="bg-white rounded border border-slate-300 overflow-hidden">
            <div className="p-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center font-bold">
              <span>அட்டவணை 12: HSN குறியீடு வாரியான விற்பனை அறிக்கை (Table 12 HSN Summary)</span>
              <button
                onClick={() => exportToCsv(`GSTR1_Table12_HSN_${selectedMonth}_${selectedYear}`, gstr1Data.table12_hsn)}
                className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded border border-slate-400"
              >
                [Excel / CSV பதிவிறக்கம்]
              </button>
            </div>

            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-200 font-bold border-b border-slate-300">
                <tr>
                  <th className="py-2 px-2.5 border-r border-slate-300">HSN குறியீடு</th>
                  <th className="py-2 px-2.5 border-r border-slate-300">விளக்கம் (Description)</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">அலகு</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">அளவு</th>
                  <th className="py-2 px-2 text-center border-r border-slate-300">GST %</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300">வரிக்குட்பட்டது (₹)</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300">CGST (₹)</th>
                  <th className="py-2 px-2 text-right border-r border-slate-300">SGST (₹)</th>
                  <th className="py-2 px-2.5 text-right">மொத்த மதிப்பு (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {gstr1Data.table12_hsn && gstr1Data.table12_hsn.length > 0 ? (
                  gstr1Data.table12_hsn.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                      <td className="py-2 px-2.5 font-mono font-bold border-r border-slate-200">{row.hsn_code}</td>
                      <td className="py-2 px-2.5 border-r border-slate-200">
                        <div className="font-bold font-tamil">{row.description_ta}</div>
                        <div className="text-[10px] text-slate-500">{row.description_en}</div>
                      </td>
                      <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{row.uqc}</td>
                      <td className="py-2 px-2 text-center font-mono font-bold border-r border-slate-200">{row.total_quantity}</td>
                      <td className="py-2 px-2 text-center font-mono border-r border-slate-200">{row.gst_rate}%</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">₹{row.taxable_value}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">₹{row.central_tax}</td>
                      <td className="py-2 px-2 text-right font-mono border-r border-slate-200">₹{row.state_tax}</td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold">₹{row.total_value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="py-6 text-center text-slate-400">தகவல்கள் எதுவும் இல்லை</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Daily Register View */}
      {activeReportTab === 'daily' && (
        <div className="bg-white rounded border border-slate-300 overflow-hidden">
          <div className="p-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center font-bold">
            <span>தினசரி விற்பனை மற்றும் வரி பதிவேடு</span>
            <button
              onClick={() => exportToCsv('Daily_Register', dailyData)}
              className="text-xs bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded border border-slate-400"
            >
              [Excel / CSV பதிவிறக்கம்]
            </button>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-200 font-bold border-b border-slate-300">
              <tr>
                <th className="py-2 px-3 border-r border-slate-300">தேதி (Date)</th>
                <th className="py-2 px-3 text-center border-r border-slate-300">ரசீதுகள்</th>
                <th className="py-2 px-3 text-right border-r border-slate-300">வரிக்குட்பட்டது (₹)</th>
                <th className="py-2 px-3 text-right border-r border-slate-300">CGST (₹)</th>
                <th className="py-2 px-3 text-right border-r border-slate-300">SGST (₹)</th>
                <th className="py-2 px-3 text-right border-r border-slate-300">மொத்த வரி (₹)</th>
                <th className="py-2 px-3 text-right">விற்பனை தொகை (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {dailyData.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50 border-b border-slate-200">
                  <td className="py-2 px-3 font-mono font-bold border-r border-slate-200">{d.date}</td>
                  <td className="py-2 px-3 text-center font-mono border-r border-slate-200">{d.bill_count}</td>
                  <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{Number(d.taxable_value).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{Number(d.cgst).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{Number(d.sgst).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono border-r border-slate-200">₹{Number(d.total_tax).toFixed(2)}</td>
                  <td className="py-2 px-3 text-right font-mono font-bold text-sm">₹{Number(d.net_sales).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
