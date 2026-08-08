'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Activity, AudioLines, BrainCircuit, Cpu, Database, Info, Menu, Mic2, Network, Radio, Settings, Sparkles, Waves, X } from 'lucide-react';

const navGroups = [
  {
    title: 'MAIN',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: BrainCircuit },
      { href: '/signal', label: 'Live Signal', icon: Waves },
      { href: '/bluetooth', label: 'Device Manager', icon: Radio },
      { href: '/settings', label: 'Wi-Fi Settings', icon: Network },
    ],
  },
  {
    title: 'AI PIPELINE',
    items: [
      { href: '/models', label: 'AI Models', icon: Cpu },
      { href: '/dataset', label: 'Dataset Manager', icon: Database },
      { href: '/training', label: 'Training', icon: Cpu },
      { href: '/inference', label: 'Inference', icon: Mic2 },
      { href: '/dashboard', label: 'Results', icon: Activity },
    ],
  },
  {
    title: 'TOOLS',
    items: [
      { href: '/reconstruction', label: 'Speech Reconstruction', icon: AudioLines },
      { href: '/stt', label: 'Speech to Text', icon: Mic2 },
      { href: '/dashboard', label: 'Export & Reports', icon: Database },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { href: '/settings', label: 'Settings', icon: Settings },
      { href: '/dashboard', label: 'Logs', icon: Activity },
      { href: '/dashboard', label: 'About', icon: Info },
    ],
  },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent text-slate-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="hidden w-72 shrink-0 border-r border-cyan-400/15 bg-slate-950/85 p-6 lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-2.5">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-lg font-semibold text-white">LaserVoice AI</p>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Acoustic Intelligence Platform</p>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {navGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{group.title}</p>
                <nav className="space-y-1.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = pathname === item.href;
                    return (
                      <Link
                        key={item.href + item.label}
                        href={item.href}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition ${active ? 'border border-cyan-400/20 bg-cyan-500/10 text-cyan-100' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-cyan-400/10 bg-slate-950/70 px-4 py-3 backdrop-blur lg:hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-2">
                  <Sparkles className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">LaserVoice AI</p>
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">Acoustic Intelligence Platform</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-2 text-cyan-100"
              >
                {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </div>
            {mobileNavOpen ? (
              <div className="mt-4 space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{group.title}</p>
                    <div className="space-y-1.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = pathname === item.href;
                        return (
                          <Link
                            key={item.href + item.label}
                            href={item.href}
                            onClick={() => setMobileNavOpen(false)}
                            className={`flex items-center gap-3 rounded-2xl px-3 py-2 text-sm ${active ? 'bg-cyan-500/10 text-cyan-100' : 'text-slate-300'}`}
                          >
                            <Icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
