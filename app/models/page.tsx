'use client';

import { LayoutShell } from '@/components/layout-shell';
import { Cpu, Sparkles } from 'lucide-react';

const models = [
  { name: 'LaserCore Pro', accuracy: '97.2%', status: 'Deploying' },
  { name: 'Spectra TTS', accuracy: '94.8%', status: 'Stable' },
  { name: 'Echo ASR', accuracy: '95.9%', status: 'Training' },
];

export default function ModelsPage() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">AI Models</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Manage advanced model lifecycles</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Track deployment readiness, quality metrics, and training progress for your voice intelligence stack.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {models.map((model) => (
            <div key={model.name} className="glass rounded-3xl p-5">
              <div className="flex items-center justify-between">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                  <Cpu className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{model.status}</span>
              </div>
              <h2 className="mt-4 text-xl font-semibold text-white">{model.name}</h2>
              <p className="mt-2 text-sm text-slate-400">Accuracy: {model.accuracy}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Optimized for low-latency, high-fidelity reconstruction and transcription.</div>
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl p-6">
          <div className="flex items-center gap-2 text-cyan-200">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm">Model recommendation engine</span>
          </div>
          <p className="mt-3 max-w-2xl text-slate-400">The system suggests the next model upgrade based on signal quality, transcription confidence, and dataset freshness.</p>
        </div>
      </div>
    </LayoutShell>
  );
}
