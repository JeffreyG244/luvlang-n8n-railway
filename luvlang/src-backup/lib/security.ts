import { supabase } from './supabase'

export interface SecurityEvent {
  event_type: 'login_attempt' | 'password_reset' | 'account_creation' | 'suspicious_activity'
  user_id?: string
  ip_address?: string
  user_agent?: string
  success: boolean
  metadata?: Record<string, any>
  timestamp: string
}

export class SecurityMonitor {
  async logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>) {
    const securityEvent: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    }

    try {
      const { error } = await supabase
        .from('security_events')
        .insert([securityEvent])

      if (error) {
        console.error('Failed to log security event:', error)
      }
    } catch (err) {
      console.error('Security logging error:', err)
    }
  }

  async detectSuspiciousActivity(ip: string, timeWindow: number = 3600000) {
    try {
      const oneHourAgo = new Date(Date.now() - timeWindow).toISOString()
      
      const { data, error } = await supabase
        .from('security_events')
        .select('*')
        .eq('ip_address', ip)
        .gte('timestamp', oneHourAgo)
        .eq('success', false)

      if (error) {
        console.error('Error checking suspicious activity:', error)
        return false
      }

      const failedAttempts = data?.length || 0
      
      if (failedAttempts >= 5) {
        await this.logSecurityEvent({
          event_type: 'suspicious_activity',
          ip_address: ip,
          success: false,
          metadata: {
            failed_attempts: failedAttempts,
            time_window_minutes: timeWindow / 60000
          }
        })
        return true
      }

      return false
    } catch (err) {
      console.error('Error in suspicious activity detection:', err)
      return false
    }
  }
}

export const securityMonitor = new SecurityMonitor()

export function validatePasswordStrength(password: string): {
  isValid: boolean
  score: number
  feedback: string[]
} {
  const feedback: string[] = []
  let score = 0

  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long')
  } else if (password.length >= 12) {
    score += 2
  } else {
    score += 1
  }

  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter')
  } else {
    score += 1
  }

  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter')
  } else {
    score += 1
  }

  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number')
  } else {
    score += 1
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\?]/.test(password)) {
    feedback.push('Password must contain at least one special character')
  } else {
    score += 1
  }

  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', 'admin', 'letmein', 'welcome', 'monkey'
  ]
  
  if (commonPasswords.includes(password.toLowerCase())) {
    feedback.push('Password is too common. Please choose a more unique password')
    score = 0
  }

  const isValid = feedback.length === 0 && score >= 4

  return {
    isValid,
    score,
    feedback
  }
}

export async function checkPasswordInBreach(password: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-1', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const hashUpper = hashHex.toUpperCase()
    
    const prefix = hashUpper.substring(0, 5)
    const suffix = hashUpper.substring(5)
    
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`)
    
    if (!response.ok) {
      console.warn('Could not check password against breach database')
      return false
    }
    
    const text = await response.text()
    const lines = text.split('\n')
    
    for (const line of lines) {
      const [hashSuffix] = line.split(':')
      if (hashSuffix === suffix) {
        return true
      }
    }
    
    return false
  } catch (error) {
    console.warn('Error checking password breach status:', error)
    return false
  }
}