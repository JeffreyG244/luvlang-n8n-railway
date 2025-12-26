// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LUVLANG LEGENDARY - STRIPE WEBHOOK HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Purpose: Handle Stripe webhook events (payment completion, refunds, etc.)
// Security: Verifies Stripe signature to prevent spoofing
// Flow: Stripe → This function → Update order status → User can download
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.5.0?target=deno'

serve(async (req) => {
  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 1. GET WEBHOOK SIGNATURE & BODY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('Missing stripe-signature header')
    }

    const body = await req.text()

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 2. VERIFY STRIPE SIGNATURE (CRITICAL SECURITY)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured')
    }

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log(`✅ Webhook signature verified: ${event.type}`)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err.message)
      return new Response(
        JSON.stringify({ error: 'Webhook signature verification failed' }),
        { status: 400 }
      )
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 3. INITIALIZE SUPABASE (SERVICE ROLE)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 4. HANDLE DIFFERENT WEBHOOK EVENTS
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    switch (event.type) {
      // ──────────────────────────────────────────────────────────────────
      // PAYMENT SUCCESSFUL - Mark order as completed
      // ──────────────────────────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log(`💰 Payment completed for session: ${session.id}`)

        // Update order status to 'completed'
        const { data: order, error: updateError } = await supabaseAdmin
          .from('orders')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id)
          .select()
          .single()

        if (updateError) {
          console.error('❌ Failed to update order:', updateError)
          throw new Error('Failed to update order status')
        }

        console.log(`✅ Order marked as completed: ${order.id}`)
        console.log(`   User: ${order.user_id}`)
        console.log(`   File: ${order.file_path}`)

        // Optional: Send email notification
        // await sendDownloadEmail(order.user_id, order.file_path)

        break
      }

      // ──────────────────────────────────────────────────────────────────
      // PAYMENT FAILED - Mark order as failed
      // ──────────────────────────────────────────────────────────────────
      case 'checkout.session.expired':
      case 'payment_intent.payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session | Stripe.PaymentIntent

        const sessionId =
          'id' in session && typeof session.id === 'string' ? session.id : null

        if (sessionId) {
          console.log(`❌ Payment failed for session: ${sessionId}`)

          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'failed' })
            .eq('stripe_session_id', sessionId)

          if (updateError) {
            console.error('⚠️ Failed to update failed order:', updateError)
          }
        }

        break
      }

      // ──────────────────────────────────────────────────────────────────
      // REFUND ISSUED - Mark order as refunded
      // ──────────────────────────────────────────────────────────────────
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge

        console.log(`💸 Refund issued for charge: ${charge.id}`)

        // Find order by payment_intent or session_id
        if (charge.payment_intent) {
          const { error: updateError } = await supabaseAdmin
            .from('orders')
            .update({ status: 'refunded' })
            .eq('stripe_session_id', charge.payment_intent.toString())

          if (updateError) {
            console.error('⚠️ Failed to update refunded order:', updateError)
          }
        }

        break
      }

      // ──────────────────────────────────────────────────────────────────
      // OTHER EVENTS - Log for debugging
      // ──────────────────────────────────────────────────────────────────
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // 5. RETURN SUCCESS (Stripe requires 200 response)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    return new Response(
      JSON.stringify({ received: true }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('❌ Error in stripe-webhook:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
})
