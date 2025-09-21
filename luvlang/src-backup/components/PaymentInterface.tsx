import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { paymentProcessor, PaymentPlan } from '../lib/secure-payments';
import { supabase } from '../lib/supabase';
import { Check, Star, Shield, CreditCard, Lock } from 'lucide-react';

const PaymentInterface = () => {
  const [plans, setPlans] = useState<PaymentPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState<any>(null);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPaymentPlans();
    loadCurrentSubscription();
  }, []);

  const loadPaymentPlans = () => {
    const planData = paymentProcessor.getPaymentPlans();
    setPlans(planData);
  };

  const loadCurrentSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('get_active_subscription', {
        p_user_id: user.id
      });

      if (!error && data?.length > 0) {
        setCurrentSubscription(data[0]);
      }
    } catch (error) {
      console.error('Failed to load subscription:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    setProcessingPlan(planId);
    setLoading(true);

    try {
      // Validate payment security first
      const securityCheck = await paymentProcessor.validatePaymentSecurity();
      
      if (!securityCheck.secure) {
        throw new Error(`Payment system security issues: ${securityCheck.issues.join(', ')}`);
      }

      // Create PayPal order
      const { orderId, approvalUrl } = await paymentProcessor.createPayPalOrder(planId);
      
      if (!approvalUrl) {
        throw new Error('Failed to create payment order');
      }

      // Redirect to PayPal
      window.location.href = approvalUrl;
    } catch (error) {
      console.error('Payment error:', error);
      alert(`Payment failed: ${error.message}`);
    } finally {
      setLoading(false);
      setProcessingPlan(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    const confirmed = confirm('Are you sure you want to cancel your subscription? It will remain active until the end of your current billing period.');
    
    if (!confirmed) return;

    setLoading(true);

    try {
      const success = await paymentProcessor.cancelSubscription(currentSubscription.subscription_id);
      
      if (success) {
        alert('Subscription cancelled successfully. You will continue to have access until the end of your current billing period.');
        await loadCurrentSubscription();
      }
    } catch (error) {
      console.error('Cancellation error:', error);
      alert(`Failed to cancel subscription: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price);
  };

  const getPlanBadgeColor = (planId: string) => {
    if (planId.includes('entrepreneur')) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (planId.includes('yearly')) return 'bg-gradient-to-r from-purple-500 to-pink-500';
    return 'bg-gradient-to-r from-blue-500 to-purple-500';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">Choose Your Executive Plan</h2>
        <p className="text-purple-200 text-lg">Unlock premium features for serious professionals</p>
      </div>

      {/* Security Badge */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 px-4 py-2 bg-green-500/20 border border-green-400/30 rounded-full">
          <Shield className="w-5 h-5 text-green-400" />
          <span className="text-green-300 font-medium">Secure PayPal Processing</span>
        </div>
      </div>

      {/* Current Subscription Status */}
      {currentSubscription && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Star className="w-5 h-5 text-amber-400" />
              <span>Current Subscription</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-semibold">{currentSubscription.plan_id}</p>
                <p className="text-purple-300">Status: {currentSubscription.status}</p>
                <p className="text-purple-300">
                  Expires: {new Date(currentSubscription.current_period_end).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="outline"
                onClick={handleCancelSubscription}
                disabled={loading}
                className="border-red-400/50 text-red-300 hover:bg-red-500/20"
              >
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200 ${
              plan.popular ? 'ring-2 ring-purple-400 scale-105' : ''
            }`}
          >
            <CardHeader className="text-center">
              {plan.popular && (
                <Badge className="mb-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                  Most Popular
                </Badge>
              )}
              <div className={`w-16 h-16 mx-auto rounded-full ${getPlanBadgeColor(plan.id)} flex items-center justify-center mb-4`}>
                <span className="text-2xl font-bold text-white">
                  {plan.id.includes('entrepreneur') ? '🚀' : 
                   plan.id.includes('yearly') ? '⭐' : '💼'}
                </span>
              </div>
              <CardTitle className="text-white text-xl">{plan.name}</CardTitle>
              <div className="space-y-1">
                <div className="text-3xl font-bold text-white">
                  {formatPrice(plan.price, plan.currency)}
                </div>
                <div className="text-purple-300 text-sm">
                  per {plan.interval}
                  {plan.interval === 'year' && (
                    <span className="block text-green-400 font-medium">
                      Save 17% vs Monthly
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Features List */}
              <div className="space-y-3">
                {plan.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Check className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-purple-200 text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Upgrade Button */}
              <Button
                onClick={() => handleUpgrade(plan.id)}
                disabled={loading || processingPlan === plan.id || currentSubscription?.plan_id === plan.id}
                className={`w-full font-semibold py-3 ${
                  plan.popular 
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                    : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
                }`}
              >
                {processingPlan === plan.id ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : currentSubscription?.plan_id === plan.id ? (
                  'Current Plan'
                ) : (
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Upgrade Now</span>
                  </div>
                )}
              </Button>

              {/* PayPal Badge */}
              <div className="flex items-center justify-center space-x-2 text-xs text-purple-300">
                <Lock className="w-3 h-3" />
                <span>Secured by PayPal</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Security Features */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-white text-center">Security & Trust</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <Shield className="w-8 h-8 text-green-400 mx-auto" />
              <h4 className="text-white font-semibold">Bank-Level Security</h4>
              <p className="text-purple-300 text-sm">256-bit SSL encryption and secure data storage</p>
            </div>
            <div className="space-y-2">
              <CreditCard className="w-8 h-8 text-blue-400 mx-auto" />
              <h4 className="text-white font-semibold">PayPal Protection</h4>
              <p className="text-purple-300 text-sm">Secure payments with buyer protection</p>
            </div>
            <div className="space-y-2">
              <Lock className="w-8 h-8 text-purple-400 mx-auto" />
              <h4 className="text-white font-semibold">Privacy First</h4>
              <p className="text-purple-300 text-sm">Your financial data is never stored on our servers</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Terms */}
      <div className="text-center space-y-2">
        <p className="text-purple-300 text-sm">
          By upgrading, you agree to our Terms of Service and Privacy Policy
        </p>
        <p className="text-purple-400 text-xs">
          Cancel anytime. No hidden fees. Billing handled securely by PayPal.
        </p>
      </div>
    </div>
  );
};

// Payment Success Handler Component
export const PaymentSuccessHandler = () => {
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handlePaymentSuccess();
  }, []);

  const handlePaymentSuccess = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const orderId = urlParams.get('token'); // PayPal returns 'token' parameter
      
      if (!orderId) {
        throw new Error('No payment order ID found');
      }

      // Capture the payment
      const result = await paymentProcessor.capturePayPalOrder(orderId);
      
      if (result) {
        setSuccess(true);
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 3000);
      } else {
        throw new Error('Payment capture failed');
      }
    } catch (err) {
      console.error('Payment processing error:', err);
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
          <div className="space-y-4">
            <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-xl font-semibold text-white">Processing Payment...</h2>
            <p className="text-purple-300">Please wait while we confirm your payment with PayPal</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
        <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
          <div className="space-y-4">
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto">
              <span className="text-white text-2xl">✕</span>
            </div>
            <h2 className="text-xl font-semibold text-white">Payment Failed</h2>
            <p className="text-red-300">{error}</p>
            <Button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-purple-500 hover:bg-purple-600 text-white"
            >
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 flex items-center justify-center">
      <Card className="bg-white/5 border-white/10 p-8 text-center max-w-md">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-white">Payment Successful!</h2>
          <p className="text-green-300">Your premium membership has been activated</p>
          <p className="text-purple-300 text-sm">Redirecting to dashboard...</p>
        </div>
      </Card>
    </div>
  );
};

export default PaymentInterface;