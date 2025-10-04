'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRightIcon, HomeIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center space-x-1 text-sm text-muted-foreground",
        className
      )}
    >
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRightIcon className="h-4 w-4 mx-1 text-muted-foreground/50" />
              )}
              
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="flex items-center space-x-1 hover:text-foreground transition-colors"
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span
                  className={cn(
                    "flex items-center space-x-1",
                    isLast ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  <span>{item.label}</span>
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Responsive breadcrumb that shows only last few items on mobile
export function ResponsiveBreadcrumb({ items, className }: BreadcrumbProps) {
  const mobileItems = items.length > 2 ? [items[0], items[items.length - 1]] : items;

  return (
    <>
      {/* Mobile breadcrumb - show only first and last */}
      <div className="md:hidden">
        <Breadcrumb items={mobileItems} className={className} />
      </div>
      
      {/* Desktop breadcrumb - show all items */}
      <div className="hidden md:block">
        <Breadcrumb items={items} className={className} />
      </div>
    </>
  );
}

// Home breadcrumb item helper
export const homeBreadcrumb: BreadcrumbItem = {
  label: 'Home',
  href: '/',
  icon: HomeIcon,
};