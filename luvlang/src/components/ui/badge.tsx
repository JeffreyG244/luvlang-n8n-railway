import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2',
          {
            'border-transparent bg-purple-600 text-white shadow hover:bg-purple-700': variant === 'default',
            'border-transparent bg-white/20 text-purple-100 hover:bg-white/30': variant === 'secondary',
            'border-transparent bg-red-600 text-white shadow hover:bg-red-700': variant === 'destructive',
            'text-purple-200 border-white/20 bg-transparent': variant === 'outline',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };