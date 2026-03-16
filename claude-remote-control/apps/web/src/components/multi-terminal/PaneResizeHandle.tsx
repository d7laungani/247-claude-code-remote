'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PaneResizeHandleProps {
  orientation: 'horizontal' | 'vertical';
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export function PaneResizeHandle({ orientation, onResize, onResizeEnd }: PaneResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const lastPos = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      lastPos.current = orientation === 'horizontal' ? e.clientX : e.clientY;
    },
    [orientation]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentPos = orientation === 'horizontal' ? e.clientX : e.clientY;
      const delta = currentPos - lastPos.current;
      lastPos.current = currentPos;
      onResize(delta);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = orientation === 'horizontal' ? 'col-resize' : 'row-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, orientation, onResize, onResizeEnd]);

  const isHorizontal = orientation === 'horizontal';

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'flex-shrink-0 transition-colors duration-100',
        isHorizontal ? 'w-1 cursor-col-resize' : 'h-1 cursor-row-resize',
        isDragging ? 'bg-orange-500/40' : 'hover:bg-orange-500/20 bg-transparent',
        'group relative'
      )}
    >
      {/* Wider hit area */}
      <div
        className={cn(
          'absolute',
          isHorizontal ? 'inset-y-0 -left-1 -right-1' : 'inset-x-0 -top-1 -bottom-1'
        )}
      />
    </div>
  );
}
