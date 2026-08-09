'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Download, History, LineChart } from 'lucide-react';
import { ResponsiveContainer, LineChart as ReLineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/signal/history?limit=50');
      if (res.ok) {
        const json = await res.json();
        setHistory(json.history || []);
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleExportCSV = () => {
    window.open('http://localhost:8000/api/history/export', '_blank');
  };

  const chartData = history.map((h, i) => ({
    id: i,
    time: h.timestamp ? h.timestamp.slice(11, 19) : `${i}`,
    rms: h.rms,
    anomaly: h.anomaly_score,
    freq: h.dominant_freq,
  }));

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              <History className="h-4 w-4" /> Trend Audit Trail
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Machine History</h1>
            <p className="text-xs text-slate-400 mt-1">
              Historical vibration trends, RMS over time, dominant frequency, and anomaly score timeline
            </p>
          </div>

          <button
            onClick={handleExportCSV}
            className="py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2"
          >
            <Download className="h-4 w-4" /> Export CSV Report
          </button>
        </div>

        {/* History Chart */}
        <div className="scada-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-white">RMS & Anomaly Score Timeline</h2>
          <div className="h-72 w-full pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={chartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="time" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="rms" stroke="#38bdf8" name="RMS (g)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="anomaly" stroke="#ef4444" name="Anomaly Score" strokeWidth={2} dot={false} />
                </ReLineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No historical records stored yet
              </div>
            )}
          </div>
        </div>

        {/* History Table */}
        <div className="scada-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Telemetry Log History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 font-mono">
              <thead className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Device ID</th>
                  <th className="py-2.5 px-3">RMS</th>
                  <th className="py-2.5 px-3">Peak</th>
                  <th className="py-2.5 px-3">Crest Factor</th>
                  <th className="py-2.5 px-3">Dominant Freq</th>
                  <th className="py-2.5 px-3">Anomaly Score</th>
                  <th className="py-2.5 px-3">Condition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {history.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-3 text-slate-400">{r.timestamp?.slice(11, 19)}</td>
                    <td className="py-2.5 px-3 text-cyan-300">{r.device_id}</td>
                    <td className="py-2.5 px-3">{r.rms?.toFixed(4)}</td>
                    <td className="py-2.5 px-3">{r.peak?.toFixed(4)}</td>
                    <td className="py-2.5 px-3">{r.crest_factor?.toFixed(2)}</td>
                    <td className="py-2.5 px-3">{r.dominant_freq?.toFixed(1)} Hz</td>
                    <td className="py-2.5 px-3">{r.anomaly_score?.toFixed(2)}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.condition === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {r.condition}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
