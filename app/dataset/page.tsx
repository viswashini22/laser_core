'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { CheckCircle2, Database, Upload, FileSpreadsheet, Plus, Tag } from 'lucide-react';

export default function DatasetPage() {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [machineType, setMachineType] = useState('3-Phase Induction Motor');
  const [label, setLabel] = useState('NORMAL');
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const fetchDatasets = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/dataset/status');
      if (res.ok) {
        const json = await res.json();
        setDatasets(json.datasets || []);
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setUploading(true);
    try {
      const res = await fetch('http://localhost:8000/api/dataset/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          machine_type: machineType,
          label,
          sample_count: 256,
        }),
      });

      if (res.ok) {
        setStatusMsg(`Dataset record "${name}" registered successfully.`);
        setName('');
        fetchDatasets();
      }
    } catch {
      setStatusMsg('Failed to register dataset record.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <Database className="h-4 w-4" /> Data Repository
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Dataset & Machine Baseline Manager</h1>
          <p className="text-xs text-slate-400 mt-1">
            Import, label, and register machine vibration datasets for ML anomaly model baseline training
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload & Label Form */}
          <div className="scada-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Plus className="h-4 w-4 text-cyan-400" /> Register / Import Dataset
            </h2>

            <form onSubmit={handleUpload} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Dataset Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Motor_Baseline_Run_01"
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Machine Type</label>
                <select
                  value={machineType}
                  onChange={(e) => setMachineType(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="3-Phase Induction Motor">3-Phase Induction Motor</option>
                  <option value="Centrifugal Pump">Centrifugal Pump</option>
                  <option value="Gearbox Assembly">Gearbox Assembly</option>
                  <option value="Air Compressor">Air Compressor</option>
                  <option value="CNC Spindle Motor">CNC Spindle Motor</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Vibration Label Category</label>
                <select
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="NORMAL">NORMAL (Healthy Baseline)</option>
                  <option value="UNBALANCE">UNBALANCE (1X Mass Disbalance)</option>
                  <option value="MISALIGNMENT">MISALIGNMENT (Coupling/Angular)</option>
                  <option value="LOOSENESS">LOOSENESS (Structural / Bolt)</option>
                  <option value="BEARING ANOMALY">BEARING ANOMALY (Inner/Outer Race)</option>
                  <option value="OTHER ANOMALY">OTHER ANOMALY</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center justify-center gap-2"
              >
                <Upload className="h-4 w-4" /> {uploading ? 'Processing...' : 'Register Dataset'}
              </button>

              {statusMsg && (
                <p className="text-[11px] text-emerald-400 text-center font-medium">{statusMsg}</p>
              )}
            </form>
          </div>

          {/* Registered Datasets List */}
          <div className="scada-panel p-6 lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Registered Dataset Records</h2>
              <span className="text-xs text-cyan-400 font-mono">Total Records: {datasets.length}</span>
            </div>

            {datasets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-slate-800 text-slate-500 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Machine Type</th>
                      <th className="py-2.5 px-3">Label</th>
                      <th className="py-2.5 px-3">Samples</th>
                      <th className="py-2.5 px-3">Sample Rate</th>
                      <th className="py-2.5 px-3">Uploaded At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {datasets.map((d) => (
                      <tr key={d.id} className="hover:bg-slate-900/40">
                        <td className="py-2.5 px-3 font-sans font-bold text-white">{d.name}</td>
                        <td className="py-2.5 px-3">{d.machine_type}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.label === 'NORMAL' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {d.label}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{d.sample_count}</td>
                        <td className="py-2.5 px-3">{d.sample_rate} Hz</td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400">{d.uploaded_at?.slice(0, 10)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-slate-500">
                No datasets registered yet. Use the form on the left to add a dataset.
              </div>
            )}
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
