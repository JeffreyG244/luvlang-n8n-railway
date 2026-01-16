#!/usr/bin/env python3
"""
LuvLang Audio Analysis Engine
Professional-grade audio analysis for mastering workflow
"""

import sys
import json
import numpy as np
import librosa
import soundfile as sf
from scipy import signal
from scipy.stats import kurtosis, skew
import argparse

class AudioAnalyzer:
    def __init__(self, audio_file, genre='balanced'):
        self.audio_file = audio_file
        self.genre = genre
        self.y, self.sr = librosa.load(audio_file, sr=None, mono=False)

        # Convert to mono for analysis
        if len(self.y.shape) > 1:
            self.y_mono = librosa.to_mono(self.y)
        else:
            self.y_mono = self.y

    def analyze_loudness(self):
        """Analyze loudness metrics (LUFS, RMS, Peak)"""
        # Calculate RMS (Root Mean Square) energy
        rms = librosa.feature.rms(y=self.y_mono)[0]
        rms_db = librosa.amplitude_to_db(rms, ref=np.max)

        # Peak level
        peak = np.abs(self.y_mono).max()
        peak_db = 20 * np.log10(peak) if peak > 0 else -np.inf

        # Estimate LUFS (simplified integrated loudness)
        # Professional LUFS requires ITU-R BS.1770 algorithm
        # This is a simplified estimation
        lufs_estimate = np.mean(rms_db) + 3.0  # Rough conversion

        # Dynamic range
        dynamic_range = peak_db - np.mean(rms_db)

        return {
            'lufs': float(lufs_estimate),
            'rms_db': float(np.mean(rms_db)),
            'peak_db': float(peak_db),
            'dynamic_range': float(dynamic_range),
            'headroom': float(-1.0 - peak_db)  # Space below -1dBFS
        }

    def analyze_frequency_balance(self):
        """Analyze frequency spectrum and balance"""
        # Compute STFT
        D = librosa.stft(self.y_mono)
        magnitude = np.abs(D)

        # Define frequency bands
        freqs = librosa.fft_frequencies(sr=self.sr)

        # Frequency band energy (in Hz)
        sub_bass = (20, 60)      # Sub-bass rumble
        bass = (60, 250)         # Bass
        low_mid = (250, 500)     # Low mids (muddy area)
        mid = (500, 2000)        # Mids
        high_mid = (2000, 6000)  # High mids (presence)
        high = (6000, 20000)     # Highs (air/brightness)

        def band_energy(low, high):
            idx = np.where((freqs >= low) & (freqs < high))[0]
            return np.mean(magnitude[idx, :]) if len(idx) > 0 else 0

        energies = {
            'sub_bass': band_energy(*sub_bass),
            'bass': band_energy(*bass),
            'low_mid': band_energy(*low_mid),
            'mid': band_energy(*mid),
            'high_mid': band_energy(*high_mid),
            'high': band_energy(*high),
        }

        # Normalize energies
        total_energy = sum(energies.values())
        if total_energy > 0:
            energies = {k: v/total_energy for k, v in energies.items()}

        # Calculate balance score (0-1, 1 is perfectly balanced)
        ideal_distribution = {
            'sub_bass': 0.10,
            'bass': 0.20,
            'low_mid': 0.15,
            'mid': 0.25,
            'high_mid': 0.20,
            'high': 0.10
        }

        balance_score = 1.0 - sum(abs(energies[k] - ideal_distribution[k])
                                   for k in energies) / 2.0

        # Identify issues
        issues = []
        if energies['low_mid'] > 0.20:
            issues.append('muddy_low_mids')
        if energies['high_mid'] > 0.25:
            issues.append('harsh_highs')
        if energies['bass'] < 0.15:
            issues.append('weak_bass')
        if energies['high'] < 0.05:
            issues.append('lacks_air')

        return {
            'frequency_balance': float(balance_score),
            'band_energies': {k: float(v) for k, v in energies.items()},
            'issues': issues
        }

    def analyze_stereo_field(self):
        """Analyze stereo width and imaging"""
        if len(self.y.shape) == 1:
            return {
                'stereo_width': 0.0,
                'is_mono': bool(True),
                'phase_correlation': 1.0
            }

        left = self.y[0]
        right = self.y[1]

        # Calculate mid and side signals
        mid = (left + right) / 2
        side = (left - right) / 2

        # Stereo width (ratio of side to mid energy)
        mid_energy = np.sum(mid ** 2)
        side_energy = np.sum(side ** 2)

        if mid_energy > 0:
            stereo_width = side_energy / mid_energy
        else:
            stereo_width = 0

        # Phase correlation
        correlation = np.corrcoef(left, right)[0, 1]

        return {
            'stereo_width': float(np.clip(stereo_width, 0, 1)),
            'is_mono': bool(False),
            'phase_correlation': float(correlation)
        }

    def analyze_dynamics(self):
        """Analyze dynamic characteristics"""
        # Calculate envelope
        envelope = np.abs(librosa.feature.rms(y=self.y_mono)[0])

        # Crest factor (peak to RMS ratio)
        peak = np.max(np.abs(self.y_mono))
        rms = np.sqrt(np.mean(self.y_mono ** 2))
        crest_factor = peak / rms if rms > 0 else 0
        crest_factor_db = 20 * np.log10(crest_factor) if crest_factor > 0 else 0

        # Statistical measures
        kurt = kurtosis(self.y_mono)
        skewness = skew(self.y_mono)

        return {
            'crest_factor_db': float(crest_factor_db),
            'kurtosis': float(kurt),
            'skewness': float(skewness),
            'needs_compression': bool(crest_factor_db > 12)
        }

    def detect_clipping(self):
        """Detect clipping and distortion"""
        threshold = 0.99
        clipped_samples = np.sum(np.abs(self.y_mono) >= threshold)
        total_samples = len(self.y_mono)
        clipping_percentage = (clipped_samples / total_samples) * 100

        return {
            'has_clipping': bool(clipping_percentage > 0.01),
            'clipping_percentage': float(clipping_percentage),
            'clipped_samples': int(clipped_samples)
        }

    def estimate_quality(self):
        """Estimate overall audio quality score (0-10)"""
        loudness = self.analyze_loudness()
        freq_balance = self.analyze_frequency_balance()
        stereo = self.analyze_stereo_field()
        dynamics = self.analyze_dynamics()
        clipping = self.detect_clipping()

        # Quality scoring
        score = 10.0

        # Penalize for issues
        if loudness['lufs'] < -18:
            score -= 2  # Too quiet
        if loudness['lufs'] > -8:
            score -= 3  # Too loud (over-compressed)

        if freq_balance['frequency_balance'] < 0.7:
            score -= 2  # Poor frequency balance

        if clipping['has_clipping']:
            score -= 3  # Clipping is serious

        if dynamics['needs_compression']:
            score -= 1  # Needs dynamic control

        if stereo['stereo_width'] < 0.3 and not stereo['is_mono']:
            score -= 1  # Narrow stereo image

        return float(max(0, min(10, score)))

    def full_analysis(self):
        """Perform complete audio analysis"""
        return {
            'loudness': self.analyze_loudness(),
            'frequency': self.analyze_frequency_balance(),
            'stereo': self.analyze_stereo_field(),
            'dynamics': self.analyze_dynamics(),
            'clipping': self.detect_clipping(),
            'overallQuality': self.estimate_quality(),
            'sampleRate': int(self.sr),
            'duration': float(len(self.y_mono) / self.sr),
            'genre': self.genre
        }

def main():
    parser = argparse.ArgumentParser(description='LuvLang Audio Analysis')
    parser.add_argument('input_file', help='Input audio file')
    parser.add_argument('output_json', help='Output JSON file for analysis results')
    parser.add_argument('--genre', default='balanced', help='Music genre for context')

    args = parser.parse_args()

    try:
        # Analyze audio
        analyzer = AudioAnalyzer(args.input_file, genre=args.genre)
        analysis = analyzer.full_analysis()

        # Save to JSON
        with open(args.output_json, 'w') as f:
            json.dump(analysis, f, indent=2)

        # Print to stdout for n8n
        print(json.dumps(analysis))

        return 0

    except Exception as e:
        error = {'error': str(e), 'success': False}
        print(json.dumps(error))
        return 1

if __name__ == '__main__':
    sys.exit(main())
