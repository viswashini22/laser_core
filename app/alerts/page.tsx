'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { AlertTriangle, Bell, Save, ShieldAlert } from 'lucide-react';

export default function AlertsPage() {
  const [alertsData, setAlertsData] = useState<any>({ thresholds: {}, alerts: [] });
  const [thresholds, setThresholds] = useState<any>({
    rms_threshold: 0.45,
    crest_factor_threshold: 4.5,
    anomaly_threshold: 0.65,
    low_signal_quality_threshold: 40.0,
  });
  const [msg, setMsg] = useState('');

  const fetchAlerts = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/alerts');
      if (res.ok) {
        const json = await res.json();
        setAlertsData(json);
        if (json.thresholds) setThresholds(json.thresholds);
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/alerts/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thresholds),
      });
      if (res.ok) {
        setMsg('Alert threshold configuration updated.');
        fetchAlerts();
      }
    } catch {
      setMsg('Failed to update thresholds.');
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-widest">
            <Bell className="h-4 w-4" /> Notification Engine
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Alert System & Threshold Config</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure automated alarm limits for RMS spikes, crest factor impacts, anomaly scores, and optical signal dropouts
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Threshold Config Form */}
          <div className="scada-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-400" /> Alarm Limits
            </h2>

            <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Vibration RMS Threshold (g)</label>
                <input
                  type="number"
                  step="0.01"
                  value={thresholds.rms_threshold || 0.45}
                  onChange={(e) => setThresholds({ ...thresholds, rms_threshold: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Crest Factor Threshold</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholds.crest_factor_threshold || 4.5}
                  onChange={(e) => setThresholds({ ...thresholds, crest_factor_threshold: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Anomaly Score Threshold (0-1)</label>
                <input
                  type="number"
                  step="0.05"
                  value={thresholds.anomaly_threshold || 0.65}
                  onChange={(e) => setThresholds({ ...thresholds, anomaly_threshold: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Low Signal Quality Limit (%)</label>
                <input
                  type="number"
                  step="1"
                  value={thresholds.low_signal_quality_threshold || 40.0}
                  onChange={(e) => setThresholds({ ...thresholds, low_signal_quality_threshold: Number(e.target.value) })}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center justify-center gap-2"
              >
                <Save className="h-4 w-4" /> Save Thresholds
              </button>

              {msg && <p className="text-[11px] text-amber-300 text-center font-semibold">{msg}</p>}
            </form>
          </div>

          {/* Active Alerts List */}
          <div className="scada-panel p-6 lg:col-span-2 space-y-4">
            <h2 className="text-base font-bold text-white">Active Alert Log History</h2>

            {alertsData.alerts && alertsData.alerts.length > 0 ? (
              <div className="space-y-3">
                {alertsData.alerts.map((a: any) => (
                  <div key={a.id} className={`p-4 rounded-xl border flex items-start gap-3 ${
                    a.severity === 'CRITICAL' ? 'scada-panel-critical' : 'scada-panel-warning'
                  }`}>
                    <AlertTriangle className={`h-5 w-5 shrink-0 ${a.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`} />
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${a.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'}`}>
                          {a.severity}
                        </span>
                        <span className="text-slate-400 font-mono text-[11px]">{a.timestamp?.slice(11, 19)}</span>
                      </div>
                      <p className="text-white font-medium">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No active alarm triggers recorded. All vibration parameters are within safety limits.
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
