'use client';

import {
  Columns2,
  Rows2,
  LayoutGrid,
  Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PaneLayout } from '@/app/home/types';

interface PaneToolbarProps {
  layout: PaneLayout | null;
  paneCount: number;
  onChangeLayout: (type: PaneLayout['type']) => void;
}

interface LayoutButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}

function LayoutButton({ icon, label, active, onClick, disabled }: LayoutButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'rounded p-1.5 transition-colors duration-100',
        active
          ? 'bg-orange-500/20 text-orange-400'
          : 'text-white/40 hover:bg-white/10 hover:text-white/60',
        disabled && 'cursor-not-allowed opacity-30'
      )}
      title={label}
      aria-label={label}
      aria-pressed={active}
    >
      {icon}
    </button>
  );
}

export function PaneToolbar({ layout, paneCount, onChangeLayout }: PaneToolbarProps) {
  if (paneCount <= 1) return null;

  const currentType = layout?.type || 'single';

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/5 bg-white/[0.02] p-0.5">
      <LayoutButton
        icon={<Square className="h-3.5 w-3.5" />}
        label="Single pane"
        active={currentType === 'single'}
        onClick={() => onChangeLayout('single')}
      />
      <LayoutButton
        icon={<Columns2 className="h-3.5 w-3.5" />}
        label="Side by side"
        active={currentType === 'split-horizontal'}
        onClick={() => onChangeLayout('split-horizontal')}
      />
      <LayoutButton
        icon={<Rows2 className="h-3.5 w-3.5" />}
        label="Stacked"
        active={currentType === 'split-vertical'}
        onClick={() => onChangeLayout('split-vertical')}
      />
      <LayoutButton
        icon={<LayoutGrid className="h-3.5 w-3.5" />}
        label="Grid"
        active={currentType === 'grid'}
        onClick={() => onChangeLayout('grid')}
        disabled={paneCount < 3}
      />
    </div>
  );
}
