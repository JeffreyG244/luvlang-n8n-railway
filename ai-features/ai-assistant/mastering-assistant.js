/**
 * GENERATIVE AI MASTERING ASSISTANT
 *
 * Natural language interface for mastering:
 * User: "Make the vocals more present"
 * AI: Translates to +3dB @ 3.5kHz
 *
 * User: "It sounds muddy"
 * AI: Applies -2dB @ 250Hz, enables HPF
 *
 * Natural language processing for non-technical users
 */

class MasteringAssistant {
    constructor() {
        // Intent recognition patterns
        this.intents = {
            // Vocal adjustments
            'vocal-presence': {
                patterns: ['vocal', 'voice', 'singing', 'present', 'clarity', 'clear vocals'],
                action: 'boost-vocal-frequencies',
                params: { frequency: 3500, gain: +3, q: 0.7 }
            },
            'vocal-back': {
                patterns: ['vocal too loud', 'voice too forward', 'reduce vocal', 'vocals back'],
                action: 'reduce-vocal-frequencies',
                params: { frequency: 3500, gain: -2, q: 0.7 }
            },

            // Bass adjustments
            'more-bass': {
                patterns: ['more bass', 'boost bass', 'increase bass', 'bigger bass', 'fat bass'],
                action: 'boost-bass',
                params: { frequency: 80, gain: +3, q: 0.7 }
            },
            'less-bass': {
                patterns: ['less bass', 'reduce bass', 'decrease bass', 'thin bass'],
                action: 'reduce-bass',
                params: { frequency: 80, gain: -3, q: 0.7 }
            },
            'muddy': {
                patterns: ['muddy', 'boomy', 'woofy', 'unclear low', 'mud'],
                action: 'cut-mud',
                params: { frequency: 250, gain: -3, q: 1.0 }
            },

            // High-frequency adjustments
            'brighter': {
                patterns: ['brighter', 'more sparkle', 'add air', 'crisp', 'shine'],
                action: 'boost-highs',
                params: { frequency: 10000, gain: +2, q: 0.7 }
            },
            'darker': {
                patterns: ['darker', 'less bright', 'warmer', 'dull', 'reduce highs'],
                action: 'reduce-highs',
                params: { frequency: 8000, gain: -2, q: 0.7 }
            },
            'harsh': {
                patterns: ['harsh', 'brittle', 'piercing', 'sibilant', 'too bright'],
                action: 'tame-harshness',
                params: { frequency: 4000, gain: -3, q: 1.5 }
            },

            // Dynamics
            'louder': {
                patterns: ['louder', 'increase volume', 'more level', 'boost'],
                action: 'increase-gain',
                params: { gain: +3 }
            },
            'quieter': {
                patterns: ['quieter', 'decrease volume', 'less loud', 'reduce'],
                action: 'decrease-gain',
                params: { gain: -3 }
            },
            'more-punch': {
                patterns: ['more punch', 'punchier', 'more impact', 'harder'],
                action: 'increase-compression',
                params: { ratio: +1.0, attack: -5 }
            },
            'less-compressed': {
                patterns: ['less compressed', 'more dynamic', 'breathe', 'open up'],
                action: 'decrease-compression',
                params: { ratio: -1.0, release: +50 }
            },

            // Stereo
            'wider': {
                patterns: ['wider', 'more stereo', 'spread', 'spacious'],
                action: 'increase-width',
                params: { width: +20 }
            },
            'narrower': {
                patterns: ['narrower', 'mono', 'centered', 'focus'],
                action: 'decrease-width',
                params: { width: -20 }
            },

            // Overall
            'warmer': {
                patterns: ['warmer', 'warm', 'analog', 'vintage'],
                action: 'add-warmth',
                params: [
                    { frequency: 120, gain: +1, q: 0.7 },
                    { frequency: 8000, gain: -1, q: 0.7 }
                ]
            }
        };

        this.conversationHistory = [];
    }

    /**
     * Process natural language command
     * @param {string} command - User's natural language input
     * @returns {Object} Action to take
     */
    processCommand(command) {
        console.log(`[AI Assistant] Processing: "${command}"`);

        const lowerCommand = command.toLowerCase();

        // Match command to intent
        let matchedIntent = null;
        let highestScore = 0;

        for (const [intentName, intent] of Object.entries(this.intents)) {
            const score = this.calculateMatchScore(lowerCommand, intent.patterns);
            if (score > highestScore) {
                highestScore = score;
                matchedIntent = { name: intentName, ...intent };
            }
        }

        if (!matchedIntent || highestScore < 0.5) {
            console.log('[AI Assistant] No clear intent matched');
            return {
                success: false,
                message: "I'm not sure what you mean. Try phrases like 'make vocals more present' or 'add more bass'."
            };
        }

        console.log(`[AI Assistant] Matched intent: ${matchedIntent.name} (score: ${highestScore})`);

        // Generate response
        const response = this.generateResponse(matchedIntent);

        // Store in history
        this.conversationHistory.push({
            command,
            intent: matchedIntent.name,
            response,
            timestamp: Date.now()
        });

        return response;
    }

    /**
     * Calculate match score for patterns
     */
    calculateMatchScore(command, patterns) {
        let bestScore = 0;

        for (const pattern of patterns) {
            if (command.includes(pattern)) {
                // Exact phrase match
                bestScore = Math.max(bestScore, 1.0);
            } else {
                // Word overlap match
                const commandWords = command.split(' ');
                const patternWords = pattern.split(' ');
                const overlap = commandWords.filter(w => patternWords.includes(w)).length;
                const score = overlap / Math.max(commandWords.length, patternWords.length);
                bestScore = Math.max(bestScore, score);
            }
        }

        return bestScore;
    }

    /**
     * Generate response with actions
     */
    generateResponse(intent) {
        const actions = [];
        const explanations = [];

        switch (intent.action) {
            case 'boost-vocal-frequencies':
                actions.push({
                    type: 'eq-adjust',
                    band: '3.5kHz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                explanations.push(`Adding +${intent.params.gain}dB at 3.5kHz to bring vocals forward`);
                break;

            case 'reduce-vocal-frequencies':
                actions.push({
                    type: 'eq-adjust',
                    band: '3.5kHz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                explanations.push(`Reducing 3.5kHz by ${intent.params.gain}dB to pull vocals back`);
                break;

            case 'boost-bass':
                actions.push({
                    type: 'eq-adjust',
                    band: '80Hz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                explanations.push(`Boosting bass at 80Hz by +${intent.params.gain}dB`);
                break;

            case 'reduce-bass':
                actions.push({
                    type: 'eq-adjust',
                    band: '80Hz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                explanations.push(`Reducing bass at 80Hz by ${intent.params.gain}dB`);
                break;

            case 'cut-mud':
                actions.push({
                    type: 'eq-adjust',
                    band: '250Hz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                actions.push({
                    type: 'hpf-enable',
                    frequency: 30
                });
                explanations.push(`Cutting mud at 250Hz by ${intent.params.gain}dB`);
                explanations.push(`Enabling high-pass filter at 30Hz to clean up sub-bass`);
                break;

            case 'boost-highs':
                actions.push({
                    type: 'eq-adjust',
                    band: '10kHz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                explanations.push(`Adding air and sparkle with +${intent.params.gain}dB at 10kHz`);
                break;

            case 'reduce-highs':
                actions.push({
                    type: 'eq-adjust',
                    band: '8kHz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                explanations.push(`Warming up sound by reducing 8kHz by ${intent.params.gain}dB`);
                break;

            case 'tame-harshness':
                actions.push({
                    type: 'eq-adjust',
                    band: '4kHz',
                    gain: intent.params.gain,
                    q: intent.params.q
                });
                actions.push({
                    type: 'de-ess-enable'
                });
                explanations.push(`Taming harshness by reducing 4kHz by ${intent.params.gain}dB`);
                explanations.push(`Enabling de-esser to control sibilance`);
                break;

            case 'increase-gain':
                actions.push({
                    type: 'master-gain',
                    gain: intent.params.gain
                });
                explanations.push(`Increasing master gain by +${intent.params.gain}dB`);
                break;

            case 'decrease-gain':
                actions.push({
                    type: 'master-gain',
                    gain: intent.params.gain
                });
                explanations.push(`Decreasing master gain by ${intent.params.gain}dB`);
                break;

            case 'increase-compression':
                actions.push({
                    type: 'compression-adjust',
                    parameter: 'ratio',
                    value: intent.params.ratio
                });
                actions.push({
                    type: 'compression-adjust',
                    parameter: 'attack',
                    value: intent.params.attack
                });
                explanations.push(`Adding punch with faster compression (ratio +${intent.params.ratio}, attack ${intent.params.attack}ms)`);
                break;

            case 'decrease-compression':
                actions.push({
                    type: 'compression-adjust',
                    parameter: 'ratio',
                    value: intent.params.ratio
                });
                actions.push({
                    type: 'compression-adjust',
                    parameter: 'release',
                    value: intent.params.release
                });
                explanations.push(`Opening up dynamics (ratio ${intent.params.ratio}, release +${intent.params.release}ms)`);
                break;

            case 'increase-width':
                actions.push({
                    type: 'stereo-width',
                    value: intent.params.width
                });
                explanations.push(`Widening stereo image by ${intent.params.width}%`);
                break;

            case 'decrease-width':
                actions.push({
                    type: 'stereo-width',
                    value: intent.params.width
                });
                explanations.push(`Narrowing stereo image by ${Math.abs(intent.params.width)}%`);
                break;

            case 'add-warmth':
                for (const param of intent.params) {
                    actions.push({
                        type: 'eq-adjust',
                        band: param.frequency + 'Hz',
                        gain: param.gain,
                        q: param.q
                    });
                }
                explanations.push('Adding warmth by boosting low-mids and reducing highs');
                break;

            default:
                explanations.push('Adjusting based on your request');
        }

        return {
            success: true,
            actions,
            explanations,
            message: explanations.join('. ') + '.'
        };
    }

    /**
     * Get conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Get help/examples
     */
    getHelp() {
        return {
            examples: [
                "Make the vocals more present",
                "Add more bass",
                "It sounds muddy",
                "Make it brighter",
                "Less compressed",
                "Wider stereo",
                "Warmer sound",
                "More punch",
                "The vocals are too loud",
                "Cut the harshness"
            ],
            tips: [
                "Use natural language - describe what you hear",
                "Be specific about what you want to change",
                "You can combine multiple requests",
                "I understand technical and non-technical terms"
            ]
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MasteringAssistant;
}
