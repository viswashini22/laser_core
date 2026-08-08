'use client';

import { useEffect, useMemo, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Activity, Waves } from 'lucide-react';

interface SignalPayload {
  device_id: string | null;
  samples: number[];
  sample_rate: number;
  received_at: string | null;
}

export default function SignalPage() {
  const [signalPayload, setSignalPayload] = useState<SignalPayload>({
    device_id: null,
    samples: [],
    sample_rate: 16000,
    received_at: null,
  });
  const [status, setStatus] = useState('Waiting for ESP32 Wi-Fi stream');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const readBackendUrl = () => {
      if (typeof window === 'undefined') {
        return 'http://127.0.0.1:8000';
      }
      const storedIp = window.localStorage.getItem('laservoice.wifi.ip') || '127.0.0.1';
      const storedPort = window.localStorage.getItem('laservoice.wifi.port') || '8000';
      return `http://${storedIp}:${storedPort}`;
    };

    const loadSignal = async () => {
      try {
        const baseUrl = readBackendUrl();
        const response = await fetch(`${baseUrl}/api/signal/latest`);
        if (!response.ok) {
          throw new Error('Backend unavailable');
        }
        const payload = await response.json();
        if (!isMounted) {
          return;
        }
        setSignalPayload(payload);
        setStatus(payload.samples?.length ? 'Live ESP32 signal data received' : 'Waiting for ESP32 Wi-Fi stream');
        setErrorMessage(null);
      } catch {
        if (isMounted) {
          setStatus('Backend unavailable');
          setErrorMessage('Connect the backend and enter the laptop IP in the device page to view live Wi-Fi signal data.');
        }
      }
    };

    void loadSignal();
    const interval = window.setInterval(() => {
      void loadSignal();
    }, 2000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const channels = useMemo(() => {
    const values = signalPayload.samples.slice(-12);
    if (values.length === 0) {
      return [
        { label: 'Channel A', value: '92%', tone: 'text-cyan-300' },
        { label: 'Channel B', value: '87%', tone: 'text-violet-300' },
        { label: 'Channel C', value: '90%', tone: 'text-emerald-300' },
      ];
    }

    const maxValue = Math.max(...values.map((value) => Math.abs(value)), 1);
    return [
      {
        label: 'Signal RMS',
        value: `${Math.round((Math.max(...values) / maxValue) * 100)}%`,
        tone: 'text-cyan-300',
      },
      {
        label: 'Amplitude',
        value: `${Math.round((Math.abs(values[values.length - 1]) / maxValue) * 100)}%`,
        tone: 'text-violet-300',
      },
      {
        label: 'Samples',
        value: `${values.length}`,
        tone: 'text-emerald-300',
      },
    ];
  }, [signalPayload.samples]);

  const waveformBars = useMemo(() => {
    const values = signalPayload.samples.slice(-12);
    if (values.length === 0) {
      return [38, 54, 46, 73, 68, 82, 62, 90, 76, 84, 58, 96];
    }
    const maxValue = Math.max(...values.map((value) => Math.abs(value)), 1);
    return values.map((value) => Math.max(12, Math.round((Math.abs(value) / maxValue) * 100)));
  }, [signalPayload.samples]);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Signal Visualizer</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Inspect acoustic signal integrity</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Render spectral quality in real time and monitor channel stability for reconstruction workflows.</p>
          <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
            <p className="font-medium text-white">Status: {status}</p>
            {signalPayload.device_id ? <p className="mt-2 text-cyan-200">Device: {signalPayload.device_id}</p> : null}
            {errorMessage ? <p className="mt-2 text-amber-300">{errorMessage}</p> : null}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <Waves className="h-5 w-5" />
              <span className="text-sm">Live waveform envelope</span>
            </div>
            <div className="mt-6 flex h-72 items-end gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-6">
              {waveformBars.map((height, index) => (
                <div key={index} className="flex-1 rounded-t-full bg-gradient-to-t from-cyan-500 to-violet-400" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {channels.map((channel) => (
              <div key={channel.label} className="glass rounded-3xl p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-cyan-200" />
                    <span className="text-sm text-slate-400">{channel.label}</span>
                  </div>
                  <span className={`text-lg font-semibold ${channel.tone}`}>{channel.value}</span>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-800">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: channel.value }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
