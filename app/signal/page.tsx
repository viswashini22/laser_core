'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Activity, Pause, Play, RefreshCw, Sliders, Waves } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

export default function LiveSignalPage() {
  const [samples, setSamples] = useState<number[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [sampleRate, setSampleRate] = useState(16000);
  const [timeWindowMs, setTimeWindowMs] = useState(16);

  useEffect(() => {
    let timer: any;

    const fetchSignal = async () => {
      if (!isLive || isPaused) return;
      try {
        const res = await fetch('http://localhost:8000/api/signal/latest');
        if (res.ok) {
          const json = await res.json();
          if (json.samples && json.samples.length > 0) {
            setSamples(json.samples);
            setSampleRate(json.sample_rate || 16000);
          }
        }
      } catch {
        // quiet fail
      }
    };

    fetchSignal();
    timer = setInterval(fetchSignal, 300);
    return () => clearInterval(timer);
  }, [isLive, isPaused]);

  const chartData = samples.map((v, i) => ({
    timeMs: Number(((i / sampleRate) * 1000).toFixed(2)),
    amplitude: Number(v.toFixed(4)),
  }));

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
              <Waves className="h-4 w-4" /> Instrument View
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Live Oscillation Waveform</h1>
            <p className="text-xs text-slate-400 mt-1">
              High-resolution time-domain waveform of incoming photodiode sensor samples from ESP32
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 transition ${
                isLive ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-slate-700 bg-slate-800 text-slate-400'
              }`}
            >
              <Play className="h-3.5 w-3.5" /> {isLive ? 'Live Stream Active' : 'Stopped'}
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={`px-4 py-2 rounded-xl border text-xs font-bold transition ${
                isPaused ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300'
              }`}
            >
              <Pause className="h-3.5 w-3.5" /> {isPaused ? 'Resume' : 'Pause'}
            </button>
          </div>
        </div>

        <div className="scada-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Oscilloscope Screen (Time Domain)</h2>
            <div className="text-xs text-slate-400 font-mono">
              Sample Count: {samples.length} | Sampling Rate: {sampleRate} Hz
            </div>
          </div>

          <div className="h-96 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                <XAxis dataKey="timeMs" stroke="#64748b" tickFormatter={(t) => `${t}ms`} />
                <YAxis domain={[-1.2, 1.2]} stroke="#64748b" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  formatter={(val: any) => [`${val} g`, 'Amplitude']}
                />
                <Line type="monotone" dataKey="amplitude" stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
