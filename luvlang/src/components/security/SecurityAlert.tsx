
import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Shield, Info, CheckCircle } from 'lucide-react';

interface SecurityAlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  onDismiss?: () => void;
}

const SecurityAlert: React.FC<SecurityAlertProps> = ({
  type,
  title,
  message,
  onDismiss
}) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <Shield className="h-4 w-4" />;
      case 'success':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getVariant = () => {
    switch (type) {
      case 'error':
        return 'destructive' as const;
      case 'warning':
        return 'default' as const;
      case 'success':
        return 'default' as const;
      default:
        return 'default' as const;
    }
  };

  return (
    <Alert variant={getVariant()} className={`mb-4 ${
      type === 'success' ? 'bg-green-50 border-green-200' : 
      type === 'warning' ? 'bg-yellow-50 border-yellow-200' : ''
    }`}>
      {getIcon()}
      <AlertTitle className={
        type === 'success' ? 'text-green-800' : 
        type === 'warning' ? 'text-yellow-800' : ''
      }>
        {title}
      </AlertTitle>
      <AlertDescription className={
        type === 'success' ? 'text-green-700' : 
        type === 'warning' ? 'text-yellow-700' : ''
      }>
        {message}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-sm underline hover:no-underline"
          >
            Dismiss
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default SecurityAlert;
