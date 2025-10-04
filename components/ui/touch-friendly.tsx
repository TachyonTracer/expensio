'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// Touch-friendly button with larger tap targets
interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function TouchButton({ 
  children, 
  className, 
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  ...props 
}: TouchButtonProps) {
  const baseClasses = cn(
    "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200",
    "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
    "active:scale-95 touch-manipulation", // Touch optimizations
    // Minimum touch target size (44px)
    "min-h-[44px] min-w-[44px]",
    fullWidth && "w-full"
  );

  const variantClasses = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  };

  const sizeClasses = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-3 text-base",
    lg: "px-6 py-4 text-lg",
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// Touch-friendly card with tap feedback
interface TouchCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

export function TouchCard({ 
  children, 
  className, 
  onClick, 
  disabled = false,
  padding = 'md'
}: TouchCardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const cardClasses = cn(
    "bg-card rounded-lg border border-border shadow-sm",
    paddingClasses[padding],
    onClick && !disabled && [
      "cursor-pointer transition-all duration-200",
      "hover:shadow-md hover:border-primary/20",
      "active:scale-[0.98] touch-manipulation",
      "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    ],
    disabled && "opacity-50 cursor-not-allowed",
    className
  );

  if (onClick && !disabled) {
    return (
      <div
        className={cardClasses}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        tabIndex={0}
        role="button"
      >
        {children}
      </div>
    );
  }

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
}

// Touch-friendly input with larger touch targets
interface TouchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export function TouchInput({ 
  label, 
  error, 
  icon: Icon, 
  className, 
  ...props 
}: TouchInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        )}
        <input
          className={cn(
            "w-full rounded-lg border border-input bg-background",
            "px-4 py-3 text-base", // Larger padding for touch
            "min-h-[44px]", // Minimum touch target
            "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            Icon && "pl-10",
            error && "border-destructive focus:ring-destructive",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// Touch-friendly select dropdown
interface TouchSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function TouchSelect({ 
  label, 
  error, 
  options, 
  className, 
  ...props 
}: TouchSelectProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <select
        className={cn(
          "w-full rounded-lg border border-input bg-background",
          "px-4 py-3 text-base", // Larger padding for touch
          "min-h-[44px]", // Minimum touch target
          "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-destructive focus:ring-destructive",
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// Swipe gesture component for mobile interactions
interface SwipeableProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  className?: string;
}

export function Swipeable({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  threshold = 50,
  className 
}: SwipeableProps) {
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  };

  return (
    <div
      className={className}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {children}
    </div>
  );
}