'use client';

import { HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'elevated' | 'bordered' | 'gradient';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  gradient?: 'blue' | 'purple' | 'green' | 'indigo';
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white rounded-xl shadow-sm',
  elevated: 'bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow',
  bordered: 'bg-white rounded-xl border border-gray-200',
  gradient: 'rounded-xl text-white'
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

const gradientStyles = {
  blue: 'bg-gradient-to-r from-blue-600 to-blue-700',
  purple: 'bg-gradient-to-r from-purple-600 to-purple-700',
  green: 'bg-gradient-to-r from-green-600 to-green-700',
  indigo: 'bg-gradient-to-r from-indigo-600 to-purple-600'
};

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  action?: React.ReactNode;
  bgColor?: string;
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  divided?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(({
  variant = 'default',
  padding = 'md',
  gradient,
  className = '',
  children,
  ...props
}, ref) => {
  const combinedClassName = [
    variantStyles[variant],
    paddingStyles[padding],
    variant === 'gradient' && gradient ? gradientStyles[gradient] : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div ref={ref} className={combinedClassName} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(({
  icon,
  action,
  bgColor = 'bg-gray-50',
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`${bgColor} px-4 py-3 border-b flex items-center justify-between ${className}`}
      {...props}
    >
      <div className="flex items-center gap-2">
        {icon}
        {typeof children === 'string' ? (
          <span className="font-semibold">{children}</span>
        ) : (
          children
        )}
      </div>
      {action}
    </div>
  );
});

CardHeader.displayName = 'CardHeader';

const CardContent = forwardRef<HTMLDivElement, CardContentProps>(({
  divided = false,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <div
      ref={ref}
      className={`${divided ? 'divide-y' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});

CardContent.displayName = 'CardContent';

export { Card, CardHeader, CardContent };
export type { CardProps, CardHeaderProps, CardContentProps };
