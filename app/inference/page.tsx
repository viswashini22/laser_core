'use client';

import { LayoutShell } from '@/components/layout-shell';
import { Mic2, Sparkles } from 'lucide-react';

export default function InferencePage() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Inference</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Run live voice inference pipelines</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Submit audio, inspect output confidence, and observe reconstruction quality in near real time.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Mic2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Inference run</p>
                <p className="text-xl font-semibold text-white">Audio sample 24</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Confidence score: 93.7%</div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Naturalness score: 91.2%</div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm">Streaming output</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Low-latency synthesis is active and ready to deliver finalized speech frames.</div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
