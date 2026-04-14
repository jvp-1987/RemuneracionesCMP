import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHealthCenterLogo(name: string): string | null {
  if (!name) return null;
  const normalized = name.toLowerCase();
  if (normalized.includes('panguipulli')) return '/logos/cesfam-panguipulli.png';
  if (normalized.includes('choshuenco')) return '/logos/cesfam-choshuenco.png';
  if (normalized.includes('coñaripe') || normalized.includes('conaripe')) return '/logos/cesfam-conaripe.png';
  return null;
}
