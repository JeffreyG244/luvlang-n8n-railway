
import { supabase } from '@/integrations/supabase/client';

// Enhanced password validation that uses database-level security
export const validatePasswordStrength = async (password: string): Promise<{ isValid: boolean; error?: string; score?: number; strength?: string }> => {
  if (import.meta.env.DEV) console.log('Validating password strength, length:', password?.length);

  // Check if password exists
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  try {
    // Use the database function for comprehensive validation
    const { data, error } = await supabase.rpc('validate_password_security', {
      password_text: password
    });

    if (error) {
      if (import.meta.env.DEV) console.error('Database password validation error:', error);
      // Fallback to basic validation if database function fails
      return validatePasswordBasic(password);
    }

    if (!data.valid) {
      return {
        isValid: false,
        error: data.errors[0] || 'Password does not meet security requirements',
        score: data.score,
        strength: data.strength
      };
    }

    return {
      isValid: true,
      score: data.score,
      strength: data.strength
    };
  } catch (error) {
    if (import.meta.env.DEV) console.error('Password validation error:', error);
    // Fallback to basic validation
    return validatePasswordBasic(password);
  }
};

// Fallback validation for when database function is unavailable
const validatePasswordBasic = (password: string): { isValid: boolean; error?: string } => {
  // Minimum length check
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters long' };
  }

  // Maximum reasonable length check
  if (password.length > 128) {
    return { isValid: false, error: 'Password must be less than 128 characters long' };
  }

  // Check for required character types
  if (!/[a-z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one lowercase letter' };
  }

  if (!/[A-Z]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter' };
  }

  if (!/[0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one number' };
  }

  if (!/[^a-zA-Z0-9]/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one special character' };
  }

  // Check against most common breached passwords
  const commonPasswords = [
    '123456', 'password', 'password123', 'admin', '12345678', 'qwerty',
    '1234567890', 'letmein', 'welcome', 'monkey', 'dragon', '123123'
  ];

  if (commonPasswords.includes(password.toLowerCase())) {
    return { 
      isValid: false, 
      error: 'This password has been found in data breaches. Please choose a stronger password.' 
    };
  }

  return { isValid: true };
};

export const sanitizePasswordInput = (password: string): string => {
  if (!password) return '';
  // Remove any potentially dangerous characters while preserving password functionality
  // Trim whitespace but preserve internal spaces if any
  return password.trim();
};
