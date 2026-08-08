'use client';

import { useEffect, useMemo, useState } from 'react';
import { Activity, BarChart3, Cpu, Flame, PlayCircle, Save, TimerReset, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import { LayoutShell } from '@/components/layout-shell';

const labels = ['Clean', 'Noise', 'Speech', 'Reconstructed'];
const initialMatrix = [
  [84, 6, 3, 2],
  [5, 81, 7, 4],
  [2, 4, 86, 5],
  [1, 3, 5, 90],
];

export default function TrainingPage() {
  const [dataset, setDataset] = useState('laser-vibration-2026');
  const [epochs, setEpochs] = useState(20);
  const [learningRate, setLearningRate] = useState(0.001);
  const [batchSize, setBatchSize] = useState(32);
  const [optimizer, setOptimizer] = useState('AdamW');
  const [scheduler, setScheduler] = useState('Cosine');
  const [isTraining, setIsTraining] = useState(false);
  const [currentEpoch, setCurrentEpoch] = useState(1);
  const [loss, setLoss] = useState(1.42);
  const [accuracy, setAccuracy] = useState(0.81);
  const [validation, setValidation] = useState(0.77);
  const [gpuUtilization, setGpuUtilization] = useState(78);
  const [etaMinutes, setEtaMinutes] = useState(14);
  const [checkpointEvery, setCheckpointEvery] = useState(5);
  const [checkpointEnabled, setCheckpointEnabled] = useState(true);
  const [tensorBoardEnabled, setTensorBoardEnabled] = useState(true);
  const [history, setHistory] = useState([{ epoch: 1, loss: 1.42, accuracy: 0.81, validation: 0.77 }]);

  useEffect(() => {
    if (!isTraining) return;

    const interval = window.setInterval(() => {
      setCurrentEpoch((prev) => (prev >= epochs ? epochs : prev + 1));
      setLoss((prev) => Math.max(0.16, Number((prev - 0.05).toFixed(3))));
      setAccuracy((prev) => Math.min(0.98, Number((prev + 0.008).toFixed(3))));
      setValidation((prev) => Math.min(0.95, Number((prev + 0.006).toFixed(3))));
      setGpuUtilization((prev) => Math.max(54, Math.min(96, prev + 2)));
      setEtaMinutes((prev) => Math.max(2, prev - 1));
      setHistory((prev) => {
        const nextEpoch = prev.length + 1;
        return [
          ...prev,
          {
            epoch: nextEpoch,
            loss: Number(Math.max(0.16, 1.42 - nextEpoch * 0.05).toFixed(3)),
            accuracy: Number(Math.min(0.98, 0.81 + nextEpoch * 0.008).toFixed(3)),
            validation: Number(Math.min(0.95, 0.77 + nextEpoch * 0.006).toFixed(3)),
          },
        ];
      });
    }, 900);

    return () => window.clearInterval(interval);
  }, [epochs, isTraining]);

  const progressPercent = useMemo(() => Math.min(100, Math.round((currentEpoch / epochs) * 100)), [currentEpoch, epochs]);

  const checkpointStatus = useMemo(() => (checkpointEnabled ? `Auto-save every ${checkpointEvery} epochs` : 'Checkpoint saving disabled'), [checkpointEvery, checkpointEnabled]);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Training</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">AI training command center</h1>
          <p className="mt-3 max-w-2xl text-slate-400">Tune your LaserVoice training run, monitor loss and accuracy in real time, and track checkpoints and TensorBoard logs from one place.</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Training configuration</p>
                <p className="text-xl font-semibold text-white">Launch a new run</p>
              </div>
              <button onClick={() => setIsTraining((prev) => !prev)} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300">
                <PlayCircle className="h-4 w-4" /> {isTraining ? 'Pause run' : 'Start training'}
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-sm text-slate-300">
                <span className="mb-2 block">Dataset</span>
                <select value={dataset} onChange={(event) => setDataset(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white">
                  <option value="laser-vibration-2026">Laser vibration 2026</option>
                  <option value="noise-corpus-2026">Noise corpus 2026</option>
                  <option value="speaker-adaptation">Speaker adaptation</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-2 block">Epochs</span>
                <input type="number" value={epochs} onChange={(event) => setEpochs(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-2 block">Learning rate</span>
                <input type="number" step="0.0001" value={learningRate} onChange={(event) => setLearningRate(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-2 block">Batch size</span>
                <input type="number" value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-2 block">Optimizer</span>
                <select value={optimizer} onChange={(event) => setOptimizer(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white">
                  <option value="AdamW">AdamW</option>
                  <option value="SGD">SGD</option>
                  <option value="Adam">Adam</option>
                </select>
              </label>

              <label className="text-sm text-slate-300">
                <span className="mb-2 block">Scheduler</span>
                <select value={scheduler} onChange={(event) => setScheduler(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white">
                  <option value="Cosine">Cosine</option>
                  <option value="Step">Step</option>
                  <option value="ReduceLROnPlateau">ReduceLROnPlateau</option>
                </select>
              </label>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200">
                <Save className="h-4 w-4" />
                <p className="font-medium">Checkpoint saving</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={checkpointEnabled} onChange={() => setCheckpointEnabled((prev) => !prev)} className="h-4 w-4 rounded border-white/20 bg-slate-900" />
                  Enable auto-save
                </label>
                <input type="number" value={checkpointEvery} onChange={(event) => setCheckpointEvery(Number(event.target.value))} className="w-24 rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white" />
                <span className="text-cyan-200">{checkpointStatus}</span>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-200">
                <Activity className="h-4 w-4" />
                <p className="font-medium">TensorBoard integration</p>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <span>Log dir: /tmp/laservoice-runs/{dataset}</span>
                <label className="flex items-center gap-2 text-sm text-slate-300">
                  <input type="checkbox" checked={tensorBoardEnabled} onChange={() => setTensorBoardEnabled((prev) => !prev)} className="h-4 w-4 rounded border-white/20 bg-slate-900" />
                  Live monitoring
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="glass rounded-3xl p-5">
                <p className="text-sm text-slate-400">Loss</p>
                <p className="mt-2 text-3xl font-semibold text-cyan-300">{loss.toFixed(3)}</p>
              </div>
              <div className="glass rounded-3xl p-5">
                <p className="text-sm text-slate-400">Accuracy</p>
                <p className="mt-2 text-3xl font-semibold text-emerald-300">{(accuracy * 100).toFixed(1)}%</p>
              </div>
              <div className="glass rounded-3xl p-5">
                <p className="text-sm text-slate-400">Validation</p>
                <p className="mt-2 text-3xl font-semibold text-violet-300">{(validation * 100).toFixed(1)}%</p>
              </div>
              <div className="glass rounded-3xl p-5">
                <p className="text-sm text-slate-400">GPU util</p>
                <p className="mt-2 text-3xl font-semibold text-amber-300">{gpuUtilization}%</p>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Training progress</p>
                  <p className="text-xl font-semibold text-white">Epoch {currentEpoch}/{epochs}</p>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">{progressPercent}%</div>
              </div>
              <div className="mt-4 h-3 rounded-full bg-slate-800">
                <div className="h-3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-400" style={{ width: `${progressPercent}%` }} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center gap-2 text-cyan-200"><TimerReset className="h-4 w-4" /> ETA</div>
                  <p className="mt-2 text-2xl font-semibold text-white">{etaMinutes} min</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center gap-2 text-cyan-200"><Cpu className="h-4 w-4" /> Optimizer</div>
                  <p className="mt-2 text-2xl font-semibold text-white">{optimizer}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center gap-2 text-cyan-200"><Flame className="h-4 w-4" /> Scheduler</div>
                  <p className="mt-2 text-2xl font-semibold text-white">{scheduler}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="glass rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-2 text-cyan-200">
                  <TrendingUp className="h-5 w-5" />
                  <span className="text-sm">Training curve</span>
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="epoch" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Line type="monotone" dataKey="loss" stroke="#22d3ee" strokeWidth={2} />
                      <Line type="monotone" dataKey="accuracy" stroke="#34d399" strokeWidth={2} />
                      <Line type="monotone" dataKey="validation" stroke="#a78bfa" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <div className="mb-4 flex items-center gap-2 text-cyan-200">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-sm">Confusion matrix</span>
                </div>
                <div className="space-y-2">
                  {initialMatrix.map((row, rowIndex) => (
                    <div key={labels[rowIndex]} className="grid grid-cols-4 gap-2">
                      {row.map((value, colIndex) => (
                        <div key={`${labels[rowIndex]}-${labels[colIndex]}`} className="rounded-xl border border-cyan-400/20 bg-slate-950/50 p-2 text-center text-sm text-slate-200">
                          {value}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                  {labels.map((label) => <span key={label} className="rounded-full border border-white/10 px-2 py-1">{label}</span>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
