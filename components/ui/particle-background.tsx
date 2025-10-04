'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface ParticleBackgroundProps {
  className?: string;
  preset?: 'default' | 'minimal' | 'floating' | 'network' | 'bubbles';
  color?: string;
  opacity?: number;
}

export function ParticleBackground({
  className = '',
  preset = 'default',
  color = '#3b82f6',
  opacity = 0.1,
}: ParticleBackgroundProps) {
  const particleStyles = useMemo(() => {
    const baseStyles = {
      background: `radial-gradient(circle at 20% 80%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
                   radial-gradient(circle at 80% 20%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
                   radial-gradient(circle at 40% 40%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 50%)`,
    };

    switch (preset) {
      case 'minimal':
        return {
          background: `radial-gradient(circle at 50% 50%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
        };
      case 'floating':
        return {
          background: `linear-gradient(45deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 50%),
                       radial-gradient(circle at 70% 30%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 60%)`,
        };
      case 'network':
        return {
          background: `conic-gradient(from 0deg at 50% 50%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0deg, transparent 60deg, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 120deg, transparent 180deg)`,
        };
      case 'bubbles':
        return {
          background: `radial-gradient(circle at 25% 25%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 40%),
                       radial-gradient(circle at 75% 75%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 40%),
                       radial-gradient(circle at 50% 10%, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 30%)`,
        };
      default:
        return baseStyles;
    }
  }, [preset, color, opacity]);

  return (
    <div
      className={cn(
        'absolute inset-0 pointer-events-none',
        'animate-pulse',
        className
      )}
      style={particleStyles}
    />
  );
}

// Specialized particle backgrounds for different contexts
export function LoginParticleBackground() {
  return (
    <ParticleBackground
      className="absolute inset-0 -z-10"
      preset="floating"
      color="#3b82f6"
      opacity={0.3}
      speed={0.5}
      density={40}
    />
  );
}

export function DashboardParticleBackground() {
  return (
    <ParticleBackground
      className="fixed inset-0 -z-10"
      preset="minimal"
      color="#6366f1"
      opacity={0.2}
      speed={0.3}
      density={15}
    />
  );
}

export function HeroParticleBackground() {
  return (
    <ParticleBackground
      className="absolute inset-0 -z-10"
      preset="network"
      color="#8b5cf6"
      opacity={0.4}
      speed={0.8}
      density={60}
    />
  );
}