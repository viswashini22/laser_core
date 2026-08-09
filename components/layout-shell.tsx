'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Cpu,
  Database,
  FileSpreadsheet,
  History,
  Info,
  Layers,
  LineChart,
  Menu,
  Network,
  Radio,
  Sliders,
  Sparkles,
  Terminal,
  UserCheck,
  Waves,
  Wifi,
  X,
  Zap,
} from 'lucide-react';

const navGroups = [
  {
    title: 'MONITORING',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: BrainCircuit },
      { href: '/signal', label: 'Live Oscillation', icon: Waves },
      { href: '/spectrum', label: 'Frequency Spectrum', icon: BarChart3 },
    ],
  },
  {
    title: 'MACHINE',
    items: [
      { href: '/profile', label: 'Machine Profile', icon: UserCheck },
      { href: '/baseline', label: 'Baseline Manager', icon: Sliders },
      { href: '/history', label: 'Machine History', icon: History },
      { href: '/alerts', label: 'Alert System', icon: AlertTriangle },
    ],
  },
  {
    title: 'AI / ANALYSIS',
    items: [
      { href: '/analysis', label: 'Vibration Analysis', icon: LineChart },
      { href: '/dataset', label: 'Dataset Manager', icon: Database },
      { href: '/models', label: 'Anomaly Pipeline', icon: Cpu },
      { href: '/inference', label: 'Live Diagnostics', icon: Activity },
    ],
  },
  {
    title: 'DEVICE',
    items: [
      { href: '/device', label: 'ESP32 Connection', icon: Radio },
      { href: '/settings', label: 'Signal & Wi-Fi', icon: Network },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { href: '/logs', label: 'System Logs', icon: Terminal },
      { href: '/verification', label: 'Pipeline Test Page', icon: CheckCircle2 },
    ],
  },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [systemMode, setSystemMode] = useState<'REAL' | 'DEMO'>('REAL');
  const [espConnected, setEspConnected] = useState(false);
  const [backendOnline, setBackendOnline] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/device/status');
        if (res.ok) {
          const data = await res.json();
          setEspConnected(data.status === 'Connected');
          setSystemMode(data.system_mode || 'REAL');
          setBackendOnline(true);
        } else {
          setBackendOnline(false);
        }
      } catch {
        setBackendOnline(false);
      }
    };

    fetchStatus();
    const timer = setInterval(fetchStatus, 3000);
    return () => clearInterval(timer);
  }, []);

  const toggleMode = async () => {
    const nextMode = systemMode === 'REAL' ? 'DEMO' : 'REAL';
    try {
      await fetch('http://localhost:8000/api/mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: nextMode }),
      });
      setSystemMode(nextMode);
    } catch {
      // fallback
      setSystemMode(nextMode);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 font-sans">
      <div className="flex min-h-screen flex-col lg:flex-row">
        {/* Desktop Sidebar */}
        <aside className="hidden w-72 shrink-0 border-r border-slate-800/80 bg-[#0a0f1b] p-6 lg:flex lg:flex-col justify-between">
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 pb-6 border-b border-slate-800">
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-2.5 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
                <Zap className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xl font-bold tracking-tight text-white">LaserVibe</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">Non-Contact Vibration Monitor</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 font-medium">OPERATING MODE</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${systemMode === 'REAL' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'}`}>
                  {systemMode === 'REAL' ? 'REAL ESP32' : 'DEMO MODE'}
                </span>
              </div>
              <button
                onClick={toggleMode}
                className="w-full text-center text-xs py-1.5 px-3 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium"
              >
                Switch to {systemMode === 'REAL' ? 'DEMO MODE' : 'REAL ESP32'}
              </button>
            </div>

            {/* Navigation Menu */}
            <div className="mt-6 space-y-6">
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.25em] text-slate-500">{group.title}</p>
                  <nav className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href as any}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition ${
                            active
                              ? 'border border-cyan-500/40 bg-cyan-500/10 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                              : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                          }`}
                        >
                          <Icon className={`h-4 w-4 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </div>

          {/* System Status Footer */}
          <div className="pt-6 border-t border-slate-800/80 space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">ESP32 Telemetry</span>
              <span className={`flex items-center gap-1.5 font-semibold ${espConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                <span className={`h-2 w-2 rounded-full ${espConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                {espConnected ? 'Connected' : 'Offline'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Backend API</span>
              <span className={`flex items-center gap-1.5 font-semibold ${backendOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`h-2 w-2 rounded-full ${backendOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                {backendOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile Header & Container */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-slate-800 bg-[#0a0f1b]/90 px-4 py-3 backdrop-blur lg:hidden flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-cyan-400/40 bg-cyan-500/10 p-2">
                <Zap className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">LaserVibe</p>
                <p className="text-[9px] uppercase tracking-[0.2em] text-cyan-400">Machine Condition Monitoring</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen((prev) => !prev)}
              className="rounded-xl border border-slate-700 bg-slate-800 p-2 text-slate-200"
            >
              {mobileNavOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </header>

          {/* Mobile Drawer */}
          {mobileNavOpen && (
            <div className="border-b border-slate-800 bg-[#0a0f1b] p-4 lg:hidden space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
                <span className="text-slate-400">Mode: {systemMode}</span>
                <button
                  onClick={toggleMode}
                  className="px-3 py-1 rounded border border-slate-700 bg-slate-800 text-cyan-300"
                >
                  Switch Mode
                </button>
              </div>
              {navGroups.map((group) => (
                <div key={group.title}>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{group.title}</p>
                  <div className="space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = pathname === item.href;
                      return (
                        <Link
                          key={item.href + item.label}
                          href={item.href as any}
                          onClick={() => setMobileNavOpen(false)}
                          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium ${
                            active ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'
                          }`}
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
          )}

          {/* Main Content Area */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
