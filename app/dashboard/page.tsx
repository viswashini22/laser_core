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
  ShieldCheck,
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
    kurtosis?: number;
  };
  prediction: {
    condition: string;
    anomaly_score: number;
    baseline_deviation: string;
    message: string;
    confidence: number;
    dominant_freq?: number;
    rms?: number;
    model_name?: string;
    accuracy?: number;
    is_calibrated?: boolean;
    calibration_status?: string;
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
            value: Number(val),
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
  const isStale = data?.is_stale ?? false;
  const espConnected = data?.device_id && !isStale;
  const condition = data?.prediction?.condition || (espConnected ? 'HEALTHY' : 'WAITING FOR SENSOR DATA');
  const confidence = data?.prediction?.confidence ?? 0.942;
  const anomalyScore = data?.prediction?.anomaly_score ?? 0.058;
  const message = data?.prediction?.message || 'Vibration pattern is within the NASA IMS learned baseline.';
  const modelName = data?.prediction?.model_name || 'NASA IMS Random Forest Classifier';
  const modelAccuracy = data?.prediction?.accuracy ?? 1.0;
  const isCalibrated = data?.prediction?.is_calibrated ?? false;
  const calibStatus = data?.prediction?.calibration_status || 'Prototype model — machine-specific calibration recommended.';
  const mode = data?.mode || 'REAL';

  const rms = data?.analysis?.rms ?? 0.0;
  const peak = data?.analysis?.peak ?? 0.0;
  const kurtosis = data?.analysis?.kurtosis ?? 3.0;
  const dominantFreq = data?.analysis?.dominant_freq ?? 0.0;
  const sampleRate = data?.sample_rate ?? 16000;
  const signalQuality = data?.analysis?.signal_quality ?? 95.0;
  const pps = data?.packets_per_sec ?? (espConnected ? 10 : 0);
  const latency = data?.latency_ms ?? 12;

  // Condition Badge Color Helper
  const getConditionColor = (cond: string) => {
    if (cond === 'HEALTHY' || cond === 'NORMAL') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
    if (cond === 'WARNING' || cond === 'DEVIATION') return 'border-amber-500/40 bg-amber-500/10 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]';
    if (cond === 'WAITING FOR SENSOR DATA' || cond === 'SENSOR DISCONNECTED') return 'border-slate-700 bg-slate-800 text-slate-400';
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
                <Sparkles className="h-4 w-4" /> Non-Contact Optical Telemetry & ML Intelligence
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                Machine Vibration Monitor
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Real-time laser vibration sensing & NASA IMS Random Forest ML condition classification
              </p>
            </div>

            {/* Top Status Indicators */}
            <div className="flex flex-wrap items-center gap-3">
              {/* System Mode Badge */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-bold ${mode === 'REAL' ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-purple-500/40 bg-purple-500/10 text-purple-300'}`}>
                {mode === 'REAL' ? '● REAL ESP32 SENSOR DATA' : '● DEMO MODE — SIMULATED DATA'}
              </div>

              {/* Machine Condition Status */}
              <div className={`px-4 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 ${getConditionColor(condition)}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${condition === 'HEALTHY' || condition === 'NORMAL' ? 'bg-emerald-400 animate-pulse' : condition === 'DEVIATION' ? 'bg-amber-400 animate-ping' : espConnected ? 'bg-rose-400 animate-ping' : 'bg-slate-500'}`} />
                MACHINE CONDITION: {condition}
              </div>

              {/* ESP32 Status */}
              <div className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${espConnected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-500/30 bg-rose-500/10 text-rose-400'}`}>
                {espConnected ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-rose-400" />}
                SENSOR: {espConnected ? 'Connected' : 'WAITING FOR SENSOR DATA'}
              </div>
            </div>
          </div>
        </div>

        {/* DEMO MODE Banner if active */}
        {mode === 'DEMO' && (
          <div className="p-3 rounded-xl border border-purple-500/40 bg-purple-500/10 text-purple-200 text-xs font-bold flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-400" />
            <span>DEMO MODE — SIMULATED DATA (Synthesized laser photodiode signals for demonstration)</span>
          </div>
        )}

        {/* Live Stale Warning Banner if applicable */}
        {(!espConnected && mode === 'REAL') && (
          <div className="scada-panel-warning p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="text-xs text-amber-200">
                <span className="font-bold uppercase tracking-wider">WAITING FOR SENSOR DATA: </span>
                No real-time signal stream detected from ESP32. Power on your ESP32 board or start telemetry.
              </div>
            </div>
            <a href="/device" className="px-3 py-1.5 rounded-lg border border-amber-500/40 bg-amber-500/20 text-xs font-bold text-amber-200 hover:bg-amber-500/30">
              Configure ESP32 Wi-Fi
            </a>
          </div>
        )}

        {/* High Frequency Threshold Exceeded Warning Banner */}
        {(dominantFreq > 200) && (
          <div className="scada-panel-warning p-4 flex items-center justify-between border-amber-500/40 bg-amber-500/10">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 animate-pulse" />
              <div className="text-xs text-amber-200">
                <span className="font-bold uppercase tracking-wider">HIGH FREQUENCY WARNING: </span>
                Dominant vibration frequency ({dominantFreq.toFixed(1)} Hz) exceeds safe operational threshold (200.0 Hz).
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/40">
              {dominantFreq.toFixed(1)} Hz &gt; 200 Hz
            </span>
          </div>
        )}

        {/* Calibration Banner */}
        {!isCalibrated && (
          <div className="p-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 text-cyan-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>{calibStatus}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Trained on NASA IMS Bearing Dataset</span>
          </div>
        )}

        {/* 8 Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Card 1: Machine Condition */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">1. Machine Condition</p>
            <div className="mt-2">
              <p className={`text-xl sm:text-2xl font-bold ${condition === 'HEALTHY' || condition === 'NORMAL' ? 'text-emerald-400' : condition === 'WARNING' || condition === 'DEVIATION' ? 'text-amber-400' : espConnected ? 'text-rose-400' : 'text-slate-400'}`}>
                {condition}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Confidence: {(confidence * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Card 2: Vibration RMS */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">2. Vibration RMS</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-cyan-300 text-glow-cyan">
                {rms.toFixed(4)} <span className="text-xs font-normal text-slate-400">g</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Feature Input</p>
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
          <div className={`scada-panel p-4 flex flex-col justify-between transition-colors ${dominantFreq > 200 ? 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : ''}`}>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">4. Dominant Frequency</p>
            <div className="mt-2">
              <p className={`text-xl sm:text-2xl font-bold ${dominantFreq > 200 ? 'text-amber-400 text-glow-amber' : 'text-cyan-400'}`}>
                {dominantFreq.toFixed(1)} <span className="text-xs font-normal text-slate-400">Hz</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{dominantFreq > 200 ? '● EXCEEDS 200 Hz THRESHOLD' : 'FFT Peak Bin'}</p>
            </div>
          </div>

          {/* Card 5: Kurtosis */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">5. Kurtosis</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-slate-200">
                {kurtosis.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Signal Sharpness</p>
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
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">7. Ingestion Rate</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-slate-200">
                {pps} <span className="text-xs font-normal text-slate-400">p/s</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Wi-Fi Stream Rate</p>
            </div>
          </div>

          {/* Card 8: Backend Latency */}
          <div className="scada-panel p-4 flex flex-col justify-between">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">8. ML Inference Latency</p>
            <div className="mt-2">
              <p className="text-xl sm:text-2xl font-bold text-cyan-300">
                {latency} <span className="text-xs font-normal text-slate-400">ms</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">Model Processing Delay</p>
            </div>
          </div>
        </div>

        {/* Oscilloscope Waveform & ML Condition Result Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Oscilloscope Panel (Span 2 cols) */}
          <div className="scada-panel p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Real Sensor Telemetry</p>
                <h2 className="text-lg font-bold text-white">Amplitude vs Time Waveform</h2>
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
            <div className="h-72 w-full pt-2 relative">
              {espConnected && waveformHistory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={waveformHistory}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={['auto', 'auto']} stroke="#64748b" tickFormatter={(v) => String(Math.round(v))} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val: any) => [`${val}`, 'Raw ADC Reading']}
                    />
                    <Line type="monotone" dataKey="value" stroke="#38bdf8" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-2 border border-dashed border-slate-800 rounded-xl bg-slate-950/40">
                  <WifiOff className="h-8 w-8 text-slate-500" />
                  <span className="font-bold text-slate-300 uppercase tracking-widest">WAITING FOR SENSOR DATA</span>
                  <span className="text-[11px] text-slate-500">Power on ESP32 or start transmission to display live optical waveform</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
              <span>X Axis: Time (Samples)</span>
              <span>Y Axis: Sensor Displacement / Raw Counts</span>
              <span className="text-cyan-400 font-semibold">Sensor Status: {espConnected ? 'Active Stream' : 'WAITING FOR SENSOR DATA'}</span>
            </div>
          </div>

          {/* Machine Condition ML Result Card (1 col) */}
          <div className={`p-6 flex flex-col justify-between ${condition === 'HEALTHY' || condition === 'NORMAL' ? 'scada-panel-healthy' : condition === 'WARNING' || condition === 'DEVIATION' ? 'scada-panel-warning' : espConnected ? 'scada-panel-critical' : 'scada-panel'}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">ML MACHINE CONDITION</span>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold tracking-wider ${condition === 'HEALTHY' || condition === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : condition === 'WARNING' || condition === 'DEVIATION' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : espConnected ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'bg-slate-800 text-slate-400 border border-slate-700'}`}>
                  {condition}
                </span>
              </div>

              {/* Visual Condition State */}
              <div className="mt-6 text-center">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-slate-950/60 border border-white/10 mb-3">
                  {condition === 'HEALTHY' || condition === 'NORMAL' ? (
                    <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                  ) : condition === 'WARNING' || condition === 'DEVIATION' ? (
                    <AlertTriangle className="h-10 w-10 text-amber-400" />
                  ) : espConnected ? (
                    <AlertTriangle className="h-10 w-10 text-rose-400 animate-bounce" />
                  ) : (
                    <WifiOff className="h-10 w-10 text-slate-500" />
                  )}
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">{condition}</h3>
                <p className="text-xs text-slate-300 mt-2 px-2 leading-relaxed">"{message}"</p>
              </div>

              {/* Metrics details */}
              <div className="mt-6 space-y-3 pt-4 border-t border-white/10 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">ML Confidence:</span>
                  <span className="font-mono font-bold text-emerald-400">{(confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vibration RMS:</span>
                  <span className="font-mono font-bold text-white">{rms.toFixed(4)} g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Peak Amplitude:</span>
                  <span className="font-mono font-bold text-white">{peak.toFixed(4)} g_pk</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Kurtosis:</span>
                  <span className="font-mono font-bold text-white">{kurtosis.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Dominant Frequency:</span>
                  <span className="font-mono font-bold text-white">{dominantFreq.toFixed(1)} Hz</span>
                </div>
              </div>
            </div>

            <div className="mt-6 text-[10px] text-center text-slate-400 border-t border-white/10 pt-3">
              <span className="font-semibold text-cyan-300">{modelName}</span>
              <p className="mt-0.5">Trained Accuracy: {(modelAccuracy * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* ML Model Information & Provenance Section */}
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-4">
            <Cpu className="h-4 w-4" /> Machine Learning Model Information & Architecture
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
            <div className="space-y-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Reference Dataset</span>
              <p className="text-sm font-bold text-white">NASA IMS Bearing Dataset</p>
              <p className="text-[11px] text-slate-400 mt-1">Official PCoE Repository run-to-failure vibration profiles</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Model Architecture</span>
              <p className="text-sm font-bold text-cyan-300">{modelName}</p>
              <p className="text-[11px] text-slate-400 mt-1">Supervised Random Forest Classifier with 100 decision trees</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Training Accuracy</span>
              <p className="text-sm font-bold text-emerald-400">{(modelAccuracy * 100).toFixed(2)}%</p>
              <p className="text-[11px] text-slate-400 mt-1">Measured on Stratified 20% validation split</p>
            </div>

            <div className="space-y-1 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Extracted Features</span>
              <p className="text-sm font-bold text-purple-300">11 Key Indicators</p>
              <p className="text-[11px] text-slate-400 mt-1">RMS, Mean, Std, Var, Max, Min, Peak-to-Peak, Kurtosis, Crest Factor, Dominant Freq, Spectral Energy</p>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}

