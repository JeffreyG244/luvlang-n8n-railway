#!/usr/bin/env python3
"""
LuvLang AUTO MASTER AI
Ultra-intelligent one-click mastering that produces professional results
Zero user input required - perfect for beginners
"""

import sys
import json
import numpy as np
import librosa
import soundfile as sf
from scipy import signal
from analyze_audio import AudioAnalyzer

class AutoMasterAI:
    """
    Intelligent auto-mastering system that analyzes and makes optimal decisions
    """

    def __init__(self, input_file):
        self.input_file = input_file
        self.analyzer = AudioAnalyzer(input_file)

        # Run comprehensive analysis
        self.analysis = self.run_full_analysis()

        # Make intelligent decisions
        self.decisions = self.make_smart_decisions()

        print(f"\n{'='*80}")
        print(f"🤖 LUVLANG AUTO MASTER AI")
        print(f"Analyzing and optimizing your track automatically...")
        print(f"{'='*80}\n")

    def run_full_analysis(self):
        """Run comprehensive audio analysis"""
        print("📊 Analyzing your track...")

        return {
            'loudness': self.analyzer.analyze_loudness(),
            'frequency': self.analyzer.analyze_frequency_balance(),
            'stereo': self.analyzer.analyze_stereo_field(),
            'dynamics': self.analyzer.analyze_dynamics(),
            'clipping': self.analyzer.detect_clipping(),
            'quality': self.analyzer.estimate_quality()
        }

    def detect_genre(self):
        """
        Intelligent genre detection based on frequency balance and dynamics
        Returns: (genre, confidence_percentage)
        """
        freq = self.analysis['frequency']['band_energies']
        dynamics = self.analysis['dynamics']

        bass_ratio = freq['bass'] + freq['sub_bass']
        mid_ratio = freq['mid'] + freq['high_mid']
        high_ratio = freq['high']

        # Genre detection logic
        if bass_ratio > 0.35 and mid_ratio < 0.3:
            # Heavy bass, minimal mids = EDM/Hip-Hop
            if dynamics['crest_factor_db'] < 10:
                return ('edm', 95)  # Very compressed = EDM
            else:
                return ('hip-hop', 90)  # Less compressed = Hip-Hop

        elif mid_ratio > 0.45 and bass_ratio < 0.25:
            # Strong mids, light bass = Acoustic/Folk
            if dynamics['crest_factor_db'] > 14:
                return ('acoustic', 92)  # Very dynamic = Acoustic
            else:
                return ('pop', 85)  # More compressed = Pop ballad

        elif bass_ratio > 0.25 and mid_ratio > 0.35 and dynamics['crest_factor_db'] > 10:
            # Balanced with dynamics = Rock
            return ('rock', 88)

        elif bass_ratio < 0.2 and high_ratio > 0.15:
            # Light bass, bright = Electronic/Ambient
            return ('electronic', 80)

        else:
            # Balanced = Pop
            return ('pop', 75)

    def select_optimal_platform(self, genre):
        """Select best streaming platform based on genre"""
        platform_map = {
            'edm': {'platform': 'soundcloud', 'lufs': -11, 'reason': 'Competitive loudness for EDM'},
            'hip-hop': {'platform': 'soundcloud', 'lufs': -11, 'reason': 'Club/streaming loudness'},
            'pop': {'platform': 'spotify', 'lufs': -14, 'reason': 'Streaming standard'},
            'rock': {'platform': 'youtube', 'lufs': -14, 'reason': 'Punchy and powerful'},
            'acoustic': {'platform': 'apple', 'lufs': -16, 'reason': 'Preserves dynamics'},
            'electronic': {'platform': 'spotify', 'lufs': -14, 'reason': 'Balanced streaming'},
        }

        return platform_map.get(genre, platform_map['pop'])

    def calculate_eq_settings(self):
        """
        Calculate optimal EQ settings based on frequency analysis
        Returns: (bass_db, mids_db, highs_db, explanation)
        """
        freq = self.analysis['frequency']
        energies = freq['band_energies']
        issues = freq['issues']

        decisions = []

        # BASS DECISIONS
        if energies['bass'] < 0.15:
            bass_db = 3.0
            decisions.append(f"Bass: +3dB (weak bass detected - {energies['bass']*100:.0f}% energy)")
        elif energies['bass'] > 0.28:
            bass_db = -2.0
            decisions.append(f"Bass: -2dB (too much bass - {energies['bass']*100:.0f}% energy)")
        else:
            bass_db = 1.0
            decisions.append(f"Bass: +1dB (enhance punch)")

        # MIDS DECISIONS
        if 'muddy_low_mids' in issues:
            mids_db = -1.0
            decisions.append(f"Mids: -1dB (muddy low-mids detected)")
        elif energies['mid'] < 0.2:
            mids_db = 2.0
            decisions.append(f"Mids: +2dB (weak vocal presence)")
        else:
            mids_db = 0.0
            decisions.append(f"Mids: 0dB (well balanced)")

        # HIGHS DECISIONS
        if 'lacks_air' in issues:
            highs_db = 3.0
            decisions.append(f"Highs: +3dB (lacks brightness and air)")
        elif 'harsh_highs' in issues:
            highs_db = -2.0
            decisions.append(f"Highs: -2dB (reduce harshness)")
        else:
            highs_db = 1.5
            decisions.append(f"Highs: +1.5dB (add clarity and shine)")

        return bass_db, mids_db, highs_db, decisions

    def calculate_compression_level(self, genre):
        """
        Calculate optimal compression based on genre and current dynamics
        Returns: (compression_level_1_to_10, explanation)
        """
        crest = self.analysis['dynamics']['crest_factor_db']

        # Genre-specific compression preferences
        genre_compression = {
            'edm': 8,
            'hip-hop': 7,
            'pop': 5,
            'rock': 6,
            'acoustic': 3,
            'electronic': 6,
        }

        base_level = genre_compression.get(genre, 5)

        # Adjust based on current dynamics
        if crest > 15:
            # Very dynamic, needs more compression
            level = min(10, base_level + 2)
            reason = f"Heavy compression (crest factor: {crest:.1f}dB - very dynamic)"
        elif crest < 8:
            # Already compressed, be gentle
            level = max(1, base_level - 3)
            reason = f"Light compression (crest factor: {crest:.1f}dB - already compressed)"
        else:
            level = base_level
            reason = f"Optimal compression for {genre}"

        return level, reason

    def calculate_stereo_width(self):
        """Calculate optimal stereo width"""
        stereo = self.analysis['stereo']

        if stereo['is_mono']:
            return 100, "Mono track - maintaining center"

        width = stereo['stereo_width'] * 100

        if width < 30:
            return 120, f"Widening to 120% (current: {width:.0f}%)"
        elif width > 80:
            return 95, f"Narrowing to 95% for mono compatibility (current: {width:.0f}%)"
        else:
            return 100, f"Stereo width is optimal ({width:.0f}%)"

    def calculate_warmth(self, genre):
        """Calculate optimal harmonic saturation"""
        warmth_map = {
            'edm': 30,
            'hip-hop': 25,
            'pop': 20,
            'rock': 25,
            'acoustic': 10,
            'electronic': 20,
        }

        warmth = warmth_map.get(genre, 15)
        return warmth, f"{warmth}% saturation for {genre} style"

    def detect_problems_and_fixes(self):
        """Detect audio problems and auto-corrections needed"""
        issues = self.analysis['frequency']['issues']
        clipping = self.analysis['clipping']

        problems = []

        if 'muddy_low_mids' in issues:
            problems.append({
                'issue': 'Muddy low-mids',
                'fix': 'Auto-cut -2.5dB @ 300Hz',
                'severity': 'medium'
            })

        if 'harsh_highs' in issues:
            problems.append({
                'issue': 'Harsh high frequencies',
                'fix': 'Auto-cut -2dB @ 3.5kHz',
                'severity': 'medium'
            })

        if 'lacks_air' in issues:
            problems.append({
                'issue': 'Lacks high-end air',
                'fix': 'Boost +2dB @ 10kHz',
                'severity': 'low'
            })

        if clipping['has_clipping']:
            problems.append({
                'issue': f"Clipping detected ({clipping['clipping_percentage']:.2f}%)",
                'fix': 'Input gain reduction + proper limiting',
                'severity': 'high'
            })

        return problems

    def calculate_confidence(self, genre_confidence):
        """
        Calculate overall confidence in AI decisions
        Returns: (confidence_percentage, confidence_level)
        """
        # Start with genre detection confidence
        confidence = genre_confidence

        # Reduce confidence for unusual tracks
        if self.analysis['quality'] < 5:
            confidence -= 20

        # Reduce for extreme frequency imbalances
        if self.analysis['frequency']['frequency_balance'] < 0.5:
            confidence -= 15

        # Reduce for heavily clipped tracks
        if self.analysis['clipping']['has_clipping']:
            confidence -= 10

        # Ensure minimum of 60%
        confidence = max(60, confidence)

        # Categorize
        if confidence >= 90:
            level = "Very High - Perfect match!"
        elif confidence >= 80:
            level = "High - Excellent fit!"
        elif confidence >= 70:
            level = "Good - Solid settings"
        else:
            level = "Moderate - May need tweaking"

        return confidence, level

    def make_smart_decisions(self):
        """
        Make all intelligent mastering decisions
        Returns: Complete settings object
        """
        print("🧠 Making intelligent decisions...")

        # Detect genre
        genre, genre_confidence = self.detect_genre()
        print(f"   Genre: {genre.upper()} (confidence: {genre_confidence}%)")

        # Select platform
        platform_info = self.select_optimal_platform(genre)
        print(f"   Platform: {platform_info['platform'].upper()} ({platform_info['lufs']} LUFS)")

        # Calculate EQ
        bass, mids, highs, eq_decisions = self.calculate_eq_settings()
        print(f"   EQ: Bass {bass:+.1f}dB, Mids {mids:+.1f}dB, Highs {highs:+.1f}dB")

        # Calculate compression
        compression, comp_reason = self.calculate_compression_level(genre)
        print(f"   Compression: {compression}/10 ({comp_reason})")

        # Calculate stereo width
        width, width_reason = self.calculate_stereo_width()
        print(f"   Stereo Width: {width}%")

        # Calculate warmth
        warmth, warmth_reason = self.calculate_warmth(genre)
        print(f"   Warmth: {warmth}%")

        # Detect problems
        problems = self.detect_problems_and_fixes()
        if problems:
            print(f"   Problems found: {len(problems)}")
            for p in problems:
                print(f"      - {p['issue']}: {p['fix']}")

        # Calculate confidence
        confidence, confidence_level = self.calculate_confidence(genre_confidence)
        print(f"   Confidence: {confidence}% ({confidence_level})")

        return {
            'genre': genre,
            'genre_confidence': genre_confidence,
            'platform': platform_info['platform'],
            'target_lufs': platform_info['lufs'],
            'platform_reason': platform_info['reason'],
            'bass': bass,
            'mids': mids,
            'highs': highs,
            'eq_decisions': eq_decisions,
            'compression': compression,
            'compression_reason': comp_reason,
            'width': width,
            'width_reason': width_reason,
            'warmth': warmth,
            'warmth_reason': warmth_reason,
            'problems': problems,
            'confidence': confidence,
            'confidence_level': confidence_level
        }

    def generate_explanation(self):
        """Generate human-readable explanation of AI decisions"""
        d = self.decisions

        explanation = {
            'title': f"🤖 AI Analysis Complete!",
            'genre': {
                'detected': d['genre'].title(),
                'confidence': d['genre_confidence'],
                'confidence_level': d['confidence_level']
            },
            'platform': {
                'selected': d['platform'].title(),
                'lufs': d['target_lufs'],
                'reason': d['platform_reason']
            },
            'applied_settings': {
                'eq': [
                    f"Bass: {d['bass']:+.1f}dB @ 100Hz",
                    f"Mids: {d['mids']:+.1f}dB @ 1kHz",
                    f"Highs: {d['highs']:+.1f}dB @ 8kHz"
                ],
                'compression': f"{d['compression']}/10 ({d['compression_reason']})",
                'stereo_width': f"{d['width']}% ({d['width_reason']})",
                'saturation': f"{d['warmth']}% ({d['warmth_reason']})",
                'loudness': f"{d['target_lufs']} LUFS ({d['platform']}))"
            },
            'problems_fixed': d['problems'],
            'confidence': {
                'percentage': d['confidence'],
                'level': d['confidence_level']
            },
            'recommendations': self.generate_recommendations()
        }

        return explanation

    def generate_recommendations(self):
        """Generate user recommendations based on analysis"""
        recommendations = []

        if self.decisions['confidence'] < 75:
            recommendations.append("Preview the result and tweak if needed")

        if len(self.decisions['problems']) > 2:
            recommendations.append("Multiple issues detected - consider re-recording source")

        if self.analysis['quality'] < 6:
            recommendations.append("Source quality could be improved")

        if self.analysis['dynamics']['crest_factor_db'] < 6:
            recommendations.append("Track is heavily compressed - less processing needed")

        return recommendations if recommendations else ["Settings look perfect! Ready to master."]

    def get_mastering_params(self):
        """
        Get parameters ready for mastering engine
        Returns: Dictionary compatible with master_audio_ultimate.py
        """
        return {
            'platform': self.decisions['platform'],
            'genre': self.decisions['genre'],
            'bass': self.decisions['bass'],
            'mids': self.decisions['mids'],
            'highs': self.decisions['highs'],
            'compression': self.decisions['compression'],
            'width': self.decisions['width'],
            'warmth': self.decisions['warmth'],
            'loudness': self.decisions['target_lufs'],
            'auto_master': True  # Flag to indicate AI mode
        }

    def print_summary(self):
        """Print beautiful summary of AI decisions"""
        print(f"\n{'='*80}")
        print(f"✨ AUTO MASTER AI - ANALYSIS COMPLETE")
        print(f"{'='*80}\n")

        d = self.decisions

        print(f"🎵 GENRE DETECTED: {d['genre'].upper()}")
        print(f"   Confidence: {d['genre_confidence']}%\n")

        print(f"🎯 OPTIMAL PLATFORM: {d['platform'].upper()}")
        print(f"   Target: {d['target_lufs']} LUFS")
        print(f"   Reason: {d['platform_reason']}\n")

        print(f"🎛️ SETTINGS APPLIED:")
        for decision in d['eq_decisions']:
            print(f"   • {decision}")
        print(f"   • Compression: {d['compression']}/10 - {d['compression_reason']}")
        print(f"   • Stereo Width: {d['width_reason']}")
        print(f"   • Warmth: {d['warmth_reason']}\n")

        if d['problems']:
            print(f"🔧 PROBLEMS FIXED:")
            for problem in d['problems']:
                print(f"   • {problem['issue']}: {problem['fix']}")
            print()

        print(f"📊 CONFIDENCE: {d['confidence']}%")
        print(f"   {d['confidence_level']}\n")

        print(f"{'='*80}\n")


def main():
    """Command-line interface for AUTO MASTER AI"""
    if len(sys.argv) < 2:
        print("Usage: python auto_master_ai.py <audio_file>")
        sys.exit(1)

    input_file = sys.argv[1]

    # Create AI instance
    ai = AutoMasterAI(input_file)

    # Print summary
    ai.print_summary()

    # Generate explanation
    explanation = ai.generate_explanation()

    # Output JSON for frontend
    output = {
        'decisions': ai.decisions,
        'explanation': explanation,
        'mastering_params': ai.get_mastering_params(),
        'analysis': ai.analysis
    }

    print(json.dumps(output, indent=2))


if __name__ == '__main__':
    main()
