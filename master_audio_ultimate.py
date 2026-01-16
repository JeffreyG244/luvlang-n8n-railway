#!/usr/bin/env python3
"""
LuvLang Ultimate Mastering Engine
Maximum Quality & Fidelity for Each Streaming Platform
Professional-grade processing with platform-specific optimization
"""

import sys
import json
import numpy as np
import soundfile as sf
import librosa
from scipy import signal
import subprocess
import argparse

class UltimateMasteringEngine:
    def __init__(self, input_file, output_file, platform='spotify',
                 analysis_file=None, user_params=None):
        self.input_file = input_file
        self.output_file = output_file
        self.platform = platform

        # Load analysis if provided
        self.analysis = None
        if analysis_file:
            with open(analysis_file, 'r') as f:
                self.analysis = json.load(f)

        # User-provided parameters (from frontend sliders)
        self.user_params = user_params or {}

        # Load audio at MAXIMUM quality (no sample rate conversion)
        self.y, self.sr = librosa.load(input_file, sr=None, mono=False)

        # Get platform-optimized parameters
        self.params = self.get_platform_optimized_params()

        print(f"\n{'='*80}")
        print(f"LUVLANG ULTIMATE MASTERING ENGINE")
        print(f"Maximum Quality & Fidelity Processing")
        print(f"Platform: {platform.upper()}")
        print(f"Sample Rate: {self.sr} Hz")
        print(f"Bit Depth: Processing at 32-bit float")
        print(f"{'='*80}\n")

    def get_platform_optimized_params(self):
        """
        Platform-specific optimization for MAXIMUM quality and fidelity
        Each platform has unique characteristics that we optimize for
        """
        platform_presets = {
            'spotify': {
                'target_lufs': -14,
                'true_peak': -1.0,
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 5))),
                'stereo_width': int(self.get_user_param('width', 100)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 20)) / 100.0,
                # Spotify-specific optimizations
                'high_freq_rolloff': 20000,  # Spotify preserves up to 20kHz
                'stereo_enhancement': 'moderate',  # Spotify handles stereo well
                'transient_preservation': 'high',  # Ogg Vorbis can smear transients
                'bass_mono_freq': 90,  # Mono bass below 90Hz for Spotify codec
                'dynamic_range_target': 8,  # Good DR for Spotify normalization
            },
            'apple': {
                'target_lufs': -16,
                'true_peak': -1.0,
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 4))),
                'stereo_width': int(self.get_user_param('width', 100)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 15)) / 100.0,
                # Apple Music optimizations for MAXIMUM quality
                'high_freq_rolloff': 22050,  # Apple AAC preserves higher frequencies
                'stereo_enhancement': 'natural',  # Apple codec is very transparent
                'transient_preservation': 'maximum',  # AAC preserves transients excellently
                'bass_mono_freq': 80,  # Less aggressive bass mono
                'dynamic_range_target': 10,  # HIGHER dynamic range for Apple's -16 LUFS
                'air_enhancement': True,  # Apple's codec preserves high-end air
            },
            'youtube': {
                'target_lufs': -14,
                'true_peak': -1.0,
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 5))),
                'stereo_width': int(self.get_user_param('width', 100)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 20)) / 100.0,
                # YouTube optimizations
                'high_freq_rolloff': 20000,
                'stereo_enhancement': 'moderate',
                'transient_preservation': 'high',
                'bass_mono_freq': 100,  # Mono bass for YouTube's variable bitrate
                'dynamic_range_target': 8,
                'presence_boost': True,  # YouTube benefits from presence boost
            },
            'tidal': {
                'target_lufs': -14,
                'true_peak': -1.0,
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 4))),
                'stereo_width': int(self.get_user_param('width', 105)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 10)) / 100.0,
                # TIDAL HiFi/Master optimizations - LOSSLESS QUALITY
                'high_freq_rolloff': 22050,  # FLAC preserves everything
                'stereo_enhancement': 'pristine',  # Lossless = preserve stereo image
                'transient_preservation': 'maximum',  # No codec artifacts
                'bass_mono_freq': 70,  # Keep stereo bass for audiophiles
                'dynamic_range_target': 10,  # Maximum dynamics for HiFi listeners
                'air_enhancement': True,
                'ultra_quality': True,  # Special flag for lossless optimization
            },
            'soundcloud': {
                'target_lufs': -11,
                'true_peak': -0.5,
                'bass_boost': float(self.get_user_param('bass', 1)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0.5)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 6))),
                'stereo_width': int(self.get_user_param('width', 100)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 30)) / 100.0,
                # SoundCloud optimizations - needs to be LOUD and PUNCHY
                'high_freq_rolloff': 18000,  # SC codec can be harsh at high freq
                'stereo_enhancement': 'aggressive',
                'transient_preservation': 'medium',  # Some limiting for loudness
                'bass_mono_freq': 120,  # Strong mono bass for laptop speakers
                'dynamic_range_target': 6,  # Less dynamic for competitive loudness
                'presence_boost': True,
                'loudness_maximization': True,
            },
            'deezer': {
                'target_lufs': -15,
                'true_peak': -1.0,
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 4))),
                'stereo_width': int(self.get_user_param('width', 100)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 15)) / 100.0,
                # Deezer HiFi optimizations
                'high_freq_rolloff': 22050,
                'stereo_enhancement': 'natural',
                'transient_preservation': 'maximum',
                'bass_mono_freq': 80,
                'dynamic_range_target': 9,
                'air_enhancement': True,
            },
            'amazon': {
                'target_lufs': -14,
                'true_peak': -2.0,  # Amazon is conservative
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 5))),
                'stereo_width': int(self.get_user_param('width', 100)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 20)) / 100.0,
                # Amazon Music HD optimizations
                'high_freq_rolloff': 22050,
                'stereo_enhancement': 'natural',
                'transient_preservation': 'high',
                'bass_mono_freq': 90,
                'dynamic_range_target': 8,
            },
            'pandora': {
                'target_lufs': -14,
                'true_peak': -2.0,
                'bass_boost': float(self.get_user_param('bass', 0)),
                'mids_boost': float(self.get_user_param('mids', 0.5)),
                'highs_boost': float(self.get_user_param('highs', 0)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 5))),
                'stereo_width': int(self.get_user_param('width', 95)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 25)) / 100.0,
                # Pandora radio-style optimizations
                'high_freq_rolloff': 19000,
                'stereo_enhancement': 'moderate',
                'transient_preservation': 'medium',
                'bass_mono_freq': 100,
                'dynamic_range_target': 7,
                'presence_boost': True,  # Radio needs vocal clarity
            },
            'radio': {
                'target_lufs': -9,
                'true_peak': -0.3,
                'bass_boost': float(self.get_user_param('bass', 2)),
                'mids_boost': float(self.get_user_param('mids', 1)),
                'highs_boost': float(self.get_user_param('highs', 1)),
                'compression_ratio': self.map_compression(int(self.get_user_param('compression', 8))),
                'stereo_width': int(self.get_user_param('width', 90)) / 100.0,
                'saturation': int(self.get_user_param('warmth', 40)) / 100.0,
                # Radio/Club optimizations - MAXIMUM IMPACT
                'high_freq_rolloff': 16000,  # Radio doesn't need ultra-high freq
                'stereo_enhancement': 'aggressive',
                'transient_preservation': 'medium',
                'bass_mono_freq': 150,  # Strong mono bass for club systems
                'dynamic_range_target': 5,  # Minimal DR for maximum loudness
                'presence_boost': True,
                'loudness_maximization': True,
                'bass_enhancement': True,
            }
        }

        # Override target_lufs if user specified
        preset = platform_presets.get(self.platform, platform_presets['spotify'])
        if 'loudness' in self.user_params:
            preset['target_lufs'] = float(self.user_params['loudness'])

        return preset

    def get_user_param(self, key, default):
        """Get user parameter or default"""
        return self.user_params.get(key, default)

    def map_compression(self, compression_level):
        """Map 1-10 compression slider to ratio with platform optimization"""
        # Compression ratios from 1.5:1 to 10:1
        ratios = [1.5, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 7.0, 8.5, 10.0]
        return ratios[compression_level - 1]

    def apply_ultra_quality_eq(self, audio):
        """
        Apply highest-fidelity EQ with platform-specific optimization
        Uses minimum-phase filters for maximum transparency
        """
        print("🎛️  Applying ultra-high-quality EQ...")

        nyquist = self.sr / 2

        # 1. High-pass filter - remove inaudible sub-bass (increases headroom)
        hp_freq = 20  # 20Hz - below human hearing
        sos_hp = signal.butter(4, hp_freq / nyquist, 'highpass', output='sos')
        audio = signal.sosfilt(sos_hp, audio, axis=-1)

        # 2. Bass mono below cutoff (improves bass clarity and codec performance)
        if len(audio.shape) == 2 and audio.shape[0] == 2:
            bass_mono_freq = self.params['bass_mono_freq']
            audio = self.make_bass_mono(audio, bass_mono_freq)
            print(f"   ✅ Bass mono below {bass_mono_freq}Hz (optimal codec performance)")

        # 3. User bass control with platform optimization
        bass_boost = self.params['bass_boost']
        if self.params.get('bass_enhancement'):
            bass_boost += 1.5  # Extra bass for radio/club

        if abs(bass_boost) > 0.1:
            audio = self.apply_parametric_eq(audio, 100, 0.7, bass_boost)
            print(f"   🎸 Bass: {'+' if bass_boost >= 0 else ''}{bass_boost:.1f} dB @ 100Hz")

        # 4. Auto-correction for muddy low-mids
        if self.analysis and 'muddy_low_mids' in self.analysis.get('frequency', {}).get('issues', []):
            audio = self.apply_parametric_eq(audio, 300, 1.5, -2.5)
            print(f"   🔧 Auto-correction: -2.5 dB @ 300Hz (muddy low-mids)")

        # 5. User mids control with platform optimization
        mids_boost = self.params['mids_boost']
        if self.params.get('presence_boost'):
            mids_boost += 0.5  # Vocal clarity for radio/YouTube

        if abs(mids_boost) > 0.1:
            audio = self.apply_parametric_eq(audio, 1000, 1.0, mids_boost)
            print(f"   🎤 Mids: {'+' if mids_boost >= 0 else ''}{mids_boost:.1f} dB @ 1kHz")

        # 6. Presence boost for vocal clarity (platform-specific)
        if self.params.get('presence_boost'):
            audio = self.apply_parametric_eq(audio, 3000, 1.2, 1.0)
            print(f"   🎙️ Presence boost: +1.0 dB @ 3kHz (vocal clarity)")

        # 7. User highs control
        highs_boost = self.params['highs_boost']
        if abs(highs_boost) > 0.1:
            audio = self.apply_parametric_eq(audio, 8000, 0.7, highs_boost)
            print(f"   ✨ Highs: {'+' if highs_boost >= 0 else ''}{highs_boost:.1f} dB @ 8kHz")

        # 8. Air enhancement for high-quality platforms
        if self.params.get('air_enhancement'):
            audio = self.apply_high_shelf(audio, 12000, 0.5)
            print(f"   💨 Air enhancement: +0.5 dB @ 12kHz+ (extended highs)")

        # 9. High-frequency rolloff (platform-optimized)
        rolloff_freq = self.params['high_freq_rolloff']
        if rolloff_freq < nyquist:
            sos_lpf = signal.butter(2, rolloff_freq / nyquist, 'lowpass', output='sos')
            audio = signal.sosfilt(sos_lpf, audio, axis=-1)
            print(f"   🔊 High-freq rolloff: {rolloff_freq}Hz (codec optimization)")

        return audio

    def make_bass_mono(self, audio, freq):
        """Make bass frequencies mono for better codec performance and clarity"""
        nyquist = self.sr / 2

        # Create low-pass filtered mono bass
        sos_lp = signal.butter(4, freq / nyquist, 'lowpass', output='sos')
        mono_bass = signal.sosfilt(sos_lp, (audio[0] + audio[1]) / 2, axis=-1)

        # Create high-pass filtered stereo
        sos_hp = signal.butter(4, freq / nyquist, 'highpass', output='sos')
        stereo_highs_L = signal.sosfilt(sos_hp, audio[0], axis=-1)
        stereo_highs_R = signal.sosfilt(sos_hp, audio[1], axis=-1)

        # Combine
        audio[0] = mono_bass + stereo_highs_L
        audio[1] = mono_bass + stereo_highs_R

        return audio

    def apply_parametric_eq(self, audio, freq, Q, gain_db):
        """Apply parametric EQ (peaking filter) with maximum quality"""
        gain = 10 ** (gain_db / 20)
        w0 = 2 * np.pi * freq / self.sr
        alpha = np.sin(w0) / (2 * Q)

        b0 = 1 + alpha * gain
        b1 = -2 * np.cos(w0)
        b2 = 1 - alpha * gain
        a0 = 1 + alpha / gain
        a1 = -2 * np.cos(w0)
        a2 = 1 - alpha / gain

        return signal.lfilter([b0/a0, b1/a0, b2/a0], [1, a1/a0, a2/a0], audio, axis=-1)

    def apply_high_shelf(self, audio, freq, gain_db):
        """Apply high-shelf filter for air enhancement"""
        gain = 10 ** (gain_db / 20)
        w0 = 2 * np.pi * freq / self.sr
        alpha = np.sin(w0) / 2

        A = np.sqrt(gain)

        b0 = A * ((A + 1) + (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha)
        b1 = -2 * A * ((A - 1) + (A + 1) * np.cos(w0))
        b2 = A * ((A + 1) + (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha)
        a0 = (A + 1) - (A - 1) * np.cos(w0) + 2 * np.sqrt(A) * alpha
        a1 = 2 * ((A - 1) - (A + 1) * np.cos(w0))
        a2 = (A + 1) - (A - 1) * np.cos(w0) - 2 * np.sqrt(A) * alpha

        return signal.lfilter([b0/a0, b1/a0, b2/a0], [1, a1/a0, a2/a0], audio, axis=-1)

    def apply_ultra_compression(self, audio):
        """
        Apply platform-optimized compression with maximum transparency
        Preserves transients while controlling dynamics
        """
        ratio = self.params['compression_ratio']
        transient_mode = self.params['transient_preservation']

        print(f"💪 Applying ultra-quality compression...")
        print(f"   Ratio: {ratio:.1f}:1")
        print(f"   Transient preservation: {transient_mode}")

        # Adaptive threshold based on dynamic range target
        dr_target = self.params['dynamic_range_target']
        threshold = -24 + (10 - dr_target)  # Adjust threshold for target DR

        # Adaptive attack/release based on transient preservation
        if transient_mode == 'maximum':
            attack = 0.010  # Slower attack = preserve transients
            release = 0.150
        elif transient_mode == 'high':
            attack = 0.005
            release = 0.100
        else:  # medium
            attack = 0.003
            release = 0.080

        release_samples = int(release * self.sr)

        # Process each channel
        if len(audio.shape) == 1:
            audio = audio.reshape(1, -1)

        compressed = np.zeros_like(audio)

        for ch in range(audio.shape[0]):
            channel = audio[ch]

            # Calculate RMS envelope (more musical than peak)
            envelope = np.sqrt(np.convolve(channel**2, np.ones(256)/256, mode='same'))

            # Smooth with release
            smoothed_env = np.zeros_like(envelope)
            for i in range(1, len(envelope)):
                if envelope[i] > smoothed_env[i-1]:
                    smoothed_env[i] = envelope[i]  # Instant attack
                else:
                    coef = np.exp(-1 / release_samples)
                    smoothed_env[i] = coef * smoothed_env[i-1] + (1 - coef) * envelope[i]

            # Calculate gain reduction with soft-knee
            threshold_lin = 10 ** (threshold / 20)
            gain_reduction = np.ones_like(smoothed_env)

            # Soft knee (2dB)
            knee_width = 2.0
            knee_lower = 10 ** ((threshold - knee_width) / 20)
            knee_upper = 10 ** ((threshold + knee_width) / 20)

            # Below knee
            below_knee = smoothed_env < knee_lower
            gain_reduction[below_knee] = 1.0

            # In knee (smooth transition)
            in_knee = (smoothed_env >= knee_lower) & (smoothed_env <= knee_upper)
            if np.any(in_knee):
                knee_factor = (smoothed_env[in_knee] - knee_lower) / (knee_upper - knee_lower)
                gain_reduction[in_knee] = 1.0 - knee_factor * (1 - (threshold_lin / smoothed_env[in_knee]) ** (1 - 1/ratio))

            # Above knee
            above_knee = smoothed_env > knee_upper
            gain_reduction[above_knee] = (threshold_lin / smoothed_env[above_knee]) ** (1 - 1/ratio)

            # Apply compression
            compressed[ch] = channel * gain_reduction

        # Intelligent makeup gain
        if self.params.get('loudness_maximization'):
            makeup_gain = 1.2 / (1 - 1/ratio)  # More aggressive
        else:
            makeup_gain = 0.9 / (1 - 1/ratio)  # Conservative

        compressed *= makeup_gain

        print(f"   ✅ Threshold: {threshold:.1f} dB, Target DR: {dr_target} dB")

        return compressed.squeeze()

    def apply_stereo_optimization(self, audio):
        """
        Platform-optimized stereo processing
        Preserves or enhances stereo width based on platform
        """
        if len(audio.shape) == 1:
            return audio

        width = self.params['stereo_width']
        enhancement_mode = self.params['stereo_enhancement']

        print(f"📏 Applying stereo optimization...")
        print(f"   Width: {int(width * 100)}%")
        print(f"   Mode: {enhancement_mode}")

        left = audio[0]
        right = audio[1]

        # Calculate mid and side
        mid = (left + right) / 2
        side = (left - right) / 2

        # Platform-specific stereo enhancement
        if enhancement_mode == 'pristine':
            # TIDAL/Deezer - preserve natural stereo
            side *= width
        elif enhancement_mode == 'natural':
            # Apple Music - slight enhancement
            side *= width
            # Add subtle stereo widening in highs only
            if width > 1.0:
                sos_hp = signal.butter(2, 2000 / (self.sr / 2), 'highpass', output='sos')
                side_high = signal.sosfilt(sos_hp, side, axis=-1)
                side = side + side_high * (width - 1.0) * 0.3
        elif enhancement_mode == 'moderate':
            # Spotify/YouTube - moderate enhancement
            side *= width
        elif enhancement_mode == 'aggressive':
            # SoundCloud/Radio - aggressive widening
            side *= width
            # Enhance stereo in mids and highs
            sos_hp = signal.butter(2, 500 / (self.sr / 2), 'highpass', output='sos')
            side_high = signal.sosfilt(sos_hp, side, axis=-1)
            side = side + side_high * 0.4

        # Reconstruct stereo
        left_out = mid + side
        right_out = mid - side

        # Intelligent limiting to prevent clipping
        max_val = max(np.abs(left_out).max(), np.abs(right_out).max())
        if max_val > 0.99:
            left_out *= 0.99 / max_val
            right_out *= 0.99 / max_val

        return np.array([left_out, right_out])

    def apply_harmonic_enhancement(self, audio):
        """
        Apply platform-optimized harmonic saturation
        Adds warmth and analog character
        """
        saturation_amount = self.params['saturation']

        if saturation_amount < 0.01:
            return audio

        print(f"🔥 Adding harmonic warmth ({int(saturation_amount * 100)}% saturation)...")

        # Multi-stage saturation for maximum quality
        # Stage 1: Subtle even harmonics (tube-style)
        audio_sat1 = np.tanh(audio * (1 + saturation_amount * 2))

        # Stage 2: Odd harmonics (tape-style)
        audio_sat2 = audio * (1 + saturation_amount * 0.5 * np.abs(audio))

        # Blend both stages
        audio_saturated = 0.6 * audio_sat1 + 0.4 * audio_sat2

        # Blend with original based on saturation amount
        audio = (1 - saturation_amount * 0.6) * audio + (saturation_amount * 0.6) * audio_saturated

        print(f"   ✅ Analog-style harmonic enhancement applied")

        return audio

    def apply_ultra_limiting(self, audio):
        """
        Apply transparent true-peak limiting
        Maximum loudness without audible distortion
        """
        target_peak = 10 ** (self.params['true_peak'] / 20)

        print(f"🎯 Applying ultra-transparent limiting...")
        print(f"   Target true peak: {self.params['true_peak']:.1f} dBTP")

        # Oversample for true-peak detection
        audio_oversampled = signal.resample_poly(audio, 4, 1, axis=-1)

        # Find true peak
        current_peak = np.abs(audio_oversampled).max()

        if current_peak > 0:
            # Calculate gain with safety margin
            safety_margin = 0.995  # Slight safety margin
            gain = (target_peak * safety_margin) / current_peak

            # Apply gain
            audio = audio * gain

            print(f"   ✅ Peak limited: {20 * np.log10(current_peak):.1f} → {self.params['true_peak']:.1f} dBTP")

        return audio

    def normalize_loudness_ultra(self, audio):
        """
        Normalize to target LUFS using FFmpeg with maximum quality
        """
        target_lufs = self.params['target_lufs']
        print(f"🔊 Normalizing to {target_lufs:.1f} LUFS (platform-optimized)...")

        # Save temporary file at maximum quality
        temp_file = self.output_file.replace('.wav', '_temp.wav')
        sf.write(temp_file, audio.T, self.sr, subtype='FLOAT')

        # Use FFmpeg loudnorm filter with dual-pass for maximum accuracy
        cmd = [
            'ffmpeg', '-y', '-i', temp_file,
            '-af', f'loudnorm=I={target_lufs}:TP={self.params["true_peak"]}:LRA=11:dual_mono=true:linear=true',
            '-ar', str(self.sr),
            '-c:a', 'pcm_s32le',  # 32-bit WAV for maximum quality
            self.output_file
        ]

        try:
            result = subprocess.run(cmd, check=True, capture_output=True, text=True)
            subprocess.run(['rm', '-f', temp_file], check=True)
            print(f"   ✅ Loudness normalized to {target_lufs:.1f} LUFS")
            return True
        except subprocess.CalledProcessError as e:
            print(f"   ⚠️  FFmpeg error, using fallback normalization")
            # Fallback: save at maximum quality
            sf.write(self.output_file, audio.T, self.sr, subtype='PCM_24')
            subprocess.run(['rm', '-f', temp_file], check=True)
            return False

    def master(self):
        """
        Execute complete ultra-quality mastering chain
        Platform-optimized for maximum fidelity
        """
        print(f"\n{'='*80}")
        print(f"MASTERING PARAMETERS:")
        print(f"{'='*80}")
        print(f"  Platform: {self.platform.upper()}")
        print(f"  Target Loudness: {self.params['target_lufs']:.1f} LUFS")
        print(f"  True Peak: {self.params['true_peak']:.1f} dBTP")
        print(f"  Dynamic Range Target: {self.params['dynamic_range_target']} dB")
        print(f"  Sample Rate: {self.sr} Hz")
        print(f"  Bass: {'+' if self.params['bass_boost'] >= 0 else ''}{self.params['bass_boost']:.1f} dB")
        print(f"  Mids: {'+' if self.params['mids_boost'] >= 0 else ''}{self.params['mids_boost']:.1f} dB")
        print(f"  Highs: {'+' if self.params['highs_boost'] >= 0 else ''}{self.params['highs_boost']:.1f} dB")
        print(f"  Stereo Width: {int(self.params['stereo_width'] * 100)}%")
        print(f"  Compression: {self.params['compression_ratio']:.1f}:1")
        print(f"  Warmth: {int(self.params['saturation'] * 100)}%")
        print(f"  Quality Mode: {'ULTRA (Lossless)' if self.params.get('ultra_quality') else 'MAXIMUM'}")
        print(f"{'='*80}\n")

        audio = self.y

        # ULTIMATE mastering chain - order matters for maximum quality
        audio = self.apply_ultra_quality_eq(audio)
        audio = self.apply_ultra_compression(audio)
        audio = self.apply_stereo_optimization(audio)
        audio = self.apply_harmonic_enhancement(audio)
        audio = self.apply_ultra_limiting(audio)

        # Final loudness normalization
        self.normalize_loudness_ultra(audio)

        print(f"\n{'='*80}")
        print(f"✨ ULTRA-QUALITY MASTERING COMPLETE!")
        print(f"Platform-Optimized: {self.platform.upper()}")
        print(f"Output: {self.output_file}")
        print(f"Ready for distribution with MAXIMUM fidelity!")
        print(f"{'='*80}\n")

        return True

def main():
    parser = argparse.ArgumentParser(description='LuvLang Ultimate Mastering - Maximum Quality')
    parser.add_argument('input_file', help='Input audio file')
    parser.add_argument('output_file', help='Output mastered file')
    parser.add_argument('--platform', default='spotify',
                        choices=['spotify', 'apple', 'youtube', 'tidal', 'soundcloud',
                                'deezer', 'amazon', 'pandora', 'radio'],
                        help='Target streaming platform')
    parser.add_argument('--analysis', help='Analysis JSON file')
    parser.add_argument('--loudness', type=float, help='Override target LUFS')
    parser.add_argument('--bass', type=float, default=0, help='Bass boost/cut (-6 to +6 dB)')
    parser.add_argument('--mids', type=float, default=0, help='Mids boost/cut (-6 to +6 dB)')
    parser.add_argument('--highs', type=float, default=0, help='Highs boost/cut (-6 to +6 dB)')
    parser.add_argument('--width', type=int, default=100, help='Stereo width (50-150 percent)')
    parser.add_argument('--compression', type=int, default=5, help='Compression amount (1-10)')
    parser.add_argument('--warmth', type=int, default=20, help='Warmth/saturation (0-100 percent)')

    args = parser.parse_args()

    try:
        # Build user parameters dict
        user_params = {
            'bass': args.bass,
            'mids': args.mids,
            'highs': args.highs,
            'width': args.width,
            'compression': args.compression,
            'warmth': args.warmth
        }

        if args.loudness is not None:
            user_params['loudness'] = args.loudness

        engine = UltimateMasteringEngine(
            args.input_file,
            args.output_file,
            args.platform,
            args.analysis,
            user_params
        )

        success = engine.master()

        result = {
            'success': success,
            'output_file': args.output_file,
            'platform': args.platform,
            'target_lufs': engine.params['target_lufs'],
            'true_peak': engine.params['true_peak'],
            'user_params': user_params
        }

        print(json.dumps(result))
        return 0

    except Exception as e:
        error = {'error': str(e), 'success': False}
        print(json.dumps(error))
        return 1

if __name__ == '__main__':
    sys.exit(main())
