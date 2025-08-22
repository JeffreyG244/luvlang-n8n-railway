
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';
import { SecurityAuditService } from '@/services/security/SecurityAuditService';

interface SecurityContextType {
  securityLevel: 'low' | 'medium' | 'high';
  threatCount: number;
  lastScan: Date;
  performSecurityScan: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | null>(null);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const EnhancedSecurityProvider = ({ children }: Props) => {
  const { securityStatus, performSecurityCheck } = useEnhancedSecurity();
  const [securityLevel, setSecurityLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [threatCount, setThreatCount] = useState(0);
  const [lastScan, setLastScan] = useState(new Date());

  const performSecurityScan = async () => {
    try {
      const sessionValid = await performSecurityCheck();
      
      // Log security scan
      await SecurityAuditService.logSecurityEvent(
        'security_scan_performed',
        {
          session_valid: sessionValid,
          rate_limit_status: securityStatus.rateLimitStatus,
          scan_timestamp: new Date().toISOString()
        },
        'low'
      );
      
      // Determine security level based on current status
      let level: 'low' | 'medium' | 'high' = 'high';
      let threats = 0;
      
      if (!sessionValid) {
        level = 'low';
        threats += 1;
      }
      
      if (securityStatus.rateLimitStatus === 'blocked') {
        level = 'low';
        threats += 1;
      } else if (securityStatus.rateLimitStatus === 'warning') {
        level = 'medium';
      }
      
      setSecurityLevel(level);
      setThreatCount(threats);
      setLastScan(new Date());
      
    } catch (error) {
      console.error('Security scan failed:', error);
      setSecurityLevel('low');
      setThreatCount(1);
    }
  };

  useEffect(() => {
    // Perform initial security scan
    performSecurityScan();
    
    // Set up periodic security scans every 10 minutes
    const interval = setInterval(performSecurityScan, 10 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const contextValue: SecurityContextType = {
    securityLevel,
    threatCount,
    lastScan,
    performSecurityScan
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};
