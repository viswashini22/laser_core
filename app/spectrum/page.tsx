'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { BarChart3, Activity, Layers, Zap } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export default function FrequencySpectrumPage() {
  const [domain, setDomain] = useState<'FREQUENCY' | 'TIME'>('FREQUENCY');
  const [fftSpectrum, setFftSpectrum] = useState<Array<{ freq: number; magnitude: number }>>([]);
  const [samples, setSamples] = useState<number[]>([]);
  const [dominantFreq, setDominantFreq] = useState(0);
  const [fundamentalFreq, setFundamentalFreq] = useState(0);
  const [peakMagnitude, setPeakMagnitude] = useState(0);

  useEffect(() => {
    const fetchSpectrum = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/signal/latest');
        if (res.ok) {
          const json = await res.json();
          if (json.analysis) {
            setFftSpectrum(json.analysis.fft_spectrum || []);
            setDominantFreq(json.analysis.dominant_freq || 0);
            setFundamentalFreq(json.analysis.fundamental_freq || 0);
            setPeakMagnitude(json.analysis.peak_freq_magnitude || 0);
          }
          if (json.samples) {
            setSamples(json.samples);
          }
        }
      } catch {
        // quiet
      }
    };

    fetchSpectrum();
    const timer = setInterval(fetchSpectrum, 500);
    return () => clearInterval(timer);
  }, []);

  const timeChartData = samples.map((v, idx) => {
    const val = typeof v === 'number' ? v : (v && typeof v === 'object' && 'value' in v ? Number((v as any).value) : 0);
    return { index: idx, amp: Number(val.toFixed(4)) };
  });

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              <BarChart3 className="h-4 w-4" /> Spectral Analyzer
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">FFT & Frequency Spectrum</h1>
            <p className="text-xs text-slate-400 mt-1">
              Fast Fourier Transform analysis computed from incoming photodiode vibration samples
            </p>
          </div>

          {/* Domain Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setDomain('TIME')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                domain === 'TIME' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              TIME DOMAIN
            </button>
            <button
              onClick={() => setDomain('FREQUENCY')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                domain === 'FREQUENCY' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              FREQUENCY DOMAIN
            </button>
          </div>
        </div>

        {/* FFT Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="scada-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Dominant Frequency</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{dominantFreq.toFixed(1)} <span className="text-xs text-slate-400">Hz</span></p>
            <p className="text-[10px] text-slate-400 mt-1">Highest Energy Spectral Peak</p>
          </div>

          <div className="scada-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Fundamental Frequency</p>
            <p className="text-2xl font-bold text-purple-300 mt-1">{fundamentalFreq.toFixed(1)} <span className="text-xs text-slate-400">Hz</span></p>
            <p className="text-[10px] text-slate-400 mt-1">1X Machine Rotational Speed</p>
          </div>

          <div className="scada-panel p-4">
            <p className="text-[11px] font-semibold text-slate-400 uppercase">Peak Magnitude</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{peakMagnitude.toFixed(4)} <span className="text-xs text-slate-400">g</span></p>
            <p className="text-[10px] text-slate-400 mt-1">Maximum Spectral Amplitude</p>
          </div>
        </div>

        {/* Chart View */}
        <div className="scada-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">
              {domain === 'FREQUENCY' ? 'FFT Power Spectrum (Frequency Domain)' : 'Signal Envelope (Time Domain)'}
            </h2>
            <span className="text-xs text-slate-400 font-mono">Hann Windowed rFFT</span>
          </div>

          <div className="h-96 w-full pt-4">
            {domain === 'FREQUENCY' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fftSpectrum}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="freq" stroke="#64748b" tickFormatter={(f) => `${f}Hz`} />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} g`, 'Spectral Mag']}
                    labelFormatter={(lbl) => `Freq: ${lbl} Hz`}
                  />
                  <Bar dataKey="magnitude" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeChartData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                  <XAxis dataKey="index" stroke="#64748b" />
                  <YAxis domain={[-1.2, 1.2]} stroke="#64748b" />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }} />
                  <Line type="monotone" dataKey="amp" stroke="#a855f7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
