'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
}

export function ResponsiveGrid({ 
  children, 
  className, 
  cols = { default: 1, md: 2, lg: 3 },
  gap = { default: 4, md: 6 }
}: ResponsiveGridProps) {
  const gridClasses = cn(
    'grid',
    // Columns
    cols.default && `grid-cols-${cols.default}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
    // Gap
    gap.default && `gap-${gap.default}`,
    gap.sm && `sm:gap-${gap.sm}`,
    gap.md && `md:gap-${gap.md}`,
    gap.lg && `lg:gap-${gap.lg}`,
    gap.xl && `xl:gap-${gap.xl}`,
    gap['2xl'] && `2xl:gap-${gap['2xl']}`,
    className
  );

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
}

// Responsive container component
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
}

export function ResponsiveContainer({ 
  children, 
  className,
  size = 'xl',
  padding = { default: 4, sm: 6, lg: 8 }
}: ResponsiveContainerProps) {
  const containerClasses = cn(
    'mx-auto w-full',
    // Max width based on size
    size === 'sm' && 'max-w-sm',
    size === 'md' && 'max-w-md',
    size === 'lg' && 'max-w-4xl',
    size === 'xl' && 'max-w-7xl',
    size === 'full' && 'max-w-full',
    // Padding
    padding.default && `px-${padding.default}`,
    padding.sm && `sm:px-${padding.sm}`,
    padding.md && `md:px-${padding.md}`,
    padding.lg && `lg:px-${padding.lg}`,
    padding.xl && `xl:px-${padding.xl}`,
    className
  );

  return (
    <div className={containerClasses}>
      {children}
    </div>
  );
}

// Responsive card component
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  hover?: boolean;
}

export function ResponsiveCard({ 
  children, 
  className,
  padding = { default: 4, md: 6 },
  hover = false
}: ResponsiveCardProps) {
  const cardClasses = cn(
    'bg-card rounded-lg border border-border shadow-sm',
    // Padding
    padding.default && `p-${padding.default}`,
    padding.sm && `sm:p-${padding.sm}`,
    padding.md && `md:p-${padding.md}`,
    padding.lg && `lg:p-${padding.lg}`,
    // Hover effects
    hover && 'transition-all duration-200 hover:shadow-md hover:border-primary/20',
    className
  );

  return (
    <div className={cardClasses}>
      {children}
    </div>
  );
}

// Responsive stack component for vertical layouts
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  spacing?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  align?: 'start' | 'center' | 'end' | 'stretch';
}

export function ResponsiveStack({ 
  children, 
  className,
  spacing = { default: 4, md: 6 },
  align = 'stretch'
}: ResponsiveStackProps) {
  const stackClasses = cn(
    'flex flex-col',
    // Spacing
    spacing.default && `space-y-${spacing.default}`,
    spacing.sm && `sm:space-y-${spacing.sm}`,
    spacing.md && `md:space-y-${spacing.md}`,
    spacing.lg && `lg:space-y-${spacing.lg}`,
    // Alignment
    align === 'start' && 'items-start',
    align === 'center' && 'items-center',
    align === 'end' && 'items-end',
    align === 'stretch' && 'items-stretch',
    className
  );

  return (
    <div className={stackClasses}>
      {children}
    </div>
  );
}