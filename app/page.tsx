'use client';

import Link from 'next/link';
import { ArrowRight, BrainCircuit, Radio, Sparkles, Waves } from 'lucide-react';
import { motion } from 'framer-motion';

const metrics = [
  { label: 'Voice Models', value: '18' },
  { label: 'Signal Uptime', value: '99.98%' },
  { label: 'Live Sessions', value: '326' },
];

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-8 text-slate-100 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="glass flex items-center justify-between rounded-full px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-cyan-400/40 bg-cyan-400/20 p-2">
              <Sparkles className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <p className="text-lg font-semibold">LaserVoice AI</p>
              <p className="text-xs text-slate-400">Voice intelligence platform</p>
            </div>
          </div>
          <Link href="/dashboard" className="rounded-full border border-cyan-400/30 bg-cyan-500/15 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/25">
            Open Console
          </Link>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} className="glass rounded-[2rem] p-8 lg:p-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">
              <BrainCircuit className="h-4 w-4" />
              Next-generation speech intelligence
            </div>
            <h1 className="mt-6 text-4xl font-semibold leading-tight sm:text-6xl">
              Build, train, and listen with <span className="text-cyan-300">laser-precise AI voice systems</span>.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Orchestrate Bluetooth telemetry, signal reconstruction, speech-to-text, and model training from a single futuristic control plane.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300">
                Launch dashboard <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/bluetooth" className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 font-medium text-slate-100 transition hover:bg-white/10">
                <Radio className="h-4 w-4" /> Connect device
              </Link>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, delay: 0.08 }} className="glass rounded-[2rem] p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Live system state</p>
                <p className="text-3xl font-semibold text-cyan-300">+24.8%</p>
              </div>
              <div className="rounded-full border border-cyan-400/30 bg-cyan-500/10 p-3">
                <Waves className="h-6 w-6 text-cyan-200" />
              </div>
            </div>
            <div className="mt-8 space-y-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="text-2xl font-semibold">{item.value}</div>
                  <div className="text-sm text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>
      </div>
    </main>
  );
}
