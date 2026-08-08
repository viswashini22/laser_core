'use client';

import { LayoutShell } from '@/components/layout-shell';
import { Mic2, Sparkles } from 'lucide-react';

export default function SttPage() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Speech to Text</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Convert spoken input into precise transcripts</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Capture live audio, transcribe with high confidence, and route the output into downstream workflows.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Mic2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Live transcript</p>
                <p className="text-xl font-semibold text-white">“The reconstruction pipeline is stable.”</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Confidence 97.1% • Speaker 02 • 1.8s latency</div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm">Transcript enhancer</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Case normalization and punctuation suggestions are now being applied automatically.</div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
