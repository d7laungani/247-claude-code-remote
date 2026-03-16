'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { SelectedSession, PaneState, PaneLayout } from '@/app/home/types';

const MAX_PANES = 4;
const STORAGE_KEY = '247-multi-terminal-layout';

interface MultiTerminalState {
  openPanes: PaneState[];
  activePaneId: string | null;
  layout: PaneLayout | null;
}

function generatePaneId(): string {
  return `pane-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function computeLayout(panes: PaneState[], currentLayout: PaneLayout | null): PaneLayout | null {
  if (panes.length === 0) return null;
  if (panes.length === 1) return { type: 'single', paneId: panes[0].id };

  const paneIds = panes.map((p) => p.id);
  const sizes = panes.map(() => 100 / panes.length);

  // Preserve current layout type if possible
  if (currentLayout && currentLayout.type !== 'single') {
    if (currentLayout.type === 'grid') {
      return { type: 'grid', panes: paneIds, columns: panes.length <= 2 ? 2 : 2 };
    }
    return { type: currentLayout.type, panes: paneIds, sizes };
  }

  // Default: horizontal split for 2 panes, grid for 3+
  if (panes.length === 2) {
    return { type: 'split-horizontal', panes: paneIds, sizes };
  }
  return { type: 'grid', panes: paneIds, columns: 2 };
}

function loadFromStorage(): Partial<MultiTerminalState> | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function saveToStorage(state: MultiTerminalState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage may be full or unavailable
  }
}

export function useMultiTerminal() {
  const [openPanes, setOpenPanes] = useState<PaneState[]>([]);
  const [activePaneId, setActivePaneId] = useState<string | null>(null);
  const [layout, setLayout] = useState<PaneLayout | null>(null);
  const initialized = useRef(false);

  // Load persisted layout on mount (panes without full session data - just layout preference)
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const stored = loadFromStorage();
    if (stored?.layout) {
      // We only restore the layout type preference, not the actual panes
      // Panes are populated when sessions are opened
    }
  }, []);

  // Persist state changes
  useEffect(() => {
    if (openPanes.length > 0) {
      saveToStorage({ openPanes, activePaneId, layout });
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [openPanes, activePaneId, layout]);

  // Sync layout with openPanes — ensures layout.panes IDs always match openPanes IDs.
  // This is critical because React Strict Mode double-invokes state updaters,
  // which can cause layout.panes and openPanes to have mismatched IDs if layout
  // is computed inside a setOpenPanes updater.
  const prevPaneCountRef = useRef(0);
  useEffect(() => {
    const prevCount = prevPaneCountRef.current;
    prevPaneCountRef.current = openPanes.length;

    // Only recompute layout when pane count changes (add/remove)
    if (openPanes.length !== prevCount) {
      setLayout((currentLayout) => computeLayout(openPanes, currentLayout));
    }
  }, [openPanes]);

  const openInPane = useCallback(
    (session: SelectedSession, agentUrl: string) => {
      // Generate ID outside updater to keep it stable across React Strict Mode double-invocations
      const newPaneId = generatePaneId();

      setOpenPanes((prev) => {
        // Check if session is already open
        const existing = prev.find(
          (p) =>
            p.session.machineId === session.machineId &&
            p.session.sessionName === session.sessionName
        );
        if (existing) {
          // setActivePaneId will be handled after this updater
          return prev;
        }

        if (prev.length >= MAX_PANES) {
          // Replace active pane
          const activeId = activePaneId || prev[prev.length - 1]?.id;
          return prev.map((p) =>
            p.id === activeId ? { ...p, session, agentUrl } : p
          );
        }

        const newPane: PaneState = {
          id: newPaneId,
          session,
          agentUrl,
        };
        return [...prev, newPane];
      });

      // Set active pane — runs after the openPanes update is committed
      // Use functional updater on openPanes to read the committed state
      // without mutating it, just to determine which pane to activate.
      setOpenPanes((current) => {
        const existing = current.find(
          (p) =>
            p.session.machineId === session.machineId &&
            p.session.sessionName === session.sessionName
        );
        if (existing) {
          setActivePaneId(existing.id);
        }
        return current; // no change
      });
    },
    [activePaneId]
  );

  const closePane = useCallback(
    (paneId: string) => {
      setOpenPanes((prev) => {
        const newPanes = prev.filter((p) => p.id !== paneId);
        if (activePaneId === paneId) {
          setActivePaneId(newPanes.length > 0 ? newPanes[newPanes.length - 1].id : null);
        }
        return newPanes;
      });
      // Layout will be synced by the useEffect
    },
    [activePaneId]
  );

  const splitPane = useCallback(
    (paneId: string, direction: 'horizontal' | 'vertical') => {
      const newPaneId = generatePaneId();

      setOpenPanes((prev) => {
        if (prev.length >= MAX_PANES) return prev;

        const sourcePane = prev.find((p) => p.id === paneId);
        if (!sourcePane) return prev;

        const newPane: PaneState = {
          id: newPaneId,
          session: sourcePane.session,
          agentUrl: sourcePane.agentUrl,
        };

        const newPanes = [...prev, newPane];
        const paneIds = newPanes.map((p) => p.id);
        const sizes = newPanes.map(() => 100 / newPanes.length);

        if (newPanes.length === 2) {
          setLayout({
            type: direction === 'horizontal' ? 'split-horizontal' : 'split-vertical',
            panes: paneIds,
            sizes,
          });
        } else {
          setLayout({ type: 'grid', panes: paneIds, columns: 2 });
        }

        setActivePaneId(newPane.id);
        return newPanes;
      });
    },
    []
  );

  const changeLayout = useCallback(
    (newLayoutType: PaneLayout['type']) => {
      setLayout((prev) => {
        if (openPanes.length === 0) return null;
        if (openPanes.length === 1) return { type: 'single', paneId: openPanes[0].id };

        const paneIds = openPanes.map((p) => p.id);
        const sizes = openPanes.map(() => 100 / openPanes.length);

        switch (newLayoutType) {
          case 'single':
            return { type: 'single', paneId: activePaneId || paneIds[0] };
          case 'split-horizontal':
            return { type: 'split-horizontal', panes: paneIds, sizes };
          case 'split-vertical':
            return { type: 'split-vertical', panes: paneIds, sizes };
          case 'grid':
            return { type: 'grid', panes: paneIds, columns: 2 };
          default:
            return prev;
        }
      });
    },
    [openPanes, activePaneId]
  );

  const resizePanes = useCallback((sizes: number[]) => {
    setLayout((prev) => {
      if (!prev || prev.type === 'single' || prev.type === 'grid') return prev;
      return { ...prev, sizes };
    });
  }, []);

  const swapPanes = useCallback((paneId1: string, paneId2: string) => {
    setOpenPanes((prev) => {
      const idx1 = prev.findIndex((p) => p.id === paneId1);
      const idx2 = prev.findIndex((p) => p.id === paneId2);
      if (idx1 === -1 || idx2 === -1) return prev;

      const newPanes = [...prev];
      [newPanes[idx1], newPanes[idx2]] = [newPanes[idx2], newPanes[idx1]];
      return newPanes;
    });
  }, []);

  const updatePaneSession = useCallback(
    (paneId: string, session: SelectedSession, agentUrl: string) => {
      setOpenPanes((prev) =>
        prev.map((p) => (p.id === paneId ? { ...p, session, agentUrl } : p))
      );
    },
    []
  );

  const isMultiPaneActive = openPanes.length > 1;

  const getActivePane = useCallback((): PaneState | null => {
    return openPanes.find((p) => p.id === activePaneId) || null;
  }, [openPanes, activePaneId]);

  const isSessionOpen = useCallback(
    (machineId: string, sessionName: string): boolean => {
      return openPanes.some(
        (p) => p.session.machineId === machineId && p.session.sessionName === sessionName
      );
    },
    [openPanes]
  );

  const closeAllPanes = useCallback(() => {
    setOpenPanes([]);
    setActivePaneId(null);
    setLayout(null);
  }, []);

  return {
    openPanes,
    activePaneId,
    layout,
    isMultiPaneActive,
    openInPane,
    closePane,
    closeAllPanes,
    splitPane,
    changeLayout,
    setLayout,
    resizePanes,
    swapPanes,
    setActivePaneId,
    updatePaneSession,
    getActivePane,
    isSessionOpen,
  };
}
