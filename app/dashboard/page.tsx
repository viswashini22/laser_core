'use client';

import { useEffect, useRef, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Sliders,
  Sparkles,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface TelemetryData {
  device_id: string;
  samples: number[];
  sample_rate: number;
  received_at: string | null;
  is_stale: boolean;
  stale_seconds?: number;
  packets_per_sec: number;
  latency_ms: number;
  mode: 'REAL' | 'DEMO';
  analysis: {
    rms: number;
    peak: number;
    peak_to_peak: number;
    crest_factor: number;
    variance: number;
    std_dev: number;
    dominant_freq: number;
    fundamental_freq: number;
    peak_freq_magnitude: number;
    spectral_energy: number;
    spectral_centroid: number;
    signal_quality: number;
  };
  prediction: {
    condition: 'NORMAL' | 'WARNING' | 'CRITICAL';
    anomaly_score: number;
    baseline_deviation: 'Low' | 'Medium' | 'High';
    message: string;
    confidence: number;
    dominant_freq?: number;
    rms?: number;
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<TelemetryData | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [waveformHistory, setWaveformHistory] = useState<Array<{ index: number; value: number }>>([]);
  const [backendOnline, setBackendOnline] = useState(true);

  const fetchTelemetry = async () => {
    if (isPaused || !isMonitoring) return;
    try {
      const res = await fetch('http://localhost:8000/api/signal/latest');
      if (res.ok) {
        const json: TelemetryData = await res.json();
        setData(json);
        setBackendOnline(true);

        if (json.samples && json.samples.length > 0) {
          const formatted = json.samples.map((val, idx) => ({
            index: idx,
            value: Number(val.toFixed(4)),
          }));
          setWaveformHistory(formatted);
        }
      } else {
        setBackendOnline(false);
      }
    } catch {
      setBackendOnline(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 400); // 2.5 FPS stream refresh
    return () => clearInterval(interval);
  }, [isMonitoring, isPaused]);

  const clearWaveform = () => {
    setWaveformHistory([]);
  };

  // Extract variables with defaults
  const condition = data?.prediction?.condition || 'NORMAL';
  const anomalyScore = data?.prediction?.anomaly_score ?? 0.08;
  const baselineDeviation = data?.prediction?.baseline_deviation || 'Low';
  const message = data?.prediction?.message || 'Vibration pattern is within the learned baseline.';
  const isStale = data?.is_stale ?? false;
  const espConnected = data?.device_id && !isStale;
  const mode = data?.mode || 'REAL';

  const rms = data?.analysis?.rms ?? 0.0;
  const peak = data?.analysis?.peak ?? 0.0;
  const dominantFreq = data?.analysis?.dominant_freq ?? 0.0;
  const sampleRate = data?.sample_rate ?? 16000;
  const signalQuality = data?.analysis?.signal_quality ?? 95.0;
  const pps = data?.packets_per_sec ?? (espConnected ? 10 : 0);
  const latency = data?.latency_ms ?? 12;

  // Condition Badge Color Helper
  const getConditionColor = (cond: string) => {
    if (cond === 'NORMAL') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    if (cond === 'WARNING') return 'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    return 'border-rose-500/40 bg-rose-500/10 text-rose-400 shadow-[0_0_18px_rgba(239,68,68,0.3)]';
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="scada-panel p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
                <Sparkles className="h-4 w-4" /> Non-Contact Optical Telemetry
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Machine Vibration Monitor
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Real-time laser photodiode vibration sensing & ML anomaly detection pipeline
              </p>
            </div>

            {/* Top Status Indicators */}
            <div className="flex flex-wrap items-center gap-3">
              {/* System Mode Badge */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${mode === 'REAL' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-purple-500/40 bg-purple-500/10 text-purple-300'}`}>
                {mode === 'REAL' ? '● REAL ESP32 DATA' : '● DEMO SYNTHETIC DATA'}
              </div>

              {/* Machine Condition Status */}
              <div className={`px-4 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${getConditionColor(condition)}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${condition === 'NORMAL' ? 'bg-emerald-400 animate-pulse' : condition === 'WARNING' ? 'bg-amber-400 animate-ping' : 'bg-rose-400 animate-ping'}`} />
                SYSTEM STATUS: {condition}
              </div>

              {/* ESP32 Status */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${espConnected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-slate-700 bg-slate-800 text-slate-400'}`}>
                {espConnected ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-slate-400" />}
                ESP32: {espConnected ? 'Connected' : 'Disconnected'}
              </div>

              {/* Backend Status */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${backendOnline ? 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
                <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-cyan-400' : 'bg-rose-500'}`} />
                Backend: {backendOnline ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
        </div>

        {/* Live Stale Warning Banner if applicable */}
        {isStale && mode === 'REAL' && (
          <div className="scada-panel-warning p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div className="text-xs text-amber-200">
              <span className="font-bold uppercase tracking-wider">STALE TELEMETRY DATA: </span>
              No packet received from ESP32 for over {data?.stale_seconds || 3.0} seconds. Check ESP32 Wi-Fi connection or power.
            </div>
          </div>
        )}

        {/* 8 Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Machine Status */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">1. Machine Status</p>
            <div className="mt-2">
              <p className={`text-xl sm:text-2xl font-bold ${condition === 'NORMAL' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {condition === 'NORMAL' ? 'NORMAL' : 'ABNORMAL'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Anomaly Score: {anomalyScore.toFixed(2)}</p>
            </div>
          </div>

          {/* Card 2: Vibration RMS */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">2. Vibration RMS</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-cyan-300 text-glow-cyan">
                {rms.toFixed(4)} <span className="text-xs font-normal text-slate-400">g</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Energy Baseline</p>
            </div>
          </div>

          {/* Card 3: Peak Amplitude */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">3. Peak Amplitude</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-purple-300">
                {peak.toFixed(4)} <span className="text-xs font-normal text-slate-400">g_pk</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Max Abs Displacement</p>
            </div>
          </div>

          {/* Card 4: Dominant Frequency */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">4. Dominant Frequency</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-cyan-400">
                {dominantFreq.toFixed(1)} <span className="text-xs font-normal text-slate-400">Hz</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">FFT Peak Bin</p>
            </div>
          </div>

          {/* Card 5: Sampling Rate */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">5. Sampling Rate</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-slate-200">
                {sampleRate.toLocaleString()} <span className="text-xs font-normal text-slate-400">Hz</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Optical ADC Target</p>
            </div>
          </div>

          {/* Card 6: Signal Quality */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">6. Signal Quality</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">
                {signalQuality.toFixed(1)}<span className="text-xs font-normal text-slate-400">%</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">SNR Dynamic Range</p>
            </div>
          </div>

          {/* Card 7: Packets/sec */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">7. Packets/sec</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-slate-200">
                {pps} <span className="text-xs font-normal text-slate-400">p/s</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Wi-Fi Ingestion Rate</p>
            </div>
          </div>

          {/* Card 8: Latency */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">8. Backend Latency</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-cyan-300">
                {latency} <span className="text-xs font-normal text-slate-400">ms</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Processing Delay</p>
            </div>
          </div>
        </div>

        {/* Oscilloscope Waveform & Condition Result Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Oscilloscope Panel (Span 2 cols) */}
          <div className="scada-panel p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Live Oscillation</p>
                <h2 className="text-lg font-bold text-white">Time-Domain Signal Waveform</h2>
              </div>

              {/* Waveform Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMonitoring(!isMonitoring)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${isMonitoring ? 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700' : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'}`}
                >
                  {isMonitoring ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {isMonitoring ? 'Stop' : 'Start'}
                </button>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition ${isPaused ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={clearWaveform}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Waveform Chart */}
            <div className="h-72 w-full pt-2">
              {waveformHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waveformHistory}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={[-1.2, 1.2]} stroke="#64748b" tickFormatter={(v) => v.toFixed(1)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val} g`, 'Normalized Amp']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No waveform samples available
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span>X Axis: Time (Samples)</span>
              <span>Y Axis: Normalized Amplitude (-1.0 to +1.0)</span>
              <span className="text-cyan-400 font-semibold">Live ESP32 Stream: {isMonitoring && !isPaused ? 'Active' : 'Paused'}</span>
            </div>
          </div>

          {/* Machine Condition Anomaly Result Card (1 col) */}
          <div className={`p-6 flex flex-col justify-between ${condition === 'NORMAL' ? 'scada-panel-healthy' : condition === 'WARNING' ? 'scada-panel-warning' : 'scada-panel-critical'}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Condition Assessment</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${condition === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : condition === 'WARNING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'}`}>
                  {condition}
                </span>
              </div>

              {/* Large Visual Condition State */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-950/60 border border-white/10 mb-3">
                  {condition === 'NORMAL' ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-10 w-10 text-amber-400 animate-bounce" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{condition}</h3>
                <p className="text-xs text-slate-300 mt-2 px-2 leading-relaxed">"{message}"</p>
              </div>

              {/* Metrics details */}
              <div className="mt-6 space-y-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Anomaly Score:</span>
                  <span className="font-mono font-bold text-white">{anomalyScore.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Baseline Deviation:</span>
                  <span className="font-semibold text-cyan-300">{baselineDeviation}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dominant Frequency:</span>
                  <span className="font-mono font-bold text-white">{dominantFreq.toFixed(1)} Hz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Calculated RMS:</span>
                  <span className="font-mono font-bold text-white">{rms.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-[10px] text-center text-slate-400 italic">
              ML Model: Anomaly Detection pipeline against baseline profile.
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
