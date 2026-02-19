/**
 * Vercel Serverless Function: Health Check
 * Endpoint: GET /api/health
 */

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
    'https://luvlangmastering.vercel.app',
    'https://luvlang-mastering.vercel.app',
    'https://www.luvlang.studio',
    'https://luvlang.studio',
    'https://luvlang.org',
    'https://www.luvlang.org',
    process.env.FRONTEND_URL
].filter(Boolean);

module.exports = async (req, res) => {
    const origin = req.headers.origin;
    if (ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.json({
        status: 'ok',
        service: 'luvlang-mastering-api',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
};
