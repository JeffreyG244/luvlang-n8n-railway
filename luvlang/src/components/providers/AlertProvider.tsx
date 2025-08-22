import React, { createContext, useContext, ReactNode } from 'react';

interface AlertContextType {
  showAlert: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    // Simple console logging for now - can be enhanced with toast notifications
    if (import.meta.env.DEV) {
      console.log(`[${type.toUpperCase()}]: ${message}`);
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
    </AlertContext.Provider>
  );
};