'use client';

import React, { useState } from 'react';
import { getHealthCenterLogo, cn } from '@/lib/utils';

interface HealthCenterLogoProps {
  name: string;
  className?: string;
  iconClassName?: string;
  isLarge?: boolean;
}

export function HealthCenterLogo({ name, className, iconClassName, isLarge = false }: HealthCenterLogoProps) {
  const [error, setError] = useState(false);
  const logoPath = getHealthCenterLogo(name);

  if (!logoPath || error) {
    return (
      <div className={cn(
        "bg-primary/5 flex items-center justify-center text-primary transition-all overflow-hidden select-none",
        isLarge ? "w-16 h-16 rounded-2xl" : "w-10 h-10 rounded-xl",
        className
      )}>
        <span 
          className={cn("material-symbols-outlined select-none", isLarge ? "text-3xl" : "text-xl", iconClassName)} 
          dangerouslySetInnerHTML={{ __html: '&#xea17;' }} 
        />
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white border border-outline-variant/10 flex items-center justify-center overflow-hidden shadow-sm transition-all",
      isLarge ? "w-16 h-16 rounded-2xl p-2" : "w-10 h-10 rounded-xl p-1",
      className
    )}>
      <img 
        src={logoPath} 
        alt={name}
        className="w-full h-full object-contain"
        onError={() => setError(true)}
      />
    </div>
  );
}
