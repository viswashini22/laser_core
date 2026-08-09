'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Activity, BarChart2, Cpu, LineChart, Sliders, Zap } from 'lucide-react';

export default function VibrationAnalysisPage() {
  const [analysis, setAnalysis] = useState<any>(null);

  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/analysis/latest');
        if (res.ok) {
          const json = await res.json();
          setAnalysis(json.analysis || {});
        }
      } catch {
        // quiet
      }
    };

    fetchAnalysis();
    const timer = setInterval(fetchAnalysis, 500);
    return () => clearInterval(timer);
  }, []);

  const featureList = [
    { label: 'RMS (Root Mean Square)', val: analysis?.rms ?? 0.0, unit: 'g', desc: 'Overall vibration energy content' },
    { label: 'Peak Amplitude', val: analysis?.peak ?? 0.0, unit: 'g_pk', desc: 'Maximum absolute signal peak' },
    { label: 'Peak-to-Peak (P-P)', val: analysis?.peak_to_peak ?? 0.0, unit: 'g_p2p', desc: 'Total peak amplitude displacement' },
    { label: 'Crest Factor', val: analysis?.crest_factor ?? 0.0, unit: 'ratio', desc: 'Impact severity ratio (Peak / RMS)' },
    { label: 'Variance', val: analysis?.variance ?? 0.0, unit: 'g²', desc: 'Statistical signal variance' },
    { label: 'Standard Deviation', val: analysis?.std_dev ?? 0.0, unit: 'g', desc: 'Signal standard deviation' },
    { label: 'Dominant Frequency', val: analysis?.dominant_freq ?? 0.0, unit: 'Hz', desc: 'Highest amplitude spectral peak' },
    { label: 'Spectral Energy', val: analysis?.spectral_energy ?? 0.0, unit: 'E', desc: 'Integrated spectral power' },
    { label: 'Spectral Centroid', val: analysis?.spectral_centroid ?? 0.0, unit: 'Hz', desc: 'Center of spectral mass' },
  ];

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <LineChart className="h-4 w-4" /> Feature Extraction Engine
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Machine Vibration Analysis</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time mathematical time & frequency domain feature computation for industrial machinery condition monitoring
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featureList.map((f) => (
            <div key={f.label} className="scada-panel p-5 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{f.label}</p>
              <p className="text-2xl font-bold text-cyan-300 font-mono">
                {typeof f.val === 'number' ? f.val.toFixed(4) : f.val} <span className="text-xs font-normal text-slate-400">{f.unit}</span>
              </p>
              <p className="text-[10px] text-slate-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Frequency Band Energy Distribution */}
        <div className="scada-panel p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Frequency-Band Energy Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs font-bold text-cyan-400 uppercase">Low Band (0 - 100 Hz)</p>
              <p className="text-xl font-bold text-white mt-1 font-mono">{analysis?.band_energy_low ?? 0.0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Machine rotation, unbalance, mechanical looseness</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs font-bold text-purple-400 uppercase">Mid Band (100 - 1000 Hz)</p>
              <p className="text-xl font-bold text-white mt-1 font-mono">{analysis?.band_energy_mid ?? 0.0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Gear mesh vibrations, structural resonance, misalignment</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <p className="text-xs font-bold text-amber-400 uppercase">High Band (1000 - 8000 Hz)</p>
              <p className="text-xl font-bold text-white mt-1 font-mono">{analysis?.band_energy_high ?? 0.0}</p>
              <p className="text-[10px] text-slate-400 mt-1">Bearing race impacts, electrical noise, high-freq impulse</p>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
