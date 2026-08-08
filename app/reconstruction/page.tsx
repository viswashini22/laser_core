'use client';

import { LayoutShell } from '@/components/layout-shell';
import { AudioLines, Sparkles } from 'lucide-react';

export default function ReconstructionPage() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Speech Reconstruction</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Rebuild voice from signal fragments</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Reconstruct speech from degraded or partial audio while preserving speaker identity and cadence.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <AudioLines className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Current session</p>
                <p className="text-xl font-semibold text-white">Session 07</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Recovered audio fidelity: 92%</div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Speaker consistency: 89%</div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm">Reconstruction guidance</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Use the latest denoising model to improve temporal coherence and reduce artifacts in the final signal.</div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
