'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { CheckCircle2, RefreshCw, Sliders, Zap } from 'lucide-react';

export default function BaselinePage() {
  const [baselineInfo, setBaselineInfo] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [msg, setMsg] = useState('');

  const fetchBaseline = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/baseline');
      if (res.ok) {
        const json = await res.json();
        setBaselineInfo(json);
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchBaseline();
  }, []);

  const handleRecordBaseline = async () => {
    setIsRecording(true);
    setMsg('Capturing 10 seconds of normal machine vibration telemetry...');

    setTimeout(async () => {
      try {
        const res = await fetch('http://localhost:8000/api/baseline', { method: 'POST', body: JSON.stringify({}) });
        if (res.ok) {
          setMsg('Normal Machine Baseline saved successfully!');
          fetchBaseline();
        }
      } catch {
        setMsg('Failed to record baseline.');
      } finally {
        setIsRecording(false);
      }
    }, 2000);
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <Sliders className="h-4 w-4" /> Calibration Engine
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Machine Baseline Manager</h1>
          <p className="text-xs text-slate-400 mt-1">
            Record and establish normal machine operating baseline from actual optical vibration samples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="scada-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Record Normal Machine Baseline</h2>
            <p className="text-xs text-slate-400">
              Ensure the machine is operating under normal load conditions before starting baseline capture.
            </p>

            <button
              onClick={handleRecordBaseline}
              disabled={isRecording}
              className="py-3 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRecording ? 'animate-spin' : ''}`} />
              {isRecording ? 'Capturing Baseline...' : 'Record Normal Baseline Now'}
            </button>

            {msg && <p className="text-xs text-emerald-400 font-semibold">{msg}</p>}
          </div>

          <div className="scada-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Baseline Status</h2>
            <div className="text-xs space-y-2 font-mono">
              <p className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className={baselineInfo?.is_trained ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                  {baselineInfo?.is_trained ? 'Baseline Active' : 'Not Recorded'}
                </span>
              </p>
              {baselineInfo?.baseline_mean && (
                <div className="mt-4 pt-3 border-t border-slate-800 space-y-1">
                  <p className="text-slate-300 font-bold font-sans">Learned Feature Means:</p>
                  {Object.entries(baselineInfo.baseline_mean).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex justify-between text-slate-400">
                      <span>{k}:</span>
                      <span className="text-white">{Number(v).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
