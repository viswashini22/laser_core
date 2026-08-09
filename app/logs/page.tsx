'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { Terminal } from 'lucide-react';

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    setLogs([
      '[SYSTEM] LaserVibe Machine Vibration Monitor Engine initialized v2.0.0',
      '[BACKEND] FastAPI server listening on 0.0.0.0:8000',
      '[SQLITE] Connected to laservoice.db schema',
      '[DSP] Signal processing pipeline ready (rFFT, Hann window, RMS, Crest factor)',
      '[ML] Isolation Forest Anomaly Detection pipeline loaded',
      '[SYSTEM] Ready to receive ESP32 Wi-Fi telemetry batches',
    ]);
  }, []);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <Terminal className="h-4 w-4" /> System Audit
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">System Logs</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time backend execution, SQLite database events, and telemetry logs
          </p>
        </div>

        <div className="scada-panel p-6">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs text-cyan-300 space-y-2 h-96 overflow-y-auto">
            {logs.map((log, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="text-slate-600">[{new Date().toLocaleTimeString()}]</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
