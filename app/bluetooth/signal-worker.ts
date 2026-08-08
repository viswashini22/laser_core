self.onmessage = (event: MessageEvent<{ samples: number[]; sampleRateHz: number }>) => {
  const { samples, sampleRateHz } = event.data;
  if (!samples.length) {
    return;
  }

  const windowSize = Math.min(samples.length, 128);
  const slice = samples.slice(-windowSize);
  const oscilloscopeData = slice.map((value, index) => ({ index, value }));

  const fftData: Array<{ bin: number; magnitude: number }> = [];
  const magnitude = new Array<number>(windowSize).fill(0);
  for (let i = 0; i < windowSize; i += 1) {
    let real = 0;
    let imag = 0;
    for (let j = 0; j < windowSize; j += 1) {
      const angle = (-2 * Math.PI * i * j) / windowSize;
      real += slice[j] * Math.cos(angle);
      imag += slice[j] * Math.sin(angle);
    }
    magnitude[i] = Math.sqrt(real * real + imag * imag) / windowSize;
  }

  for (let i = 0; i < Math.min(16, magnitude.length); i += 1) {
    fftData.push({ bin: i, magnitude: magnitude[i] });
  }

  const spectrogramData = [
    { band: '0-250 Hz', intensity: magnitude[1] * 100 },
    { band: '250-500 Hz', intensity: magnitude[2] * 120 },
    { band: '500-1k Hz', intensity: magnitude[3] * 80 },
    { band: '1k-2k Hz', intensity: magnitude[4] * 60 },
  ];

  const frequencyResponseData = Array.from({ length: 12 }, (_, index) => ({
    freq: index * 100,
    response: Math.max(0.01, magnitude[Math.min(index + 1, magnitude.length - 1)] * 100),
  }));

  const amplitude = slice.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
  const noiseLevel = slice.reduce((sum, value) => sum + value * value, 0) / Math.max(1, slice.length);
  const signalRms = Math.sqrt(noiseLevel);
  const peakDetection = amplitude;
  const signalQuality = Math.max(0, Math.min(100, 100 - (noiseLevel * 1000) * 8));

  self.postMessage({
    oscilloscopeData,
    fftData,
    spectrogramData,
    frequencyResponseData,
    amplitude,
    noiseLevel,
    signalRms,
    peakDetection,
    samplingRate: sampleRateHz || 16000,
    signalQuality,
  });
};
