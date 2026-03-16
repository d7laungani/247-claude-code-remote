'use client';

import { useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SessionView } from '@/components/SessionView';
import { useSessionPolling } from '@/contexts/SessionPollingContext';
import type { PaneState } from '@/app/home/types';

interface TerminalPaneProps {
  pane: PaneState;
  isActive: boolean;
  onFocus: (paneId: string) => void;
  onClose: (paneId: string) => void;
  onSessionCreated?: (sessionName: string) => void;
  showHeader: boolean;
}

export function TerminalPane({
  pane,
  isActive,
  onFocus,
  onClose,
  onSessionCreated,
  showHeader,
}: TerminalPaneProps) {
  const { getAllSessions } = useSessionPolling();

  // Look up live session info from polling context
  const sessionInfo = getAllSessions().find(
    (s) => s.name === pane.session.sessionName && s.machineId === pane.session.machineId
  );

  const handleClick = useCallback(() => {
    onFocus(pane.id);
  }, [pane.id, onFocus]);

  const handleClose = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onClose(pane.id);
    },
    [pane.id, onClose]
  );

  const handleMenuClick = useCallback(() => {
    onClose(pane.id);
  }, [pane.id, onClose]);

  const sessionKey = `${pane.session.machineId}-${pane.session.project}-${
    pane.session.sessionName.endsWith('--new') ? 'new' : pane.session.sessionName
  }`;

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col overflow-hidden rounded border',
        'transition-colors duration-150',
        isActive ? 'border-orange-500/40 shadow-[0_0_12px_rgba(249,115,22,0.1)]' : 'border-white/10'
      )}
      onClick={handleClick}
    >
      {/* Pane header */}
      {showHeader && (
        <div
          className={cn(
            'flex h-6 flex-shrink-0 items-center justify-between px-2',
            'border-b transition-colors duration-150',
            isActive ? 'border-orange-500/20 bg-orange-500/5' : 'border-white/5 bg-white/[0.02]'
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            <div
              className={cn(
                'h-2 w-2 rounded-full flex-shrink-0',
                isActive ? 'bg-orange-500' : 'bg-white/20'
              )}
            />
            <span className="truncate text-xs text-white/60">{pane.session.sessionName}</span>
            <span className="truncate text-xs text-white/30">{pane.session.project}</span>
          </div>
          <button
            onClick={handleClose}
            className="rounded p-0.5 text-white/30 hover:bg-white/10 hover:text-white/60"
            aria-label={`Close pane ${pane.session.sessionName}`}
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Terminal content */}
      <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
        <SessionView
          key={sessionKey}
          sessionName={pane.session.sessionName}
          project={pane.session.project}
          agentUrl={pane.agentUrl}
          sessionInfo={sessionInfo}
          environmentId={pane.session.environmentId}
          planningProjectId={pane.session.planningProjectId}
          onMenuClick={handleMenuClick}
          onSessionCreated={onSessionCreated}
          isMobile={false}
        />
      </div>
    </div>
  );
}
