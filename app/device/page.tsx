'use client';

import { useEffect, useState } from 'react';
import { LayoutShell } from '@/components/layout-shell';
import { ArrowRight, Cpu, Radio, RefreshCw, ShieldCheck, Wifi, WifiOff, Zap } from 'lucide-react';

export default function DeviceConnectionPage() {
  const [backendIp, setBackendIp] = useState('192.168.1.105');
  const [backendPort, setBackendPort] = useState(8000);
  const [deviceId, setDeviceId] = useState('ESP32-LASER-01');
  const [deviceStatus, setDeviceStatus] = useState<any>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [testing, setTesting] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/device/status');
      if (res.ok) {
        const json = await res.json();
        setDeviceStatus(json);
      }
    } catch {
      // quiet
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  const handleTestBackend = async () => {
    setTesting(true);
    setStatusMsg('Testing connection to FastAPI backend...');
    try {
      const res = await fetch('http://localhost:8000/api/wifi/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: backendIp, port: backendPort, device_id: deviceId }),
      });
      if (res.ok) {
        const json = await res.json();
        setStatusMsg(`Backend reachable at ${backendIp}:${backendPort}. ${json.message}`);
      } else {
        setStatusMsg('Backend test failed.');
      }
    } catch {
      setStatusMsg('Unable to reach FastAPI server.');
    } finally {
      setTesting(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/device/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, backend_ip: backendIp, backend_port: backendPort }),
      });
      if (res.ok) {
        setStatusMsg(`Device ${deviceId} registered.`);
        fetchStatus();
      }
    } catch {
      setStatusMsg('Failed to connect device.');
    }
  };

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="scada-panel p-6">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-widest">
            <Radio className="h-4 w-4" /> Hardware Telemetry Link
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Device Connection (ESP32 Wi-Fi)</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure laptop LAN IP, port, and ESP32 optical vibration telemetry parameters
          </p>
        </div>

        {/* System Architecture Flow Diagram */}
        <div className="scada-panel p-6">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Correct Communication Architecture</h2>
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold">
                ESP32 Laser Sensor
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold">
                Wi-Fi Network (LAN)
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold">
                FastAPI Backend (:8000)
              </div>
              <ArrowRight className="h-4 w-4 text-slate-500" />
            </div>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold">
                Next.js SCADA Dashboard
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Config Controls */}
          <div className="scada-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Connection Configuration</h2>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Backend IP Address (Laptop LAN IP)</label>
                <input
                  type="text"
                  value={backendIp}
                  onChange={(e) => setBackendIp(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Backend Port</label>
                <input
                  type="number"
                  value={backendPort}
                  onChange={(e) => setBackendPort(Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">ESP32 Device ID</label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-white font-mono"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={handleTestBackend}
                  disabled={testing}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs transition"
                >
                  [ Test Backend ]
                </button>
                <button
                  onClick={handleConnect}
                  className="py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition"
                >
                  [ Connect Device ]
                </button>
                <button
                  onClick={() => setDeviceStatus({ ...deviceStatus, status: 'Disconnected' })}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition"
                >
                  [ Disconnect ]
                </button>
                <button
                  onClick={fetchStatus}
                  className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs transition flex items-center justify-center gap-1"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>

              {statusMsg && <p className="text-[11px] text-cyan-300 text-center font-medium">{statusMsg}</p>}
            </div>
          </div>

          {/* Telemetry Status Readout */}
          <div className="scada-panel p-6 space-y-4">
            <h2 className="text-base font-bold text-white">Live Telemetry Status</h2>

            <div className="space-y-3 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Wi-Fi Status:</span>
                <span className={`font-bold ${deviceStatus?.status === 'Connected' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {deviceStatus?.status || 'Disconnected'}
                </span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">ESP32 IP:</span>
                <span className="text-white">{deviceStatus?.ip_address || '192.168.1.105'}</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Signal Strength (RSSI):</span>
                <span className="text-cyan-300">{deviceStatus?.rssi || -62} dBm</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Sampling Rate:</span>
                <span className="text-white">{deviceStatus?.sample_rate || 16000} Hz</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Packets/sec:</span>
                <span className="text-white">{deviceStatus?.packets_per_sec || 10} p/s</span>
              </div>

              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-sans">Connection Latency:</span>
                <span className="text-cyan-300">{deviceStatus?.connection_latency_ms || 14} ms</span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-400 font-sans">Total Packets Received:</span>
                <span className="text-white">{deviceStatus?.total_packets || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
