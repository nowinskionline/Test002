export type CategoryColor = 'sky' | 'amber' | 'emerald' | 'rose' | 'violet' | 'slate';

export interface Category {
  id: string;
  name: string;
  color: CategoryColor;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  completed: boolean;
  createdAt: number;
}

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'praca', name: 'Praca', color: 'sky' },
  { id: 'dom', name: 'Dom', color: 'amber' },
  { id: 'inne', name: 'Inne', color: 'slate' },
];

/**
 * Klasy Tailwinda muszą być zapisane w całości (np. 'bg-sky-500'),
 * bo Tailwind szuka ich w kodzie jako zwykłego tekstu – sklejanie `bg-${kolor}-500` nie zadziała.
 */
export const CATEGORY_COLORS: Record<CategoryColor, { label: string; badge: string; dot: string }> = {
  sky: {
    label: 'Niebieski',
    badge: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
    dot: 'bg-sky-500',
  },
  amber: {
    label: 'Bursztynowy',
    badge: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    dot: 'bg-amber-500',
  },
  emerald: {
    label: 'Zielony',
    badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
    dot: 'bg-emerald-500',
  },
  rose: {
    label: 'Różowy',
    badge: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
    dot: 'bg-rose-500',
  },
  violet: {
    label: 'Fioletowy',
    badge: 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
    dot: 'bg-violet-500',
  },
  slate: {
    label: 'Szary',
    badge: 'bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300',
    dot: 'bg-slate-400',
  },
};

export const CATEGORY_COLOR_NAMES = Object.keys(CATEGORY_COLORS) as CategoryColor[];
