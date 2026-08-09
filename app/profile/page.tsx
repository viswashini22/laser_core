'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { UserCheck, Save, CheckCircle2, Shield } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>({
    machine_name: 'Industrial Electric Motor #04',
    machine_id: 'MOT-IND-8842',
    machine_type: '3-Phase Induction Motor (15kW)',
    sampling_rate: 16000,
    baseline_status: 'Active (Learned)',
    last_inspection: '2026-08-08',
    current_condition: 'NORMAL',
  });
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/api/machine/profile')
      .then((res) => res.json())
      .then((data) => setProfile(data))
      .catch(() => {});
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:8000/api/machine/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (res.ok) {
        setSavedMsg('Machine Profile updated successfully!');
      }
    } catch {
      setSavedMsg('Failed to save profile.');
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <UserCheck className="h-4 w-4" /> Asset Management
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Machine Profile</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure machine metadata, baseline state, and inspection parameters
          </p>
        </div>

        <div className="scada-panel p-6 max-w-2xl space-y-4">
          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Machine Name</label>
              <input
                type="text"
                value={profile.machine_name || ''}
                onChange={(e) => setProfile({ ...profile, machine_name: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Machine Asset ID</label>
              <input
                type="text"
                value={profile.machine_id || ''}
                onChange={(e) => setProfile({ ...profile, machine_id: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Machine Type</label>
              <input
                type="text"
                value={profile.machine_type || ''}
                onChange={(e) => setProfile({ ...profile, machine_type: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Sampling Rate (Hz)</label>
              <input
                type="number"
                value={profile.sampling_rate || 16000}
                onChange={(e) => setProfile({ ...profile, sampling_rate: Number(e.target.value) })}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Last Inspection Date</label>
              <input
                type="date"
                value={profile.last_inspection || ''}
                onChange={(e) => setProfile({ ...profile, last_inspection: e.target.value })}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> Save Machine Profile
            </button>

            {savedMsg && <p className="text-[11px] text-emerald-400 font-semibold mt-2">{savedMsg}</p>}
          </form>
        </div>
      </div>
    </LayoutShell>
  );
}
