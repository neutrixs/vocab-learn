import { type HTMLAttributes } from 'react';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'error' | 'accent';
}

export function Badge({ variant = 'default', className = '', children, ...rest }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`} {...rest}>
      {children}
    </span>
  );
}
