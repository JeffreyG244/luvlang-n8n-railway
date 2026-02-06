/**
 * SUBSCRIPTION TIERS SYSTEM
 * Manage subscription plans, feature gating, usage tracking, and billing
 */

import { eventBus, Events } from '../core/event-bus.js';
import { appState } from '../core/app-state.js';
import { resolveContainer, showToast } from '../shared/utils.js';

// ============================================
// TIER DEFINITIONS
// ============================================

const SUBSCRIPTION_TIERS = {
    free: {
        id: 'free',
        name: 'Free',
        price: 0,
        priceId: null,
        description: 'Get started with professional mastering',
        limits: {
            tracksPerMonth: 5,
            storageMB: 100,
            maxFileSizeMB: 50,
            batchProcessing: false,
            maxBatchSize: 1,
            apiRequests: 100,
            collaborators: 0,
            presets: 3,
            customPresets: 0,
            exportFormats: ['mp3'],
            maxBitDepth: 16,
            maxSampleRate: 44100,
            aiAutoMaster: false,
            referenceMatching: false,
            multitrackMastering: false,
            advancedAnalytics: false,
            priorityProcessing: false,
            support: 'community'
        },
        features: [
            '5 tracks per month',
            '7-band parametric EQ',
            'Single-band compression',
            'Basic limiting',
            'MP3 export (16-bit)',
            'Community support'
        ],
        color: '#6b7280'
    },

    pro: {
        id: 'pro',
        name: 'Basic',
        price: 12.99,
        priceId: 'price_basic_per_track',
        description: 'Quick professional mastering',
        limits: {
            tracksPerMonth: 50,
            storageMB: 1000,
            maxFileSizeMB: 200,
            batchProcessing: true,
            maxBatchSize: 10,
            apiRequests: 1000,
            collaborators: 3,
            presets: 15,
            customPresets: 10,
            exportFormats: ['wav', 'mp3', 'flac'],
            maxBitDepth: 24,
            maxSampleRate: 48000,
            aiAutoMaster: true,
            referenceMatching: false,
            multitrackMastering: false,
            advancedAnalytics: true,
            priorityProcessing: false,
            support: 'email'
        },
        features: [
            'Intelligent auto-mastering',
            'Platform presets (Spotify, YouTube, etc.)',
            'High-quality WAV + MP3 export',
            'Basic loudness targeting'
        ],
        popular: true,
        color: '#00d4ff'
    },

    studio: {
        id: 'studio',
        name: 'Professional',
        price: 29.99,
        priceId: 'price_professional_per_track',
        description: 'Full manual control for precision mastering',
        limits: {
            tracksPerMonth: 500,
            storageMB: 10000,
            maxFileSizeMB: 500,
            batchProcessing: true,
            maxBatchSize: 50,
            apiRequests: 10000,
            collaborators: 10,
            presets: 'unlimited',
            customPresets: 'unlimited',
            exportFormats: ['wav', 'mp3', 'flac', 'aiff'],
            maxBitDepth: 32,
            maxSampleRate: 96000,
            aiAutoMaster: true,
            referenceMatching: true,
            multitrackMastering: true,
            advancedAnalytics: true,
            priorityProcessing: true,
            support: 'priority'
        },
        features: [
            'Everything in Basic',
            'Full 7-band parametric EQ',
            'Multiband compression',
            'Reference track matching',
            'M/S processing'
        ],
        color: '#b84fff'
    },

    enterprise: {
        id: 'enterprise',
        name: 'Studio',
        price: 59.99,
        priceId: 'price_studio_per_track',
        description: 'The complete mastering toolkit',
        limits: {
            tracksPerMonth: 'unlimited',
            storageMB: 'unlimited',
            maxFileSizeMB: 'unlimited',
            batchProcessing: true,
            maxBatchSize: 'unlimited',
            apiRequests: 'unlimited',
            collaborators: 'unlimited',
            presets: 'unlimited',
            customPresets: 'unlimited',
            exportFormats: ['wav', 'mp3', 'flac', 'aiff', 'dsd'],
            maxBitDepth: 32,
            maxSampleRate: 192000,
            aiAutoMaster: true,
            referenceMatching: true,
            multitrackMastering: true,
            advancedAnalytics: true,
            priorityProcessing: true,
            support: 'dedicated'
        },
        features: [
            'Everything in Professional',
            'Stem mastering',
            'Harmonic enhancement',
            'Spectral repair',
            'Codec preview',
            'PDF mastering report'
        ],
        color: '#ffd700'
    }
};

// ============================================
// SUBSCRIPTION MANAGER
// ============================================

class SubscriptionManager {
    constructor(supabaseClient, stripePublicKey) {
        this.supabase = supabaseClient;
        this.stripeKey = stripePublicKey;
        this.stripe = null;
        this.currentUser = null;
        this.currentSubscription = null;
        this.usage = null;

        this.init();
        // Initialized
    }

    /**
     * Initialize subscription manager
     */
    async init() {
        // Load Stripe if available
        if (this.stripeKey && typeof Stripe !== 'undefined') {
            this.stripe = Stripe(this.stripeKey);
        }

        // Get current user
        if (this.supabase) {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                this.currentUser = user;
                await this.loadSubscription();
                await this.loadUsage();
            }
        }
    }

    /**
     * Load current subscription
     */
    async loadSubscription() {
        if (!this.supabase || !this.currentUser) return;

        try {
            const { data, error } = await this.supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'active')
                .single();

            if (data) {
                this.currentSubscription = data;
                appState.set('subscription', data, false);
            } else {
                // Default to free tier
                this.currentSubscription = { tier: 'free', status: 'active' };
            }
        } catch (error) {
            console.error('[SubscriptionManager] Failed to load subscription:', error);
            this.currentSubscription = { tier: 'free', status: 'active' };
        }
    }

    /**
     * Load usage statistics
     */
    async loadUsage() {
        if (!this.supabase || !this.currentUser) return;

        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

        try {
            const { data } = await this.supabase
                .from('usage')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('period', currentMonth)
                .single();

            this.usage = data || {
                tracksProcessed: 0,
                storageUsedMB: 0,
                apiRequests: 0
            };

            appState.set('usage', this.usage, false);
        } catch (error) {
            console.error('[SubscriptionManager] Failed to load usage:', error);
        }
    }

    /**
     * Get current tier
     */
    getCurrentTier() {
        const tierId = this.currentSubscription?.tier || 'free';
        return SUBSCRIPTION_TIERS[tierId];
    }

    /**
     * Get tier limits
     */
    getLimits() {
        return this.getCurrentTier()?.limits || SUBSCRIPTION_TIERS.free.limits;
    }

    /**
     * Check if feature is available
     */
    hasFeature(featureName) {
        const limits = this.getLimits();

        switch (featureName) {
            case 'aiAutoMaster':
                return limits.aiAutoMaster;
            case 'referenceMatching':
                return limits.referenceMatching;
            case 'multitrackMastering':
                return limits.multitrackMastering;
            case 'batchProcessing':
                return limits.batchProcessing;
            case 'advancedAnalytics':
                return limits.advancedAnalytics;
            case 'collaboration':
                return limits.collaborators > 0;
            case 'customPresets':
                return limits.customPresets !== 0;
            case 'priorityProcessing':
                return limits.priorityProcessing;
            default:
                return true;
        }
    }

    /**
     * Check if user can perform action
     */
    canPerformAction(action) {
        const limits = this.getLimits();
        const usage = this.usage || {};

        switch (action) {
            case 'processTrack':
                if (limits.tracksPerMonth === 'unlimited') return { allowed: true };
                return {
                    allowed: (usage.tracksProcessed || 0) < limits.tracksPerMonth,
                    remaining: limits.tracksPerMonth - (usage.tracksProcessed || 0),
                    limit: limits.tracksPerMonth
                };

            case 'uploadFile':
                if (limits.storageMB === 'unlimited') return { allowed: true };
                return {
                    allowed: (usage.storageUsedMB || 0) < limits.storageMB,
                    remaining: limits.storageMB - (usage.storageUsedMB || 0),
                    limit: limits.storageMB
                };

            case 'apiRequest':
                if (limits.apiRequests === 'unlimited') return { allowed: true };
                return {
                    allowed: (usage.apiRequests || 0) < limits.apiRequests,
                    remaining: limits.apiRequests - (usage.apiRequests || 0),
                    limit: limits.apiRequests
                };

            case 'addCollaborator':
                if (limits.collaborators === 'unlimited') return { allowed: true };
                return {
                    allowed: (usage.collaborators || 0) < limits.collaborators,
                    remaining: limits.collaborators - (usage.collaborators || 0),
                    limit: limits.collaborators
                };

            default:
                return { allowed: true };
        }
    }

    /**
     * Check file size limit
     */
    checkFileSizeLimit(fileSizeMB) {
        const limits = this.getLimits();
        if (limits.maxFileSizeMB === 'unlimited') return { allowed: true };
        return {
            allowed: fileSizeMB <= limits.maxFileSizeMB,
            maxSize: limits.maxFileSizeMB
        };
    }

    /**
     * Get available export formats
     */
    getAvailableExportFormats() {
        return this.getLimits().exportFormats || ['mp3'];
    }

    /**
     * Get max bit depth
     */
    getMaxBitDepth() {
        return this.getLimits().maxBitDepth || 16;
    }

    /**
     * Get max sample rate
     */
    getMaxSampleRate() {
        return this.getLimits().maxSampleRate || 44100;
    }

    /**
     * Record usage
     */
    async recordUsage(action, amount = 1) {
        if (!this.supabase || !this.currentUser) return;

        const currentMonth = new Date().toISOString().slice(0, 7);

        try {
            // Upsert usage record
            const { data, error } = await this.supabase
                .from('usage')
                .upsert({
                    user_id: this.currentUser.id,
                    period: currentMonth,
                    [action]: (this.usage?.[action] || 0) + amount,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id,period'
                });

            // Update local usage
            if (!this.usage) this.usage = {};
            this.usage[action] = (this.usage[action] || 0) + amount;

            eventBus.emit(Events.STATE_CHANGE, { path: 'usage', value: this.usage });
        } catch (error) {
            console.error('[SubscriptionManager] Failed to record usage:', error);
        }
    }

    /**
     * Create checkout session
     */
    async createCheckoutSession(tierId) {
        if (!this.stripe) {
            throw new Error('Stripe not initialized');
        }

        const tier = SUBSCRIPTION_TIERS[tierId];
        if (!tier || !tier.priceId) {
            throw new Error('Invalid tier or custom pricing required');
        }

        try {
            const response = await fetch('/api/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: tier.priceId,
                    userId: this.currentUser?.id,
                    successUrl: `${window.location.origin}/subscription/success`,
                    cancelUrl: `${window.location.origin}/pricing`
                })
            });

            const session = await response.json();

            // Redirect to Stripe Checkout
            const { error } = await this.stripe.redirectToCheckout({
                sessionId: session.id
            });

            if (error) {
                throw error;
            }
        } catch (error) {
            console.error('[SubscriptionManager] Checkout failed:', error);
            throw error;
        }
    }

    /**
     * Manage subscription (Stripe portal)
     */
    async openCustomerPortal() {
        try {
            const response = await fetch('/api/create-portal-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.currentUser?.id,
                    returnUrl: window.location.href
                })
            });

            const session = await response.json();
            window.location.href = session.url;
        } catch (error) {
            console.error('[SubscriptionManager] Portal failed:', error);
            throw error;
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription() {
        try {
            const response = await fetch('/api/cancel-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: this.currentUser?.id,
                    subscriptionId: this.currentSubscription?.stripe_subscription_id
                })
            });

            const result = await response.json();

            if (result.success) {
                await this.loadSubscription();
                eventBus.emit(Events.STATE_CHANGE, { path: 'subscription', value: this.currentSubscription });
            }

            return result;
        } catch (error) {
            console.error('[SubscriptionManager] Cancel failed:', error);
            throw error;
        }
    }

    /**
     * Get all tiers for pricing page
     */
    getAllTiers() {
        return Object.values(SUBSCRIPTION_TIERS);
    }

    /**
     * Get upgrade options from current tier
     */
    getUpgradeOptions() {
        const currentTierId = this.currentSubscription?.tier || 'free';
        const tierOrder = ['free', 'pro', 'studio', 'enterprise'];
        const currentIndex = tierOrder.indexOf(currentTierId);

        return tierOrder
            .slice(currentIndex + 1)
            .map(id => SUBSCRIPTION_TIERS[id]);
    }

    /**
     * Feature gate wrapper
     */
    withFeatureGate(featureName, callback, fallback = null) {
        if (this.hasFeature(featureName)) {
            return callback();
        }

        // Show upgrade prompt
        eventBus.emit('subscription:upgrade-prompt', {
            feature: featureName,
            requiredTier: this.getRequiredTierForFeature(featureName)
        });

        return fallback;
    }

    /**
     * Get required tier for feature
     */
    getRequiredTierForFeature(featureName) {
        for (const [tierId, tier] of Object.entries(SUBSCRIPTION_TIERS)) {
            if (tier.limits[featureName]) {
                return tierId;
            }
        }
        return 'pro';
    }
}

// ============================================
// PRICING UI COMPONENT
// ============================================

class PricingUI {
    constructor(container, subscriptionManager) {
        this.container = resolveContainer(container);
        this.manager = subscriptionManager;

        if (this.container) {
            this.render();
        }
    }

    render() {
        const tiers = this.manager.getAllTiers();
        const currentTierId = this.manager.currentSubscription?.tier || 'free';

        this.container.innerHTML = `
            <div class="pricing-container">
                <div class="pricing-header">
                    <h2>Choose Your Plan</h2>
                    <p>Unlock professional mastering features</p>
                </div>

                <div class="pricing-grid">
                    ${tiers.map(tier => this.renderTierCard(tier, currentTierId)).join('')}
                </div>

                <div class="pricing-faq">
                    <h3>Frequently Asked Questions</h3>
                    <div class="faq-list">
                        ${this.renderFAQ()}
                    </div>
                </div>
            </div>
        `;

        this.bindEvents();
    }

    renderTierCard(tier, currentTierId) {
        const isCurrent = tier.id === currentTierId;
        const isPopular = tier.popular;
        const hasPrice = tier.price !== null;

        return `
            <div class="pricing-card ${isPopular ? 'popular' : ''} ${isCurrent ? 'current' : ''}"
                 style="--tier-color: ${tier.color}">
                ${isPopular ? '<div class="popular-badge">Most Popular</div>' : ''}
                ${isCurrent ? '<div class="current-badge">Current Plan</div>' : ''}

                <div class="card-header">
                    <h3>${tier.name}</h3>
                    <p class="tier-description">${tier.description}</p>
                </div>

                <div class="card-price">
                    ${hasPrice ? `
                        <span class="price-amount">$${tier.price}</span>
                        <span class="price-period">/track</span>
                    ` : `
                        <span class="price-custom">Custom Pricing</span>
                    `}
                </div>

                <ul class="feature-list">
                    ${tier.features.map(f => `
                        <li>
                            <span class="check-icon">✓</span>
                            <span>${f}</span>
                        </li>
                    `).join('')}
                </ul>

                <div class="card-action">
                    ${isCurrent ? `
                        <button class="btn btn-current" disabled>Current Plan</button>
                    ` : hasPrice ? `
                        <button class="btn btn-subscribe" data-tier="${tier.id}">
                            ${currentTierId === 'free' ? 'Start Free Trial' : 'Upgrade'}
                        </button>
                    ` : `
                        <button class="btn btn-contact" onclick="window.location.href='mailto:enterprise@luvlang.studio'">
                            Contact Sales
                        </button>
                    `}
                </div>
            </div>
        `;
    }

    renderFAQ() {
        const faqs = [
            {
                q: 'Can I cancel anytime?',
                a: 'Yes, you can cancel your subscription at any time. Your access continues until the end of your billing period.'
            },
            {
                q: 'What happens to my tracks if I downgrade?',
                a: 'Your processed tracks remain accessible. However, you may not be able to process new tracks beyond your new plan\'s limit.'
            },
            {
                q: 'Do you offer refunds?',
                a: 'We offer a 14-day money-back guarantee. If you\'re not satisfied, contact us for a full refund.'
            },
            {
                q: 'What payment methods do you accept?',
                a: 'We accept all major credit cards, debit cards, and PayPal through our secure Stripe payment system.'
            }
        ];

        return faqs.map(faq => `
            <div class="faq-item">
                <div class="faq-question">${faq.q}</div>
                <div class="faq-answer">${faq.a}</div>
            </div>
        `).join('');
    }

    bindEvents() {
        // Subscribe buttons
        this.container.querySelectorAll('.btn-subscribe').forEach(btn => {
            btn.addEventListener('click', async () => {
                const tierId = btn.dataset.tier;
                try {
                    await this.manager.createCheckoutSession(tierId);
                } catch (error) {
                    showToast('Failed to start checkout: ' + error.message, { type: 'error' });
                }
            });
        });
    }

    updatePrices() {
        // No-op: per-track pricing does not vary by billing period
    }
}

// ============================================
// UPGRADE PROMPT COMPONENT
// ============================================

class UpgradePrompt {
    constructor() {
        this.element = null;
        this.init();
    }

    init() {
        eventBus.on('subscription:upgrade-prompt', (data) => {
            this.show(data.feature, data.requiredTier);
        });
    }

    show(feature, requiredTier) {
        const tier = SUBSCRIPTION_TIERS[requiredTier];
        const featureNames = {
            aiAutoMaster: 'AI Auto-Master',
            referenceMatching: 'Reference Track Matching',
            multitrackMastering: 'Multitrack Mastering',
            batchProcessing: 'Batch Processing',
            advancedAnalytics: 'Advanced Analytics',
            collaboration: 'Collaboration',
            customPresets: 'Custom Presets'
        };

        const html = `
            <div class="upgrade-prompt-overlay">
                <div class="upgrade-prompt">
                    <button class="close-btn" onclick="this.closest('.upgrade-prompt-overlay').remove()">✕</button>
                    <div class="upgrade-icon">🔒</div>
                    <h3>Upgrade to Unlock</h3>
                    <p><strong>${featureNames[feature] || feature}</strong> requires the <span style="color: ${tier.color}">${tier.name}</span> plan or higher.</p>
                    <div class="upgrade-features">
                        <p>Upgrade to get:</p>
                        <ul>
                            ${tier.features.slice(0, 4).map(f => `<li>✓ ${f}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="upgrade-actions">
                        <button class="btn btn-primary" onclick="window.location.href='/pricing'">
                            View Plans - Starting at $${tier.price}/track
                        </button>
                        <button class="btn btn-secondary" onclick="this.closest('.upgrade-prompt-overlay').remove()">
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing prompt
        document.querySelector('.upgrade-prompt-overlay')?.remove();

        // Add new prompt
        document.body.insertAdjacentHTML('beforeend', html);
    }
}

// ============================================
// EXPORTS
// ============================================

// Create singleton instances
let subscriptionManager = null;
let pricingUI = null;
const upgradePrompt = new UpgradePrompt();

const initSubscription = (supabaseClient, stripeKey) => {
    subscriptionManager = new SubscriptionManager(supabaseClient, stripeKey);
    return subscriptionManager;
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SUBSCRIPTION_TIERS,
        SubscriptionManager,
        PricingUI,
        UpgradePrompt,
        initSubscription
    };
}

if (typeof window !== 'undefined') {
    window.SUBSCRIPTION_TIERS = SUBSCRIPTION_TIERS;
    window.SubscriptionManager = SubscriptionManager;
    window.PricingUI = PricingUI;
    window.initSubscription = initSubscription;
}

export {
    SUBSCRIPTION_TIERS,
    SubscriptionManager,
    PricingUI,
    UpgradePrompt,
    initSubscription
};
