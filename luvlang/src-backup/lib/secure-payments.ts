import { supabase } from './supabase'
import { secureDB } from './secure-database'

export interface PaymentPlan {
  id: string
  name: string
  price: number
  currency: string
  interval: 'month' | 'year'
  features: string[]
  popular?: boolean
}

export interface PaymentTransaction {
  id: string
  user_id: string
  plan_id: string
  paypal_transaction_id: string
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  payment_method: 'paypal'
  created_at: string
  completed_at?: string
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  paypal_subscription_id: string
  status: 'active' | 'cancelled' | 'expired' | 'pending'
  current_period_start: string
  current_period_end: string
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
}

export class SecurePaymentProcessor {
  private paypalClientId: string
  private paypalClientSecret: string
  private sandboxMode: boolean

  constructor() {
    this.paypalClientId = process.env.PAYPAL_CLIENT_ID || ''
    this.paypalClientSecret = process.env.PAYPAL_CLIENT_SECRET || ''
    this.sandboxMode = process.env.NODE_ENV !== 'production'
  }

  // =================================================================
  // PAYMENT PLANS CONFIGURATION
  // =================================================================

  getPaymentPlans(): PaymentPlan[] {
    return [
      {
        id: 'executive-monthly',
        name: 'Executive Monthly',
        price: 99.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'Unlimited premium matches',
          'Advanced search filters',
          'Priority profile visibility',
          'Video chat capabilities',
          'Professional verification',
          'Concierge matching service'
        ]
      },
      {
        id: 'executive-yearly',
        name: 'Executive Annual',
        price: 999.99,
        currency: 'USD',
        interval: 'year',
        popular: true,
        features: [
          'All Executive Monthly features',
          '2 months free (12 for 10)',
          'Exclusive executive events',
          'Personal dating advisor',
          'Premium venue recommendations',
          'Identity verification included'
        ]
      },
      {
        id: 'entrepreneur-monthly',
        name: 'Entrepreneur Monthly',
        price: 199.99,
        currency: 'USD',
        interval: 'month',
        features: [
          'All Executive features',
          'Investor network access',
          'Business partnership matching',
          'Startup event invitations',
          'Mentor connections',
          'IPO/Exit networking'
        ]
      }
    ]
  }

  // =================================================================
  // PAYPAL INTEGRATION (SECURE)
  // =================================================================

  async getPayPalAccessToken(): Promise<string> {
    const baseURL = this.sandboxMode 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'

    const auth = Buffer.from(`${this.paypalClientId}:${this.paypalClientSecret}`).toString('base64')

    try {
      const response = await fetch(`${baseURL}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'grant_type=client_credentials'
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`PayPal Auth Error: ${data.error_description}`)
      }

      return data.access_token
    } catch (error) {
      console.error('PayPal authentication failed:', error)
      throw new Error('Payment system temporarily unavailable')
    }
  }

  async createPayPalOrder(planId: string): Promise<{ orderId: string; approvalUrl: string }> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const plan = this.getPaymentPlans().find(p => p.id === planId)
    if (!plan) {
      throw new Error('Invalid payment plan')
    }

    const accessToken = await this.getPayPalAccessToken()
    const baseURL = this.sandboxMode 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'

    const orderPayload = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `luvlang-${planId}-${user.id}`,
        amount: {
          currency_code: plan.currency,
          value: plan.price.toFixed(2)
        },
        description: `LuvLang ${plan.name} Subscription`,
        custom_id: `user:${user.id}|plan:${planId}`,
        soft_descriptor: 'LUVLANG'
      }],
      application_context: {
        brand_name: 'LuvLang Professional',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.SITE_URL}/payment/success`,
        cancel_url: `${process.env.SITE_URL}/payment/cancel`
      }
    }

    try {
      const response = await fetch(`${baseURL}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `luvlang-${Date.now()}-${user.id}`
        },
        body: JSON.stringify(orderPayload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`PayPal Order Error: ${data.details?.[0]?.description || 'Unknown error'}`)
      }

      // Store pending transaction
      await this.storePendingTransaction({
        user_id: user.id,
        plan_id: planId,
        paypal_transaction_id: data.id,
        amount: plan.price,
        currency: plan.currency,
        status: 'pending',
        payment_method: 'paypal'
      })

      // Log security event
      await secureDB.logSecurityEvent('payment_initiated', {
        table_name: 'payment_transactions',
        record_id: data.id,
        new_data: {
          plan_id: planId,
          amount: plan.price,
          currency: plan.currency
        }
      })

      const approvalUrl = data.links.find((link: any) => link.rel === 'approve')?.href
      
      return {
        orderId: data.id,
        approvalUrl: approvalUrl || ''
      }
    } catch (error) {
      console.error('PayPal order creation failed:', error)
      throw new Error('Failed to create payment order')
    }
  }

  async capturePayPalOrder(orderId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    const accessToken = await this.getPayPalAccessToken()
    const baseURL = this.sandboxMode 
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com'

    try {
      const response = await fetch(`${baseURL}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `luvlang-capture-${Date.now()}-${user.id}`
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(`PayPal Capture Error: ${data.details?.[0]?.description || 'Unknown error'}`)
      }

      const captureStatus = data.purchase_units?.[0]?.payments?.captures?.[0]?.status
      
      if (captureStatus === 'COMPLETED') {
        // Update transaction status
        await this.updateTransactionStatus(orderId, 'completed')
        
        // Create/update subscription
        await this.createSubscription(orderId, data)
        
        // Upgrade user account
        await this.upgradeUserAccount(user.id, orderId)
        
        // Log successful payment
        await secureDB.logSecurityEvent('payment_completed', {
          table_name: 'payment_transactions',
          record_id: orderId,
          new_data: {
            status: 'completed',
            paypal_capture_id: data.purchase_units[0].payments.captures[0].id
          }
        })

        return true
      } else {
        await this.updateTransactionStatus(orderId, 'failed')
        throw new Error('Payment capture failed')
      }
    } catch (error) {
      console.error('PayPal capture failed:', error)
      await this.updateTransactionStatus(orderId, 'failed')
      throw new Error('Payment processing failed')
    }
  }

  // =================================================================
  // SUBSCRIPTION MANAGEMENT
  // =================================================================

  async createSubscription(orderId: string, paypalData: any): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Get transaction details
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('paypal_transaction_id', orderId)
      .eq('user_id', user.id)
      .single()

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    const plan = this.getPaymentPlans().find(p => p.id === transaction.plan_id)
    if (!plan) {
      throw new Error('Plan not found')
    }

    // Calculate period dates
    const now = new Date()
    const periodEnd = new Date(now)
    
    if (plan.interval === 'month') {
      periodEnd.setMonth(periodEnd.getMonth() + 1)
    } else if (plan.interval === 'year') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1)
    }

    // Create subscription record
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: user.id,
        plan_id: plan.id,
        paypal_subscription_id: orderId,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        cancel_at_period_end: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString()
      })

    if (error) {
      console.error('Subscription creation failed:', error)
      throw new Error('Failed to create subscription')
    }
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Update subscription to cancel at period end
    const { error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', subscriptionId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Subscription cancellation failed:', error)
      throw new Error('Failed to cancel subscription')
    }

    // Log cancellation
    await secureDB.logSecurityEvent('subscription_cancelled', {
      table_name: 'subscriptions',
      record_id: subscriptionId
    })

    return true
  }

  // =================================================================
  // DATABASE OPERATIONS (SECURE)
  // =================================================================

  private async storePendingTransaction(transaction: Omit<PaymentTransaction, 'id' | 'created_at'>): Promise<void> {
    const { error } = await supabase
      .from('payment_transactions')
      .insert({
        ...transaction,
        created_at: new Date().toISOString()
      })

    if (error) {
      console.error('Transaction storage failed:', error)
      throw new Error('Failed to store transaction')
    }
  }

  private async updateTransactionStatus(paypalTransactionId: string, status: 'completed' | 'failed'): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { error } = await supabase
      .from('payment_transactions')
      .update(updateData)
      .eq('paypal_transaction_id', paypalTransactionId)

    if (error) {
      console.error('Transaction status update failed:', error)
      throw new Error('Failed to update transaction status')
    }
  }

  private async upgradeUserAccount(userId: string, transactionId: string): Promise<void> {
    // Get transaction details
    const { data: transaction } = await supabase
      .from('payment_transactions')
      .select('plan_id')
      .eq('paypal_transaction_id', transactionId)
      .eq('user_id', userId)
      .single()

    if (!transaction) {
      throw new Error('Transaction not found')
    }

    // Update user profile with premium status
    const { error } = await supabase
      .from('profiles')
      .update({
        membership_type: 'premium',
        membership_plan: transaction.plan_id,
        premium_since: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (error) {
      console.error('Account upgrade failed:', error)
      throw new Error('Failed to upgrade account')
    }
  }

  // =================================================================
  // PAYMENT SECURITY VALIDATION
  // =================================================================

  async validatePaymentSecurity(): Promise<{ secure: boolean; issues: string[] }> {
    const issues: string[] = []

    // Check environment variables
    if (!this.paypalClientId) {
      issues.push('PayPal Client ID not configured')
    }

    if (!this.paypalClientSecret) {
      issues.push('PayPal Client Secret not configured')
    }

    if (!process.env.SITE_URL) {
      issues.push('Site URL not configured for payment redirects')
    }

    // Check database tables exist
    try {
      await supabase.from('payment_transactions').select('id').limit(1)
      await supabase.from('subscriptions').select('id').limit(1)
    } catch (error) {
      issues.push('Payment database tables not configured')
    }

    // Check SSL certificate in production
    if (!this.sandboxMode && !process.env.SITE_URL?.startsWith('https://')) {
      issues.push('SSL certificate required for production payments')
    }

    return {
      secure: issues.length === 0,
      issues
    }
  }

  // =================================================================
  // PAYMENT ANALYTICS
  // =================================================================

  async getPaymentAnalytics(): Promise<any> {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      throw new Error('User not authenticated')
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      throw new Error('Unauthorized: Admin access required')
    }

    const [transactions, subscriptions, revenue] = await Promise.all([
      supabase.from('payment_transactions').select('*').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.rpc('calculate_monthly_revenue') // Custom SQL function
    ])

    return {
      total_transactions: transactions.data?.length || 0,
      active_subscriptions: subscriptions.data?.filter(s => s.status === 'active').length || 0,
      monthly_revenue: revenue.data || 0,
      transactions: transactions.data,
      subscriptions: subscriptions.data
    }
  }
}

export const paymentProcessor = new SecurePaymentProcessor()