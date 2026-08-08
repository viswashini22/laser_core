'use client';

import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

interface ChartCardProps {
  title: string;
  subtitle: string;
  data: Array<{ name: string; value: number }>;
  accent?: string;
}

export function ChartCard({ title, subtitle, data, accent = '#4cc9f0' }: ChartCardProps) {
  return (
    <div className="rounded-[24px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-400">{subtitle}</p>
          <p className="text-xl font-semibold text-white">{title}</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="accentFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.45} />
                <stop offset="100%" stopColor={accent} stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tickLine={false} axisLine={false} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke={accent} strokeWidth={3} fill="url(#accentFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
