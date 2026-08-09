import numpy as np
from scipy import signal
from typing import Dict, Any, List, Tuple

def process_vibration_signal(raw_samples: List[float], sample_rate: int = 16000) -> Dict[str, Any]:
    """
    Processes raw ADC samples from optical sensor / photodiode receiver:
    1. DC offset removal
    2. Normalization
    3. Windowing (Hann window)
    4. FFT calculation
    5. Time-domain & Frequency-domain feature extraction
    """
    if not raw_samples:
        raw_samples = [0.0] * 256

    arr = np.array(raw_samples, dtype=np.float64)

    # 1. DC offset removal (zero-mean centering)
    dc_offset = float(np.mean(arr))
    zero_centered = arr - dc_offset

    # 2. Normalization (scale by peak or max abs value)
    peak_val = float(np.max(np.abs(zero_centered)))
    if peak_val > 1e-6:
        normalized = zero_centered / peak_val
    else:
        normalized = zero_centered

    # 3. Time domain metrics
    rms = float(np.sqrt(np.mean(normalized ** 2)))
    peak = float(np.max(np.abs(normalized)))
    peak_to_peak = float(np.ptp(normalized))
    crest_factor = float(peak / (rms + 1e-8))
    variance = float(np.var(normalized))
    std_dev = float(np.std(normalized))

    # 4. Windowing and FFT Calculation
    n_samples = len(normalized)
    window = np.hanning(n_samples)
    windowed_signal = normalized * window

    # Compute positive frequency FFT
    fft_vals = np.fft.rfft(windowed_signal)
    fft_mag = np.abs(fft_vals) / (n_samples / 2.0)
    freqs = np.fft.rfftfreq(n_samples, d=1.0 / sample_rate)

    # Frequency Domain Features
    dominant_idx = int(np.argmax(fft_mag))
    dominant_freq = float(freqs[dominant_idx])
    peak_freq_mag = float(fft_mag[dominant_idx])

    # Fundamental frequency (first prominent peak)
    fundamental_freq = dominant_freq
    if len(fft_mag) > 1:
        threshold = 0.2 * np.max(fft_mag)
        peaks, _ = signal.find_peaks(fft_mag, height=threshold)
        if len(peaks) > 0:
            fundamental_freq = float(freqs[peaks[0]])

    # Spectral Energy
    spectral_energy = float(np.sum(fft_mag ** 2))

    # Spectral Centroid
    spectral_sum = float(np.sum(fft_mag))
    if spectral_sum > 1e-8:
        spectral_centroid = float(np.sum(freqs * fft_mag) / spectral_sum)
    else:
        spectral_centroid = 0.0

    # Frequency-Band Energies
    # Band 1: Low (0 - 100 Hz) - Unbalance / Looseness
    # Band 2: Mid (100 - 1000 Hz) - Gear / Misalignment
    # Band 3: High (1000 - 8000 Hz) - Bearing defects
    low_band_mask = (freqs >= 0) & (freqs <= 100)
    mid_band_mask = (freqs > 100) & (freqs <= 1000)
    high_band_mask = (freqs > 1000) & (freqs <= 8000)

    energy_low = float(np.sum(fft_mag[low_band_mask] ** 2))
    energy_mid = float(np.sum(fft_mag[mid_band_mask] ** 2))
    energy_high = float(np.sum(fft_mag[high_band_mask] ** 2))

    # Signal Quality (0 - 100% based on SNR / dynamic range)
    noise_floor = float(np.median(fft_mag))
    if peak_freq_mag > 1e-6:
        snr_db = 20.0 * np.log10(peak_freq_mag / (noise_floor + 1e-8))
        signal_quality = float(np.clip((snr_db / 40.0) * 100.0, 0.0, 100.0))
    else:
        signal_quality = 50.0

    # Format FFT bins for UI (sample up to 64 bins for chart clarity)
    max_bins = min(64, len(freqs))
    fft_spectrum = [
        {"freq": float(round(freqs[i], 1)), "magnitude": float(round(fft_mag[i], 4))}
        for i in range(max_bins)
    ]

    return {
        "dc_offset": round(dc_offset, 2),
        "rms": round(rms, 4),
        "peak": round(peak, 4),
        "peak_to_peak": round(peak_to_peak, 4),
        "crest_factor": round(crest_factor, 4),
        "variance": round(variance, 6),
        "std_dev": round(std_dev, 6),
        "dominant_freq": round(dominant_freq, 1),
        "fundamental_freq": round(fundamental_freq, 1),
        "peak_freq_magnitude": round(peak_freq_mag, 4),
        "spectral_energy": round(spectral_energy, 4),
        "spectral_centroid": round(spectral_centroid, 1),
        "band_energy_low": round(energy_low, 4),
        "band_energy_mid": round(energy_mid, 4),
        "band_energy_high": round(energy_high, 4),
        "signal_quality": round(signal_quality, 1),
        "fft_spectrum": fft_spectrum,
        "normalized_samples": [round(x, 4) for x in normalized.tolist()]
    }
