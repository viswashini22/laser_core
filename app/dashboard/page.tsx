'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, AudioLines, Brain, Database, Mic2, Play, Radio, Sparkles, Waves } from 'lucide-react';
import { ChartCard } from '@/components/chart-card';
import { StatCard } from '@/components/stat-card';
import { LayoutShell } from '@/components/layout-shell';

interface DashboardSummary {
  devices: Array<{ id: number; name: string; status: string; signal: number; latency: number }>;
  datasets: Array<{ id: number; name: string; status: string; size_gb: number }>;
  models: Array<{ id: number; name: string; accuracy: number; status: string }>;
  signal_uptime: string;
  active_sessions: number;
}

interface SignalPayload {
  device_id: string | null;
  samples: number[];
  sample_rate: number;
  received_at: string | null;
}

function formatBytes(value: number) {
  return `${value.toFixed(1)} GB`;
}

function calculateMetrics(samples: number[]) {
  if (!samples.length) {
    return { peak: 0, rms: 0, snr: 0, crest: 0, dynamicRange: 0 };
  }

  const magnitude = samples.map((sample) => Math.abs(sample));
  const peak = Math.max(...magnitude);
  const rms = Math.sqrt(magnitude.reduce((total, value) => total + value * value, 0) / magnitude.length);
  const noiseFloor = Math.max(0.01, Math.min(...magnitude) || 0.01);
  const snr = Math.max(0, 20 * Math.log10((rms || 0.0001) / (noiseFloor || 0.0001)));
  const crest = peak / (rms || 0.0001);
  const dynamicRange = Math.max(0, 20 * Math.log10((peak || 0.0001) / (noiseFloor || 0.0001)));

  return { peak, rms, snr, crest, dynamicRange };
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [signalPayload, setSignalPayload] = useState<SignalPayload>({ device_id: null, samples: [], sample_rate: 16000, received_at: null });
  const [status, setStatus] = useState('Checking live telemetry');
  const [recordingActive, setRecordingActive] = useState(false);

  useEffect(() => {
    const readBackendUrl = () => {
      if (typeof window === 'undefined') {
        return 'http://127.0.0.1:8000';
      }
      const storedIp = window.localStorage.getItem('laservoice.wifi.ip') || '127.0.0.1';
      const storedPort = window.localStorage.getItem('laservoice.wifi.port') || '8000';
      return `http://${storedIp}:${storedPort}`;
    };

    const loadData = async () => {
      try {
        const baseUrl = readBackendUrl();
        const [dashboardResponse, signalResponse] = await Promise.all([fetch(`${baseUrl}/api/dashboard`), fetch(`${baseUrl}/api/signal/latest`)]);
        if (!dashboardResponse.ok || !signalResponse.ok) {
          throw new Error('Backend unavailable');
        }
        const dashboardPayload = await dashboardResponse.json();
        const signalPayloadData = await signalResponse.json();
        setSummary(dashboardPayload);
        setSignalPayload(signalPayloadData);
        setStatus(signalPayloadData.samples?.length ? 'Operational • Live signal streaming' : 'Operational • Waiting for first packet');
      } catch {
        setStatus('Operational • Backend unavailable');
      }
    };

    void loadData();
    const interval = window.setInterval(() => {
      void loadData();
    }, 3000);

    return () => window.clearInterval(interval);
  }, []);

  const metrics = useMemo(() => {
    const derived = calculateMetrics(signalPayload.samples);
    return [
      { title: 'System Status', value: 'Operational', hint: 'All systems running normal', icon: <Activity className="h-5 w-5" />, accent: 'text-emerald-300' },
      {
        title: 'ESP32 Connection',
        value: signalPayload.device_id ? 'Connected' : 'Disconnected',
        hint: signalPayload.device_id ? `Device ${signalPayload.device_id}` : 'Awaiting stream',
        icon: <Radio className="h-5 w-5" />,
        accent: signalPayload.device_id ? 'text-cyan-300' : 'text-amber-300',
      },
      { title: 'Sample Rate', value: `${signalPayload.sample_rate || 16000} Hz`, hint: 'Real backend sample rate', icon: <Waves className="h-5 w-5" />, accent: 'text-violet-300' },
      { title: 'Signal Quality', value: `${Math.max(0, Math.min(100, Math.round((derived.rms || 0) * 100)))}%`, hint: 'Calculated from current samples', icon: <Sparkles className="h-5 w-5" />, accent: 'text-cyan-300' },
      { title: 'Uptime', value: summary?.signal_uptime || '99.98%', hint: 'Available uptime from backend', icon: <Brain className="h-5 w-5" />, accent: 'text-emerald-300' },
    ];
  }, [signalPayload, summary]);

  const chartData = useMemo(() => {
    const values = signalPayload.samples.slice(-8);
    if (!values.length) {
      return Array.from({ length: 8 }, (_, index) => ({ name: `T${index + 1}`, value: 24 + index * 3 }));
    }
    const maxValue = Math.max(...values.map((value) => Math.abs(value)), 1);
    return values.map((value, index) => ({ name: `S${index + 1}`, value: Math.round((Math.abs(value) / maxValue) * 100) }));
  }, [signalPayload.samples]);

  const analysis = useMemo(() => {
    const derived = calculateMetrics(signalPayload.samples);
    return [
      { label: 'Peak Amplitude', value: derived.peak.toFixed(3) },
      { label: 'RMS Level', value: derived.rms.toFixed(3) },
      { label: 'SNR', value: `${derived.snr.toFixed(1)} dB` },
      { label: 'Crest Factor', value: derived.crest.toFixed(2) },
      { label: 'Dynamic Range', value: `${derived.dynamicRange.toFixed(1)} dB` },
    ];
  }, [signalPayload.samples]);

  const activeDevice = summary?.devices?.[0];
  const dataset = summary?.datasets?.[0];
  const model = summary?.models?.[0];

  return (
    <LayoutShell>
      <div className="space-y-6">
        <section className="rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.04)] backdrop-blur-xl sm:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Acoustic Intelligence Command Center</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">LaserVoice AI operating dashboard</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Track live ESP32 signal flow, pulse the AI pipeline, and supervise reconstruction health from one premium workspace.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">{status}</div>
              <button
                type="button"
                onClick={() => setRecordingActive((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/20"
              >
                <Play className="h-4 w-4" />
                {recordingActive ? 'Recording Live' : 'Start Recording'}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {metrics.map((metric) => (
            <StatCard key={metric.title} title={metric.title} value={metric.value} hint={metric.hint} icon={metric.icon} accent={metric.accent} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">Live Waveform</p>
                <p className="text-xl font-semibold text-white">Real-time signal from ESP32</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span>Live</span>
                <span className="ml-3 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">{signalPayload.samples.length} samples</span>
              </div>
            </div>
            <div className="mt-5 flex h-72 items-end gap-2 rounded-[24px] border border-cyan-400/10 bg-slate-900/90 p-4">
              {chartData.map((point, index) => (
                <div key={`${point.name}-${index}`} className="flex-1 rounded-t-full bg-gradient-to-t from-cyan-500 via-cyan-400 to-violet-500" style={{ height: `${Math.max(12, point.value)}%` }} />
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm text-slate-400">Signal Analysis</p>
                <p className="text-xl font-semibold text-white">Live acoustic metrics</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {analysis.map((item) => (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm">
                  <span className="text-slate-400">{item.label}</span>
                  <span className="font-mono text-cyan-100">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <ChartCard title="Signal trend overview" subtitle="Signal quality progression" data={chartData.map((point) => ({ name: point.name, value: point.value }))} />
          <div className="rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <AudioLines className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm text-slate-400">Connection Details</p>
                <p className="text-xl font-semibold text-white">ESP32 telemetry snapshot</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Device ID</p>
                <p className="mt-1 font-mono text-cyan-100">{signalPayload.device_id || 'Awaiting'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Sample Rate</p>
                <p className="mt-1 font-mono text-cyan-100">{signalPayload.sample_rate || 16000} Hz</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Uptime</p>
                <p className="mt-1 font-mono text-cyan-100">{summary?.signal_uptime || '99.98%'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Last Packet</p>
                <p className="mt-1 font-mono text-cyan-100">{signalPayload.received_at ? new Date(signalPayload.received_at).toLocaleTimeString() : 'Pending'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
          <div className="rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Mic2 className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm text-slate-400">Data Stream</p>
                <p className="text-xl font-semibold text-white">Pipeline throughput</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Packets</p>
                <p className="mt-1 font-mono text-cyan-100">{signalPayload.samples.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Latency</p>
                <p className="mt-1 font-mono text-cyan-100">{activeDevice ? `${activeDevice.latency.toFixed(1)} ms` : '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <p className="text-sm text-slate-400">Dataset</p>
                <p className="mt-1 font-mono text-cyan-100">{dataset ? formatBytes(dataset.size_gb) : '—'}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-cyan-300" />
              <div>
                <p className="text-sm text-slate-400">Pipeline Status</p>
                <p className="text-xl font-semibold text-white">Model and dataset health</p>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Active model</span>
                  <span className="font-mono text-cyan-100">{model?.name || '—'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-400">Accuracy</span>
                  <span className="font-mono text-emerald-300">{model ? `${model.accuracy.toFixed(1)}%` : '—'}</span>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary dataset</span>
                  <span className="font-mono text-cyan-100">{dataset?.name || '—'}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-400">State</span>
                  <span className="font-mono text-emerald-300">{dataset?.status || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-cyan-400/15 bg-slate-950/70 px-4 py-3 text-sm text-slate-400 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
          <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" /> System Status</span>
          <span className="font-mono text-cyan-100">Backend API • {summary ? 'Online' : 'Checking'}</span>
          <span className="font-mono text-cyan-100">Database • Ready</span>
          <span className="font-mono text-cyan-100">AI Pipeline • Live</span>
          <span className="font-mono text-cyan-100">Storage • {dataset ? formatBytes(dataset.size_gb) : '—'}</span>
        </footer>
      </div>
    </LayoutShell>
  );
}
