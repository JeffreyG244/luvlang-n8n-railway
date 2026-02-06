/**
 * LUVLANG API CONFIGURATION
 * Loads settings from environment variables
 */

// Load .env file in development
import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

const config = {
    // Server
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
    isProd: process.env.NODE_ENV === 'production',

    // CORS
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],

    // Supabase
    supabase: {
        url: process.env.SUPABASE_URL || '',
        anonKey: process.env.SUPABASE_ANON_KEY || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || ''
    },

    // Stripe
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY || '',
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
        prices: {
            basic: process.env.STRIPE_PRICE_BASIC || '',
            professional: process.env.STRIPE_PRICE_PROFESSIONAL || '',
            studio: process.env.STRIPE_PRICE_STUDIO || ''
        }
    },

    // Security - NO fallback secrets; must be set via environment
    apiKeySecret: process.env.API_KEY_SECRET || '',
    jwtSecret: process.env.JWT_SECRET || '',

    // Rate limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 3600000, // 1 hour
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000
    },

    // Tier limits
    tiers: {
        free: {
            name: 'Free',
            requestsPerMonth: 100,
            audioMbPerMonth: 500,
            maxFileSizeMb: 50,
            batchSize: 1,
            features: {
                analyze: true,
                master: true,
                autoMaster: false,
                batch: false,
                priority: false
            },
            priceMonthly: 0,
            priceYearly: 0
        },
        pro: {
            name: 'Pro',
            requestsPerMonth: 1000,
            audioMbPerMonth: 5000,
            maxFileSizeMb: 200,
            batchSize: 10,
            features: {
                analyze: true,
                master: true,
                autoMaster: true,
                batch: true,
                priority: false
            },
            priceMonthly: 29,
            priceYearly: 290
        },
        studio: {
            name: 'Studio',
            requestsPerMonth: 10000,
            audioMbPerMonth: 50000,
            maxFileSizeMb: 500,
            batchSize: 50,
            features: {
                analyze: true,
                master: true,
                autoMaster: true,
                batch: true,
                priority: true
            },
            priceMonthly: 99,
            priceYearly: 990
        },
        enterprise: {
            name: 'Enterprise',
            requestsPerMonth: -1, // unlimited
            audioMbPerMonth: -1,
            maxFileSizeMb: 500,
            batchSize: -1,
            features: {
                analyze: true,
                master: true,
                autoMaster: true,
                batch: true,
                priority: true,
                dedicated: true
            },
            priceMonthly: 499,
            priceYearly: 4990
        }
    }
};

// Validation
export function validateConfig() {
    const errors = [];

    if (config.isProd) {
        if (!config.supabase.url) errors.push('SUPABASE_URL is required');
        if (!config.supabase.serviceKey) errors.push('SUPABASE_SERVICE_KEY is required');
        if (!config.stripe.secretKey) errors.push('STRIPE_SECRET_KEY is required');
        if (!config.apiKeySecret) errors.push('API_KEY_SECRET is required');
        if (!config.jwtSecret) errors.push('JWT_SECRET is required');
        if (!config.stripe.webhookSecret) errors.push('STRIPE_WEBHOOK_SECRET is required');
    }

    // Always validate secrets are not defaults
    if (!config.apiKeySecret) {
        console.warn('[Config] WARNING: API_KEY_SECRET not set. API key hashing disabled.');
    }
    if (!config.jwtSecret) {
        console.warn('[Config] WARNING: JWT_SECRET not set. JWT signing disabled.');
    }

    if (errors.length > 0) {
        console.error('Configuration errors:', errors);
        throw new Error(`Invalid configuration: ${errors.join(', ')}`);
    }

    return true;
}

export default config;
