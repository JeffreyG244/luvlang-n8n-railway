/**
 * Vercel Serverless Function: Stripe Webhook Handler
 * Endpoint: POST /api/stripe-webhook
 *
 * Configure in Stripe Dashboard: https://dashboard.stripe.com/webhooks
 * Webhook URL: https://your-domain.vercel.app/api/stripe-webhook
 * Events to listen for:
 *   - checkout.session.completed
 *   - charge.refunded
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Disable body parsing for raw webhook payload (Vercel-specific CJS config)
module.exports.config = {
    api: {
        bodyParser: false
    }
};

async function buffer(readable) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    // SECURITY: Always require webhook secret in production
    if (!webhookSecret) {
        console.error('STRIPE_WEBHOOK_SECRET not configured');
        return res.status(500).json({ error: 'Webhook not configured' });
    }

    if (!sig) {
        console.error('Missing stripe-signature header');
        return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    try {
        event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).json({ error: 'Invalid webhook signature' });
    }


    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;

                // Record purchase in Supabase (idempotent via stripe_event_id)
                await recordPurchase({
                    stripeEventId: event.id,
                    sessionId: session.id,
                    paymentIntentId: session.payment_intent,
                    tier: session.metadata.tier,
                    amount: session.amount_total / 100,
                    customerEmail: session.customer_details?.email,
                    userId: session.metadata.userId,
                    filename: session.metadata.filename
                });
                break;
            }

            case 'charge.refunded': {
                const charge = event.data.object;
                await updatePurchaseStatus(charge.payment_intent, 'refunded');
                break;
            }
        }

        res.json({ received: true });

    } catch (err) {
        console.error('Webhook handler error:', err);
        // Return 500 so Stripe retries the event delivery
        res.status(500).json({ error: 'Webhook handler failed' });
    }
};

async function recordPurchase(data) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
        return;
    }

    try {
        // Use upsert on stripe_event_id for idempotency — duplicate webhook
        // deliveries from Stripe will update the existing row instead of inserting.
        const response = await fetch(`${supabaseUrl}/rest/v1/purchases`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Prefer': 'return=representation,resolution=merge-duplicates'
            },
            body: JSON.stringify({
                stripe_event_id: data.stripeEventId,
                user_id: data.userId || null,
                tier_slug: data.tier,
                stripe_session_id: data.sessionId,
                stripe_payment_intent: data.paymentIntentId,
                amount_cents: Math.round(data.amount * 100),
                currency: 'USD',
                status: 'succeeded'
            })
        });

        if (!response.ok) {
            console.error('Failed to record purchase:', await response.text());
        }
    } catch (err) {
        console.error('Database error:', err.message);
    }
}

async function updatePurchaseStatus(paymentIntentId, status) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) return;

    try {
        await fetch(
            `${supabaseUrl}/rest/v1/purchases?stripe_payment_intent=eq.${paymentIntentId}`,
            {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': supabaseServiceKey,
                    'Authorization': `Bearer ${supabaseServiceKey}`
                },
                body: JSON.stringify({ status: status })
            }
        );
    } catch (err) {
        console.error('Failed to update status:', err.message);
    }
}
