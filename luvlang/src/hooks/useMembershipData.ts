
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import type { MembershipPlan, UserSubscription } from '@/types/membership';

export const useMembershipData = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [userSubscription, setUserSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
    if (user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const fetchPlans = async () => {
    try {
      logger.log('Fetching membership plans...');
      setError(null);
      
      const { data, error } = await supabase
        .from('membership_plans')
        .select('*')
        .order('monthly_price', { ascending: true });

      if (error) {
        logger.error('Error fetching plans:', error);
        setError(`Failed to load plans: ${error.message}`);
        return;
      }
      
      logger.log('Plans fetched successfully:', data?.length);
      
      if (!data || data.length === 0) {
        logger.warn('No membership plans found in database');
        setError('No membership plans available');
        return;
      }
      
      setPlans(data);
    } catch (error) {
      logger.error('Unexpected error fetching plans:', error);
      setError('An unexpected error occurred while loading plans');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscriptionStatus = async () => {
    if (!user) return;
    
    try {
      logger.log('Checking subscription status for user:', user.id);
      
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) {
        logger.error('Subscription check error:', error);
        logger.log('Continuing without subscription data');
        return;
      }
      
      logger.log('Subscription check response:', data);
      
      if (data?.subscribed) {
        setUserSubscription({
          plan_id: data.plan_type === 'plus' ? 2 : data.plan_type === 'premium' ? 3 : 1,
          status: data.status,
          current_period_end: data.subscription_end
        });
      }
    } catch (error) {
      logger.error('Error checking subscription:', error);
      logger.log('Subscription check failed, continuing without subscription data');
    }
  };

  const getCurrentPlanId = () => {
    if (!userSubscription) return 1;
    return userSubscription.plan_id;
  };

  return {
    plans,
    userSubscription,
    loading,
    error,
    fetchPlans,
    checkSubscriptionStatus,
    getCurrentPlanId
  };
};
