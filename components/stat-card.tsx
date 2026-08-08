import { ReactNode } from 'react';

export function StatCard({ title, value, hint, icon, accent = 'text-cyan-300' }: { title: string; value: string; hint: string; icon: ReactNode; accent?: string }) {
  return (
    <div className="rounded-[24px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-slate-400">{title}</p>
          <p className={`mt-2 text-2xl font-semibold ${accent}`}>{value}</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">{icon}</div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{hint}</p>
    </div>
  );
}
