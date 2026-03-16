'use client';

import { Fragment, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { TerminalPane } from './TerminalPane';
import { PaneResizeHandle } from './PaneResizeHandle';
import { PaneToolbar } from './PaneToolbar';
import type { PaneState, PaneLayout } from '@/app/home/types';

interface MultiTerminalContainerProps {
  openPanes: PaneState[];
  activePaneId: string | null;
  layout: PaneLayout | null;
  onFocusPane: (paneId: string) => void;
  onClosePane: (paneId: string) => void;
  onResizePanes: (sizes: number[]) => void;
  onChangeLayout: (type: PaneLayout['type']) => void;
  onSessionCreated?: (sessionName: string) => void;
}

export function MultiTerminalContainer({
  openPanes,
  activePaneId,
  layout,
  onFocusPane,
  onClosePane,
  onResizePanes,
  onChangeLayout,
  onSessionCreated,
}: MultiTerminalContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleResize = useCallback(
    (index: number, delta: number) => {
      if (!layout || layout.type === 'single' || layout.type === 'grid') return;
      if (!containerRef.current) return;

      const container = containerRef.current;
      const isHorizontal = layout.type === 'split-horizontal';
      const totalSize = isHorizontal ? container.offsetWidth : container.offsetHeight;
      const deltaPercent = (delta / totalSize) * 100;

      const newSizes = [...layout.sizes];
      const minSize = 15; // minimum 15% per pane

      newSizes[index] += deltaPercent;
      newSizes[index + 1] -= deltaPercent;

      // Enforce minimum sizes
      if (newSizes[index] < minSize || newSizes[index + 1] < minSize) return;

      onResizePanes(newSizes);
    },
    [layout, onResizePanes]
  );

  if (openPanes.length === 0) return null;

  const showHeaders = openPanes.length > 1;

  // Single pane layout
  if (!layout || layout.type === 'single') {
    const activePane = openPanes.find((p) => p.id === (layout?.paneId || activePaneId)) || openPanes[0];
    return (
      <div className="flex h-full flex-col">
        {showHeaders && (
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/5 px-2 py-1">
            <div className="flex items-center gap-1">
              {openPanes.map((pane) => (
                <button
                  key={pane.id}
                  onClick={() => onFocusPane(pane.id)}
                  className={cn(
                    'rounded px-2 py-1 text-xs transition-colors',
                    pane.id === activePane.id
                      ? 'bg-orange-500/15 text-orange-400'
                      : 'text-white/40 hover:bg-white/5 hover:text-white/60'
                  )}
                >
                  {pane.session.sessionName}
                </button>
              ))}
            </div>
            <PaneToolbar
              layout={layout}
              paneCount={openPanes.length}
              onChangeLayout={onChangeLayout}
            />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <TerminalPane
            pane={activePane}
            isActive={true}
            onFocus={onFocusPane}
            onClose={onClosePane}
            onSessionCreated={onSessionCreated}
            showHeader={false}
          />
        </div>
      </div>
    );
  }

  // Horizontal split (side by side)
  if (layout.type === 'split-horizontal') {
    const orderedPanes = layout.panes
      .map((id) => openPanes.find((p) => p.id === id))
      .filter(Boolean) as PaneState[];

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-shrink-0 items-center justify-end border-b border-white/5 px-2 py-1">
          <PaneToolbar
            layout={layout}
            paneCount={openPanes.length}
            onChangeLayout={onChangeLayout}
          />
        </div>
        <div ref={containerRef} className="flex flex-1 gap-0 overflow-hidden">
          {orderedPanes.map((pane, i) => (
            <Fragment key={pane.id}>
              <div className="min-w-0 h-full" style={{ width: `${layout.sizes[i]}%` }}>
                <TerminalPane
                  pane={pane}
                  isActive={pane.id === activePaneId}
                  onFocus={onFocusPane}
                  onClose={onClosePane}
                  onSessionCreated={onSessionCreated}
                  showHeader={showHeaders}
                />
              </div>
              {i < orderedPanes.length - 1 && (
                <PaneResizeHandle
                  orientation="horizontal"
                  onResize={(delta) => handleResize(i, delta)}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Vertical split (stacked)
  if (layout.type === 'split-vertical') {
    const orderedPanes = layout.panes
      .map((id) => openPanes.find((p) => p.id === id))
      .filter(Boolean) as PaneState[];

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-shrink-0 items-center justify-end border-b border-white/5 px-2 py-1">
          <PaneToolbar
            layout={layout}
            paneCount={openPanes.length}
            onChangeLayout={onChangeLayout}
          />
        </div>
        <div ref={containerRef} className="flex flex-1 flex-col gap-0 overflow-hidden">
          {orderedPanes.map((pane, i) => (
            <Fragment key={pane.id}>
              <div className="min-h-0 flex-1" style={{ height: `${layout.sizes[i]}%` }}>
                <TerminalPane
                  pane={pane}
                  isActive={pane.id === activePaneId}
                  onFocus={onFocusPane}
                  onClose={onClosePane}
                  onSessionCreated={onSessionCreated}
                  showHeader={showHeaders}
                />
              </div>
              {i < orderedPanes.length - 1 && (
                <PaneResizeHandle
                  orientation="vertical"
                  onResize={(delta) => handleResize(i, delta)}
                />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  // Grid layout
  if (layout.type === 'grid') {
    const orderedPanes = layout.panes
      .map((id) => openPanes.find((p) => p.id === id))
      .filter(Boolean) as PaneState[];

    return (
      <div className="flex h-full flex-col">
        <div className="flex flex-shrink-0 items-center justify-end border-b border-white/5 px-2 py-1">
          <PaneToolbar
            layout={layout}
            paneCount={openPanes.length}
            onChangeLayout={onChangeLayout}
          />
        </div>
        <div
          className="grid flex-1 gap-1 overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
            gridTemplateRows: `repeat(${Math.ceil(orderedPanes.length / layout.columns)}, 1fr)`,
          }}
        >
          {orderedPanes.map((pane) => (
            <div key={pane.id} className="min-h-0 min-w-0 h-full overflow-hidden">
              <TerminalPane
                pane={pane}
                isActive={pane.id === activePaneId}
                onFocus={onFocusPane}
                onClose={onClosePane}
                onSessionCreated={onSessionCreated}
                showHeader={showHeaders}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
