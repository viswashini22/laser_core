'use client';

import { LayoutShell } from '@/components/layout-shell';
import { Settings, ShieldCheck, Sparkles } from 'lucide-react';

export default function SettingsPage() {
  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Settings</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Tune the platform for reliable operation</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Adjust runtime preferences, data policies, and security controls for the voice AI environment.</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Preferences</p>
                <p className="text-xl font-semibold text-white">Adaptive processing</p>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Latency mode: balanced • Auto-reconnect: enabled • Auto-sync: ON</div>
          </div>

          <div className="glass rounded-3xl p-6">
            <div className="flex items-center gap-2 text-cyan-200">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm">Security posture</span>
            </div>
            <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Encrypted storage, rotation policies, and multi-factor device access are configured for production use.</div>
            <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">Last audit: 2 hours ago <span className="ml-2 text-cyan-200"><Sparkles className="mr-1 inline h-4 w-4" /> Healthy</span></div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
