'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BluetoothSearching, Database, Mic2, Play, Radio, Save, ShieldCheck, Upload, Wifi, WifiOff, Zap } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar, AreaChart, Area } from 'recharts';
import { LayoutShell } from '@/components/layout-shell';

const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';
const DEFAULT_SAMPLE_RATE = 16000;

interface ParsedPacket {
  sequence: number;
  bytesReceived: number;
  payloadLength: number;
  checksumOk: boolean;
  latencyMs: number;
  sampleCount: number;
  sampleRateHz: number;
  payloadHex: string;
  receivedAt: number;
  samples: number[];
}

interface DeviceSummary {
  id: string;
  name: string;
  connected: boolean;
}

interface PacketRecord {
  sequence: number;
  bytesReceived: number;
  payloadLength: number;
  checksumOk: boolean;
  latencyMs: number;
  sampleCount: number;
  sampleRateHz: number;
  payloadHex: string;
  receivedAt: number;
  samples: number[];
}

interface AnalyticsPayload {
  oscilloscopeData: Array<{ index: number; value: number }>;
  fftData: Array<{ bin: number; magnitude: number }>;
  spectrogramData: Array<{ band: string; intensity: number }>;
  frequencyResponseData: Array<{ freq: number; response: number }>;
  amplitude: number;
  noiseLevel: number;
  signalRms: number;
  peakDetection: number;
  samplingRate: number;
  signalQuality: number;
}

class PacketStore {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open('laservoice-ble', 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('packets')) {
          db.createObjectStore('packets', { keyPath: 'id', autoIncrement: true });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async add(packet: PacketRecord) {
    const db = await this.dbPromise;
    const tx = db.transaction('packets', 'readwrite');
    tx.objectStore('packets').add(packet);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async count() {
    const db = await this.dbPromise;
    const tx = db.transaction('packets', 'readonly');
    return new Promise<number>((resolve, reject) => {
      const request = tx.objectStore('packets').count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

function parsePacket(bytes: Uint8Array, receivedAt: number, previousSequence: number | null, sampleRateHz = DEFAULT_SAMPLE_RATE): ParsedPacket | null {
  if (bytes.length < 8) {
    return null;
  }

  const header = (bytes[0] << 8) | bytes[1];
  if (header !== 0x55aa && header !== 0xaa55) {
    return null;
  }

  const payloadLength = bytes[2];
  const sequence = bytes[3];
  const payloadStart = 4;
  const checksumIndex = bytes.length - 1;

  if (bytes.length < payloadStart + payloadLength + 1) {
    return null;
  }

  const payload = bytes.slice(payloadStart, payloadStart + payloadLength);
  const checksum = bytes[checksumIndex];
  let sum = 0;
  for (let index = 0; index < bytes.length - 1; index += 1) {
    sum = (sum + bytes[index]) & 0xff;
  }
  const checksumOk = checksum === (sum & 0xff);

  const samples: number[] = [];
  for (let index = 0; index + 1 < payload.length; index += 2) {
    const raw = ((payload[index + 1] << 8) | payload[index]) & 0xffff;
    const normalized = (raw - 32768) / 32768;
    samples.push(normalized);
  }

  return {
    sequence,
    bytesReceived: bytes.length,
    payloadLength,
    checksumOk,
    latencyMs: Math.max(0, Math.round((receivedAt - (payload[0] ? payload[0] * 10 : receivedAt)) / 1000)),
    sampleCount: samples.length,
    sampleRateHz,
    payloadHex: Array.from(payload).map((value) => value.toString(16).padStart(2, '0')).join(''),
    receivedAt,
    samples,
  };
}

function StatusBadge({ online, label }: { online: boolean; label: string }) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm ${online ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-amber-400/30 bg-amber-500/10 text-amber-100'}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${online ? 'bg-cyan-300' : 'bg-amber-300'}`} />
      {label}
    </div>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="glass rounded-3xl p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function buildWavBlobFromAudioBuffer(audioBuffer: AudioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numChannels;
  const data = new Uint8Array(length * 2);
  const view = new DataView(data.buffer);
  let offset = 0;

  for (let index = 0; index < audioBuffer.length; index += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[index]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  const wavBuffer = new ArrayBuffer(44 + data.byteLength);
  const wavView = new DataView(wavBuffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      wavView.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  wavView.setUint32(4, 36 + data.byteLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  wavView.setUint32(16, 16, true);
  wavView.setUint16(20, 1, true);
  wavView.setUint16(22, numChannels, true);
  wavView.setUint32(24, audioBuffer.sampleRate, true);
  wavView.setUint32(28, audioBuffer.sampleRate * numChannels * 2, true);
  wavView.setUint16(32, numChannels * 2, true);
  wavView.setUint16(34, 16, true);
  writeString(36, 'data');
  wavView.setUint32(40, data.byteLength, true);
  for (let index = 0; index < data.byteLength; index += 1) {
    wavView.setUint8(44 + index, data[index]);
  }

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function createSilentWavBlob(sampleRate = 16000, durationSeconds = 1) {
  const length = Math.max(1, Math.floor(sampleRate * durationSeconds));
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  return new Blob([buffer], { type: 'audio/wav' });
}

export function BleOscilloscopeDashboard() {
  const [deviceName, setDeviceName] = useState('No device connected');
  const [status, setStatus] = useState('Ready to connect');
  const [isSupported, setIsSupported] = useState(false);
  const [connectionMode, setConnectionMode] = useState<'bluetooth' | 'wifi'>('wifi');
  const [wifiIp, setWifiIp] = useState('192.168.1.8');
  const [wifiPort, setWifiPort] = useState('8000');
  const [wifiStatus, setWifiStatus] = useState('Disconnected');
  const [wifiConnecting, setWifiConnecting] = useState(false);
  const [wifiConnected, setWifiConnected] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [devices, setDevices] = useState<DeviceSummary[]>([]);
  const [packetRate, setPacketRate] = useState(0);
  const [packetLoss, setPacketLoss] = useState(0);
  const [latency, setLatency] = useState(0);
  const [samplingFrequency, setSamplingFrequency] = useState(DEFAULT_SAMPLE_RATE);
  const [packetCount, setPacketCount] = useState(0);
  const [lastPacketHex, setLastPacketHex] = useState('');
  const [storedPackets, setStoredPackets] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [oscilloscopeData, setOscilloscopeData] = useState<Array<{ index: number; value: number }>>([]);
  const [fftData, setFftData] = useState<Array<{ bin: number; magnitude: number }>>([]);
  const [spectrogramData, setSpectrogramData] = useState<Array<{ band: string; intensity: number }>>([]);
  const [frequencyResponseData, setFrequencyResponseData] = useState<Array<{ freq: number; response: number }>>([]);
  const [amplitude, setAmplitude] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [signalRms, setSignalRms] = useState(0);
  const [peakDetection, setPeakDetection] = useState(0);
  const [signalQuality, setSignalQuality] = useState(0);
  const [recordingActive, setRecordingActive] = useState(false);
  const [speaker, setSpeaker] = useState('Speaker 01');
  const [samplingRateInput, setSamplingRateInput] = useState('16000');
  const [temperature, setTemperature] = useState('24');
  const [laserGain, setLaserGain] = useState('1.0');
  const [distance, setDistance] = useState('0.35');
  const [recordingTime, setRecordingTime] = useState('');
  const [transcript, setTranscript] = useState('');
  const [speechFile, setSpeechFile] = useState<File | null>(null);
  const [speechUrl, setSpeechUrl] = useState<string | null>(null);
  const [speechFileName, setSpeechFileName] = useState('');
  const [recordingDurationMs, setRecordingDurationMs] = useState(0);

  const bluetoothRef = useRef<any>(null);
  const deviceRef = useRef<any>(null);
  const characteristicRef = useRef<any>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const packetStoreRef = useRef<PacketStore | null>(null);
  const sequenceRef = useRef<number | null>(null);
  const packetWindowStartRef = useRef<number>(Date.now());
  const packetWindowCountRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const autoReconnectRef = useRef(true);
  const recordingBufferRef = useRef<Array<{ timestampMs: number; value: number }>>([]);
  const recordingStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) {
      setIsSupported(true);
      bluetoothRef.current = navigator.bluetooth;
    }

    if (typeof window !== 'undefined') {
      const storedIp = window.localStorage.getItem('laservoice.wifi.ip');
      const storedPort = window.localStorage.getItem('laservoice.wifi.port');
      if (storedIp) {
        setWifiIp(storedIp);
      }
      if (storedPort) {
        setWifiPort(storedPort);
      }
    }

    packetStoreRef.current = new PacketStore();

    const worker = new Worker(new URL('./../app/bluetooth/signal-worker.ts', import.meta.url));
    worker.onmessage = (event: MessageEvent<AnalyticsPayload>) => {
      const payload = event.data;
      setOscilloscopeData(payload.oscilloscopeData);
      setFftData(payload.fftData);
      setSpectrogramData(payload.spectrogramData);
      setFrequencyResponseData(payload.frequencyResponseData);
      setAmplitude(payload.amplitude);
      setNoiseLevel(payload.noiseLevel);
      setSignalRms(payload.signalRms);
      setPeakDetection(payload.peakDetection);
      setSamplingFrequency(payload.samplingRate);
      setSignalQuality(payload.signalQuality);
    };
    workerRef.current = worker;

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      worker.terminate();
    };
  }, []);

  useEffect(() => {
    if (!recordingActive) {
      return undefined;
    }
    const interval = window.setInterval(() => {
      if (recordingStartRef.current !== null) {
        setRecordingDurationMs(Date.now() - recordingStartRef.current);
      }
    }, 250);
    return () => window.clearInterval(interval);
  }, [recordingActive]);

  useEffect(() => {
    const refreshKnownDevices = async () => {
      if (!bluetoothRef.current) {
        return;
      }
      try {
        const knownDevices = await bluetoothRef.current.getDevices();
        setDevices(knownDevices.map((device: any) => ({ id: device.id, name: device.name || 'Unnamed device', connected: device.gatt?.connected })));
      } catch {
        setErrorMessage('Unable to enumerate known devices right now.');
      }
    };

    void refreshKnownDevices();
  }, []);

  const persistWifiConfig = (ip: string, port: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.localStorage.setItem('laservoice.wifi.ip', ip);
    window.localStorage.setItem('laservoice.wifi.port', port);
  };

  const updateStoredPacketCount = async () => {
    if (!packetStoreRef.current) {
      return;
    }
    try {
      const count = await packetStoreRef.current.count();
      setStoredPackets(count);
    } catch {
      setErrorMessage('IndexedDB is unavailable in this browser context.');
    }
  };

  const connectToDevice = async (device: any) => {
    if (!bluetoothRef.current) {
      throw new Error('Web Bluetooth is not available.');
    }

    if (!device.gatt) {
      throw new Error('This device does not expose a GATT server.');
    }

    setStatus(`Connecting to ${device.name || 'BLE device'}...`);
    setErrorMessage(null);

    try {
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService(UART_SERVICE);
      const characteristic = await service.getCharacteristic(TX_CHARACTERISTIC);
      await characteristic.startNotifications();

      const handleValue = (event: Event) => {
        const value = (event.target as any).value;
        if (!value) {
          return;
        }

        const bytes = new Uint8Array(value.buffer);
        const now = Date.now();
        const packet = parsePacket(bytes, now, sequenceRef.current);
        if (!packet) {
          return;
        }

        const lossDelta = sequenceRef.current === null ? 0 : Math.max(0, packet.sequence - sequenceRef.current - 1);
        sequenceRef.current = packet.sequence;
        setPacketCount((previous) => previous + 1);
        setLastPacketHex(packet.payloadHex);
        setLatency(packet.latencyMs);
        setSamplingFrequency(packet.sampleRateHz);
        setPacketLoss((previous) => previous + lossDelta);
        packetWindowCountRef.current += 1;
        const elapsedSeconds = (now - packetWindowStartRef.current) / 1000;
        if (elapsedSeconds > 1) {
          const rate = packetWindowCountRef.current / elapsedSeconds;
          setPacketRate(Math.round(rate));
          packetWindowCountRef.current = 0;
          packetWindowStartRef.current = now;
        }

        if (recordingActive && recordingStartRef.current !== null) {
          packet.samples.forEach((sample, index) => {
            recordingBufferRef.current.push({ timestampMs: Math.round((Date.now() - recordingStartRef.current!) + index), value: sample });
          });
        }

        workerRef.current?.postMessage({ samples: packet.samples, sampleRateHz: packet.sampleRateHz });
        void packetStoreRef.current?.add(packet).then(() => {
          void updateStoredPacketCount();
        });
      };

      characteristic.addEventListener('characteristicvaluechanged', handleValue);
      characteristicRef.current = characteristic;
      deviceRef.current = device;
      setDeviceName(device.name || 'BLE device');
      setIsConnected(true);
      setStatus(`Connected to ${device.name || 'BLE device'} and streaming`);
      autoReconnectRef.current = true;
      await updateStoredPacketCount();

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setStatus('Connection lost, attempting reconnect…');
        if (autoReconnectRef.current && !reconnectTimerRef.current) {
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            void connectToDevice(device).catch((error) => {
              setErrorMessage(error instanceof Error ? error.message : 'Reconnection failed.');
              setStatus('Reconnect failed.');
            });
          }, 2000);
        }
      });
    } catch (error) {
      setIsConnected(false);
      setStatus('Connection failed');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to connect to the BLE device.');
      throw error;
    }
  };

  const scanAndConnect = async () => {
    if (!isSupported || !bluetoothRef.current) {
      setErrorMessage('Web Bluetooth is not supported in this browser.');
      return;
    }

    setIsScanning(true);
    setStatus('Scanning for BLE devices…');

    try {
      const device = await bluetoothRef.current.requestDevice({
        acceptAllDevices: true,
        optionalServices: [UART_SERVICE, 'battery_service'],
      });

      if (device) {
        const known = devices.some((entry) => entry.id === device.id);
        if (!known) {
          setDevices((previous) => [{ id: device.id, name: device.name || 'Unnamed device', connected: false }, ...previous]);
        }
        await connectToDevice(device);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Scan cancelled or failed.';
      setErrorMessage(message);
      setStatus('Scan cancelled or failed');
    } finally {
      setIsScanning(false);
    }
  };

  const testWifiConnection = async () => {
    const ip = wifiIp.trim() || '192.168.1.8';
    const port = wifiPort.trim() || '8000';
    if (!ip || !/^([a-zA-Z0-9.-]+|\d{1,3}(\.\d{1,3}){3})$/.test(ip)) {
      setWifiConnected(false);
      setWifiStatus('Wrong IP');
      setErrorMessage('Enter a valid laptop IP or hostname for the backend.');
      return false;
    }

    setWifiConnecting(true);
    setWifiStatus('Connecting');
    setErrorMessage(null);
    setStatus('Connecting to backend over Wi-Fi…');

    try {
      const response = await fetch(`http://${ip}:${port}/api/wifi/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host: ip, port: Number(port), device_id: 'ESP32-LASER-01' }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.detail || 'Backend unavailable');
      }

      persistWifiConfig(ip, port);
      setWifiConnected(Boolean(payload?.paired ?? true));
      setWifiStatus(payload?.paired ? 'Connected' : 'Pending pairing');
      setStatus(payload?.paired ? 'Connected to backend over Wi-Fi' : 'Backend reached but pairing is pending');
      return Boolean(payload?.paired ?? true);
    } catch (error) {
      setWifiConnected(false);
      setWifiStatus('Backend unavailable');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to reach the backend. Check the laptop IP, port, and whether the FastAPI server is running.');
      setStatus('Backend unavailable');
      return false;
    } finally {
      setWifiConnecting(false);
    }
  };

  const handleWifiConnect = async () => {
    await testWifiConnection();
  };

  const handleWifiDisconnect = () => {
    setWifiConnected(false);
    setWifiStatus('Disconnected');
    setStatus('Wi-Fi disconnected');
    setErrorMessage(null);
  };

  const disconnectDevice = async () => {
    autoReconnectRef.current = false;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (characteristicRef.current) {
      try {
        await characteristicRef.current.stopNotifications();
      } catch {
        // ignore
      }
    }

    deviceRef.current?.gatt?.disconnect();
    setIsConnected(false);
    setStatus('Disconnected');
  };

  const startRecording = () => {
    if (!isConnected) {
      setErrorMessage('Connect to the ESP32 before starting a recording session.');
      return;
    }
    recordingBufferRef.current = [];
    recordingStartRef.current = Date.now();
    setRecordingActive(true);
    setRecordingTime(new Date().toISOString());
    setRecordingDurationMs(0);
    setStatus('Recording vibration data…');
  };

  const stopRecording = () => {
    setRecordingActive(false);
    if (recordingStartRef.current !== null) {
      setRecordingDurationMs(Date.now() - recordingStartRef.current);
    }
    setStatus('Recording stopped. You can export the dataset now.');
  };

  const handleSpeechUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (speechUrl) {
      URL.revokeObjectURL(speechUrl);
    }
    setSpeechFile(file);
    setSpeechFileName(file.name);
    setSpeechUrl(URL.createObjectURL(file));
  };

  const exportDataset = async () => {
    const recordedSamples = recordingBufferRef.current;
    const sampleRate = Number(samplingRateInput || DEFAULT_SAMPLE_RATE);
    const counterKey = 'laservoice.dataset.counter';
    const nextCounter = Number(localStorage.getItem(counterKey) || '0') + 1;
    localStorage.setItem(counterKey, String(nextCounter));
    const baseName = `dataset_${String(nextCounter).padStart(3, '0')}`;

    const csvRows = ['# LaserVoice dataset export', `speaker,${speaker}`, `sampling_rate,${sampleRate}`, `temperature,${temperature}`, `laser_gain,${laserGain}`, `distance,${distance}`, `recording_time,${recordingTime || new Date().toISOString()}`, 'timestamp_ms,value'];
    if (recordedSamples.length > 0) {
      recordedSamples.forEach((point) => csvRows.push(`${point.timestampMs},${point.value}`));
    } else {
      csvRows.push('0,0');
    }
    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv' });

    const transcriptContent = `${transcript || 'No transcript provided.'}\n\nMetadata:\nspeaker=${speaker}\nsampling_rate=${sampleRate}\ntemperature=${temperature}\nlaser_gain=${laserGain}\ndistance=${distance}\nrecording_time=${recordingTime || new Date().toISOString()}`;
    const transcriptBlob = new Blob([transcriptContent], { type: 'text/plain' });

    let audioBlob: Blob;
    if (speechFile) {
      audioBlob = new Blob([speechFile], { type: speechFile.type || 'audio/wav' });
    } else {
      audioBlob = createSilentWavBlob(sampleRate, 1);
    }

    const download = (blob: Blob, fileName: string) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    };

    download(csvBlob, `${baseName}_laser.csv`);
    download(audioBlob, `${baseName}_audio.wav`);
    download(transcriptBlob, `${baseName}_transcript.txt`);
    setStatus('Dataset exported successfully.');
  };

  const statusTone = useMemo(() => (isConnected ? 'text-cyan-200' : 'text-amber-200'), [isConnected]);

  return (
    <LayoutShell>
      <div className="space-y-6">
        <div className="glass rounded-[2rem] p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Oscilloscope Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">Real-time BLE signal analytics</h1>
              <p className="mt-3 max-w-2xl text-slate-400">Monitor incoming ESP32 packets in a professional instrument-style view with live waveform, spectrum, noise, and quality metrics.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge online={isConnected} label={isConnected ? 'Streaming' : 'Idle'} />
              <StatusBadge online={isSupported} label={isSupported ? 'Web Bluetooth ready' : 'Browser unsupported'} />
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-cyan-200">
                  <BluetoothSearching className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-slate-400">Connection state</p>
                  <p className="text-xl font-semibold text-white">{deviceName}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <button onClick={() => setConnectionMode('bluetooth')} className={`rounded-full border px-4 py-2 text-sm font-medium ${connectionMode === 'bluetooth' ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-slate-950/40 text-slate-300'}`}>
                  Bluetooth
                </button>
                <button onClick={() => setConnectionMode('wifi')} className={`rounded-full border px-4 py-2 text-sm font-medium ${connectionMode === 'wifi' ? 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100' : 'border-white/10 bg-slate-950/40 text-slate-300'}`}>
                  Wi-Fi
                </button>
              </div>

              {connectionMode === 'wifi' ? (
                <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                  <div className="flex items-center gap-2 text-cyan-200">
                    {wifiConnected ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                    <span className="font-medium text-white">Wi-Fi Connection</span>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <label className="text-sm text-slate-300">
                      <span className="mb-2 block">ESP32 IP Address</span>
                      <input value={wifiIp} onChange={(event) => setWifiIp(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white" placeholder="192.168.1.105" />
                    </label>
                    <label className="text-sm text-slate-300">
                      <span className="mb-2 block">Port</span>
                      <input value={wifiPort} onChange={(event) => setWifiPort(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-white" placeholder="8000" />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button onClick={handleWifiConnect} disabled={wifiConnecting} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">
                      <Wifi className="h-4 w-4" /> {wifiConnecting ? 'Connecting…' : 'Connect'}
                    </button>
                    <button onClick={handleWifiDisconnect} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 font-medium text-slate-100 transition hover:bg-white/10">
                      <WifiOff className="h-4 w-4" /> Disconnect
                    </button>
                    <button onClick={testWifiConnection} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-5 py-3 font-medium text-cyan-100 transition hover:bg-cyan-500/20">
                      <Zap className="h-4 w-4" /> Test Connection
                    </button>
                  </div>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/60 p-3 text-sm text-cyan-100">Connection status: {wifiStatus}</div>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap gap-3">
                  <button onClick={scanAndConnect} disabled={isScanning} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70">
                    <Radio className="h-4 w-4" /> {isScanning ? 'Scanning…' : 'Scan & connect'}
                  </button>
                  <button onClick={disconnectDevice} className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-3 font-medium text-slate-100 transition hover:bg-white/10">
                    <ShieldCheck className="h-4 w-4" /> Disconnect
                  </button>
                </div>
              )}

              <div className={`mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm ${statusTone}`}>
                <p className="flex items-center gap-2"><Zap className="h-4 w-4" /> {status}</p>
                {errorMessage ? <p className="mt-2 flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /> {errorMessage}</p> : null}
              </div>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                <p className="font-medium text-white">Captured stream</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">Packet rate: {packetRate} p/s</div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">Packet loss: {packetLoss}</div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">Latency: {latency} ms</div>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-3">Stored packets: {storedPackets}</div>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <p className="text-sm text-slate-400">Discovered devices</p>
              {devices.length === 0 ? <p className="mt-3 text-sm text-slate-400">Scan to locate nearby BLE devices.</p> : <ul className="mt-4 space-y-2">{devices.map((device) => (<li key={device.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2"><span>{device.name}</span><span className="text-xs text-cyan-200">{device.connected ? 'Connected' : 'Ready'}</span></li>))}</ul>}
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetricCard label="Amplitude" value={`${amplitude.toFixed(3)}`} accent="text-cyan-300" />
              <MetricCard label="Noise Level" value={`${noiseLevel.toFixed(3)}`} accent="text-violet-300" />
              <MetricCard label="Signal RMS" value={`${signalRms.toFixed(3)}`} accent="text-emerald-300" />
              <MetricCard label="Peak Detection" value={`${peakDetection.toFixed(3)}`} accent="text-amber-300" />
              <MetricCard label="Sampling Rate" value={`${samplingFrequency} Hz`} accent="text-cyan-300" />
              <MetricCard label="Signal Quality" value={`${signalQuality.toFixed(0)}%`} accent="text-cyan-300" />
            </div>

            <div className="glass rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Oscilloscope</p>
                  <p className="text-xl font-semibold text-white">Live waveform</p>
                </div>
                <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">60 FPS</div>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={oscilloscopeData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="index" hide />
                    <YAxis domain={[-1, 1]} stroke="#94a3b8" />
                    <Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#4cc9f0" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="glass rounded-3xl p-6">
                <p className="text-sm text-slate-400">FFT</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fftData.slice(0, 16)}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="bin" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="magnitude" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass rounded-3xl p-6">
                <p className="text-sm text-slate-400">Spectrogram</p>
                <div className="mt-4 h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={spectrogramData}>
                      <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="band" stroke="#94a3b8" />
                      <YAxis stroke="#94a3b8" />
                      <Tooltip />
                      <Bar dataKey="intensity" fill="#818cf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Frequency response</p>
                  <p className="text-xl font-semibold text-white">Spectral envelope</p>
                </div>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={frequencyResponseData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="freq" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip />
                    <Area type="monotone" dataKey="response" stroke="#22d3ee" fill="#22d3ee" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass rounded-3xl p-6">
              <p className="text-sm text-slate-400">Dataset recording</p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="text-sm text-slate-300">
                  <span className="mb-2 block">Speaker</span>
                  <input value={speaker} onChange={(event) => setSpeaker(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-2 block">Sampling rate</span>
                  <input value={samplingRateInput} onChange={(event) => setSamplingRateInput(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-2 block">Temperature</span>
                  <input value={temperature} onChange={(event) => setTemperature(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-2 block">Laser gain</span>
                  <input value={laserGain} onChange={(event) => setLaserGain(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-2 block">Distance</span>
                  <input value={distance} onChange={(event) => setDistance(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  <span className="mb-2 block">Recording time</span>
                  <input value={recordingTime} onChange={(event) => setRecordingTime(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button onClick={recordingActive ? stopRecording : startRecording} className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300">
                  <Mic2 className="h-4 w-4" /> {recordingActive ? 'Stop recording' : 'Start recording'}
                </button>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 px-4 py-2 font-medium text-slate-100 transition hover:bg-white/10">
                  <Upload className="h-4 w-4" /> Upload speech
                  <input type="file" accept="audio/*" className="hidden" onChange={handleSpeechUpload} />
                </label>
                <button onClick={exportDataset} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-4 py-2 font-medium text-cyan-100 transition hover:bg-cyan-500/20">
                  <Save className="h-4 w-4" /> Export Dataset
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300">
                <p className="font-medium text-white">Recording status</p>
                <p className="mt-2">Duration: {Math.round(recordingDurationMs / 1000)}s • Samples captured: {recordingBufferRef.current.length}</p>
                {speechFileName ? <p className="mt-2 text-cyan-200">Speech file: {speechFileName}</p> : null}
              </div>

              <div className="mt-4">
                {speechUrl ? (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                    <div className="flex items-center gap-2 text-cyan-200">
                      <Play className="h-4 w-4" />
                      <span className="text-sm">Playback</span>
                    </div>
                    <audio src={speechUrl} controls className="mt-3 w-full" />
                  </div>
                ) : <p className="text-sm text-slate-400">Upload a speech recording to attach it to the dataset export.</p>}
              </div>

              <label className="mt-4 block text-sm text-slate-300">
                <span className="mb-2 block">Transcript</span>
                <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/50 px-3 py-2 text-white" placeholder="Enter transcript text" />
              </label>

              <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/40 p-4 font-mono text-xs text-cyan-100">{lastPacketHex || 'Waiting for binary payload…'}</div>
            </div>
          </div>
        </div>
      </div>
    </LayoutShell>
  );
}
