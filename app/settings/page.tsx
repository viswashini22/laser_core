'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Save, Network, Sliders } from 'lucide-react';

export default function SettingsPage() {
  const [sampleRate, setSampleRate] = useState(16000);
  const [batchSize, setBatchSize] = useState(128);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <Sliders className="h-4 w-4" /> System Configuration
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Signal & Wi-Fi Settings</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure sampling rates, ADC batch buffer sizes, and network timeouts
          </p>
        </div>

        <div className="scada-panel p-6 max-w-xl space-y-4">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Optical Sampling Frequency (Hz)</label>
              <input
                type="number"
                value={sampleRate}
                onChange={(e) => setSampleRate(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">ESP32 Batch Buffer Size (Samples)</label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Number(e.target.value))}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Save Signal Settings
            </button>

            {saved && <p className="text-xs text-emerald-400 font-semibold">Settings updated successfully.</p>}
          </form>
        </div>
      </div>
    </LayoutShell>
  );
}
