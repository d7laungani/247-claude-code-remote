import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMultiTerminal } from '@/hooks/useMultiTerminal';
import type { SelectedSession } from '@/app/home/types';

const STORAGE_KEY = '247-multi-terminal-layout';

function makeSession(name: string, machineId = 'machine-1'): SelectedSession {
  return {
    machineId,
    sessionName: name,
    project: 'test-project',
  };
}

describe('useMultiTerminal hook', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};
    vi.spyOn(window.localStorage, 'getItem').mockImplementation((key: string) => {
      return mockStorage[key] || null;
    });
    vi.spyOn(window.localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
    });
    vi.spyOn(window.localStorage, 'removeItem').mockImplementation((key: string) => {
      delete mockStorage[key];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start with no panes', () => {
      const { result } = renderHook(() => useMultiTerminal());
      expect(result.current.openPanes).toEqual([]);
      expect(result.current.activePaneId).toBeNull();
      expect(result.current.layout).toBeNull();
      expect(result.current.isMultiPaneActive).toBe(false);
    });
  });

  describe('openInPane', () => {
    it('should open a session in a new pane', () => {
      const { result } = renderHook(() => useMultiTerminal());
      const session = makeSession('session-1');

      act(() => {
        result.current.openInPane(session, 'http://localhost:3000');
      });

      expect(result.current.openPanes).toHaveLength(1);
      expect(result.current.openPanes[0].session.sessionName).toBe('session-1');
      expect(result.current.openPanes[0].agentUrl).toBe('http://localhost:3000');
      expect(result.current.activePaneId).toBe(result.current.openPanes[0].id);
    });

    it('should open multiple sessions in separate panes', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      expect(result.current.openPanes).toHaveLength(2);
      expect(result.current.isMultiPaneActive).toBe(true);
      expect(result.current.layout?.type).toBe('split-horizontal');
    });

    it('should not duplicate an already open session', () => {
      const { result } = renderHook(() => useMultiTerminal());
      const session = makeSession('session-1');

      act(() => {
        result.current.openInPane(session, 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(session, 'http://localhost:3000');
      });

      expect(result.current.openPanes).toHaveLength(1);
    });

    it('should set active pane to existing session when reopened', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      const firstPaneId = result.current.openPanes[0].id;

      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });
      expect(result.current.activePaneId).not.toBe(firstPaneId);

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      expect(result.current.activePaneId).toBe(firstPaneId);
    });

    it('should respect max 4 panes limit', () => {
      const { result } = renderHook(() => useMultiTerminal());

      for (let i = 1; i <= 5; i++) {
        act(() => {
          result.current.openInPane(makeSession(`session-${i}`), 'http://localhost:3000');
        });
      }

      expect(result.current.openPanes).toHaveLength(4);
    });

    it('should preserve layout type when adding 3rd pane (split-horizontal from 2 panes)', () => {
      const { result } = renderHook(() => useMultiTerminal());

      for (let i = 1; i <= 3; i++) {
        act(() => {
          result.current.openInPane(makeSession(`session-${i}`), 'http://localhost:3000');
        });
      }

      // Layout type is preserved from the 2-pane state (split-horizontal)
      expect(result.current.layout?.type).toBe('split-horizontal');
      // Can explicitly switch to grid
      act(() => {
        result.current.changeLayout('grid');
      });
      expect(result.current.layout?.type).toBe('grid');
    });
  });

  describe('closePane', () => {
    it('should remove a pane', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      const paneToClose = result.current.openPanes[0].id;
      act(() => {
        result.current.closePane(paneToClose);
      });

      expect(result.current.openPanes).toHaveLength(1);
      expect(result.current.openPanes[0].session.sessionName).toBe('session-2');
    });

    it('should update active pane when active is closed', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      const activePaneId = result.current.activePaneId!;
      act(() => {
        result.current.closePane(activePaneId);
      });

      expect(result.current.activePaneId).not.toBe(activePaneId);
      expect(result.current.activePaneId).not.toBeNull();
    });

    it('should set layout to single when only 1 pane remains', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      act(() => {
        result.current.closePane(result.current.openPanes[0].id);
      });

      expect(result.current.layout?.type).toBe('single');
    });
  });

  describe('closeAllPanes', () => {
    it('should remove all panes', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });
      act(() => {
        result.current.closeAllPanes();
      });

      expect(result.current.openPanes).toHaveLength(0);
      expect(result.current.activePaneId).toBeNull();
      expect(result.current.layout).toBeNull();
    });
  });

  describe('changeLayout', () => {
    it('should change layout type', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      act(() => {
        result.current.changeLayout('split-vertical');
      });
      expect(result.current.layout?.type).toBe('split-vertical');

      act(() => {
        result.current.changeLayout('grid');
      });
      expect(result.current.layout?.type).toBe('grid');

      act(() => {
        result.current.changeLayout('single');
      });
      expect(result.current.layout?.type).toBe('single');
    });
  });

  describe('resizePanes', () => {
    it('should update pane sizes for split layout', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      act(() => {
        result.current.resizePanes([30, 70]);
      });

      const layout = result.current.layout;
      expect(layout?.type).toBe('split-horizontal');
      if (layout?.type === 'split-horizontal') {
        expect(layout.sizes).toEqual([30, 70]);
      }
    });

    it('should not update sizes for grid layout', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });
      act(() => {
        result.current.changeLayout('grid');
      });

      act(() => {
        result.current.resizePanes([30, 70]);
      });

      expect(result.current.layout?.type).toBe('grid');
    });
  });

  describe('swapPanes', () => {
    it('should swap two panes', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      act(() => {
        result.current.openInPane(makeSession('session-2'), 'http://localhost:3000');
      });

      const pane1 = result.current.openPanes[0];
      const pane2 = result.current.openPanes[1];

      act(() => {
        result.current.swapPanes(pane1.id, pane2.id);
      });

      expect(result.current.openPanes[0].id).toBe(pane2.id);
      expect(result.current.openPanes[1].id).toBe(pane1.id);
    });
  });

  describe('isSessionOpen', () => {
    it('should return true for open sessions', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1', 'machine-1'), 'http://localhost:3000');
      });

      expect(result.current.isSessionOpen('machine-1', 'session-1')).toBe(true);
      expect(result.current.isSessionOpen('machine-1', 'session-2')).toBe(false);
      expect(result.current.isSessionOpen('machine-2', 'session-1')).toBe(false);
    });
  });

  describe('getActivePane', () => {
    it('should return the active pane', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });

      const activePane = result.current.getActivePane();
      expect(activePane).not.toBeNull();
      expect(activePane?.session.sessionName).toBe('session-1');
    });

    it('should return null when no panes', () => {
      const { result } = renderHook(() => useMultiTerminal());
      expect(result.current.getActivePane()).toBeNull();
    });
  });

  describe('localStorage persistence', () => {
    it('should save state to localStorage when panes are open', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });

      expect(mockStorage[STORAGE_KEY]).toBeDefined();
      const stored = JSON.parse(mockStorage[STORAGE_KEY]);
      expect(stored.openPanes).toHaveLength(1);
    });

    it('should remove from localStorage when all panes closed', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });
      expect(mockStorage[STORAGE_KEY]).toBeDefined();

      act(() => {
        result.current.closeAllPanes();
      });
      expect(mockStorage[STORAGE_KEY]).toBeUndefined();
    });
  });

  describe('splitPane', () => {
    it('should create a new pane from an existing one', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });

      const paneId = result.current.openPanes[0].id;
      act(() => {
        result.current.splitPane(paneId, 'horizontal');
      });

      expect(result.current.openPanes).toHaveLength(2);
      expect(result.current.layout?.type).toBe('split-horizontal');
    });

    it('should create vertical split', () => {
      const { result } = renderHook(() => useMultiTerminal());

      act(() => {
        result.current.openInPane(makeSession('session-1'), 'http://localhost:3000');
      });

      act(() => {
        result.current.splitPane(result.current.openPanes[0].id, 'vertical');
      });

      expect(result.current.layout?.type).toBe('split-vertical');
    });

    it('should not split beyond max panes', () => {
      const { result } = renderHook(() => useMultiTerminal());

      for (let i = 1; i <= 4; i++) {
        act(() => {
          result.current.openInPane(makeSession(`session-${i}`), 'http://localhost:3000');
        });
      }

      act(() => {
        result.current.splitPane(result.current.openPanes[0].id, 'horizontal');
      });

      expect(result.current.openPanes).toHaveLength(4);
    });
  });
});
