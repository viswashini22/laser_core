'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BluetoothSearching, Database, Radio, ShieldCheck, Zap } from 'lucide-react';
import { LayoutShell } from '@/components/layout-shell';
import { BleOscilloscopeDashboard } from '@/components/ble-oscilloscope-dashboard';

const UART_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const TX_CHARACTERISTIC = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

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

function parsePacket(bytes: Uint8Array, receivedAt: number, previousSequence: number | null): ParsedPacket | null {
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
  for (let i = 0; i < bytes.length - 1; i += 1) {
    sum = (sum + bytes[i]) & 0xff;
  }
  const checksumOk = checksum === (sum & 0xff);

  const sampleValues = new Array<number>();
  for (let index = 0; index + 1 < payload.length; index += 2) {
    sampleValues.push((payload[index + 1] << 8) | payload[index]);
  }

  const sampleRateHz = sampleValues.length > 1 ? Math.max(1, Math.round(sampleValues.length / Math.max(1, (receivedAt - (previousSequence === null ? receivedAt : receivedAt - 1)) / 1000))) : 0;

  const latencyMs = Math.max(0, Math.round((receivedAt - (payload[0] ? payload[0] * 10 : receivedAt)) / 1000));

  return {
    sequence,
    bytesReceived: bytes.length,
    payloadLength,
    checksumOk,
    latencyMs,
    sampleCount: sampleValues.length,
    sampleRateHz,
    payloadHex: Array.from(payload).map((value) => value.toString(16).padStart(2, '0')).join(''),
    receivedAt,
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

export default function BluetoothPage() {
  return <BleOscilloscopeDashboard />;
}
