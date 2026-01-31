/**
 * Vercel Serverless Function: Health Check
 * Endpoint: GET /api/health
 */

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.json({
        status: 'ok',
        service: 'luvlang-mastering-api',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        endpoints: {
            checkout: '/api/create-checkout-session',
            verify: '/api/verify-payment',
            webhook: '/api/stripe-webhook',
            apiKeys: '/api/api-keys',
            validateKey: '/api/validate-api-key'
        }
    });
};
