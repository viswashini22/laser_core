'use client';

import { LayoutShell } from '@/components/layout-shell';
import { Database, FolderOpen, Play, Sparkles } from 'lucide-react';

const datasets = [
  { name: 'Voice Corpus 01', status: 'Ready', size: '420 GB' },
  { name: 'Speaker Profiles', status: 'Syncing', size: '84 GB' },
  { name: 'Noise Profiles', status: 'Validated', size: '34 GB' },
];

export default function DatasetPage() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Dataset Manager</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Curate and validate high-fidelity voice data</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Manage corpus versions, speaker labels, and quality gates while preserving a continuous training loop.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Corpus inventory</p>
                <p className="text-xl font-semibold text-white">3 active datasets</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {datasets.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div>
                    <p className="font-medium text-white">{item.name}</p>
                    <p className="text-sm text-slate-400">{item.status}</p>
                  </div>
                  <p className="text-sm text-cyan-200">{item.size}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Data health</p>
                <p className="text-xl font-semibold text-white">Clean ingestion pipeline</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200"><Sparkles className="h-4 w-4" /> Quality score 96.4%</div>
              <div className="mt-3 flex items-center gap-2 text-slate-300"><Play className="h-4 w-4" /> Last validation completed 6 mins ago</div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
