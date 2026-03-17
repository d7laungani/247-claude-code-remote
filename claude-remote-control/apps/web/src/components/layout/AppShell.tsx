'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { spring } from '@/lib/animations';
import { Sidebar, type SidebarMachine, type SidebarProject } from './Sidebar';
import { SessionListPanel, type SessionListItem } from './SessionListPanel';
import { AppHeader } from './AppHeader';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export interface AppShellProps {
  children: React.ReactNode;
  // Sidebar props
  machines?: SidebarMachine[];
  projects?: SidebarProject[];
  selectedMachineId?: string | null;
  onSelectMachine?: (id: string) => void;
  onAddMachine?: () => void;
  onSelectProject?: (projectName: string) => void;
  selectedProjectName?: string | null;
  onEditMachine?: (machine: SidebarMachine) => void;
  onRemoveMachine?: (machine: SidebarMachine) => void;
  canRemoveMachine?: (machine: SidebarMachine) => boolean;
  // Session list props
  sessions?: SessionListItem[];
  selectedSessionId?: string | null;
  onSelectSession?: (session: SessionListItem, openInNewPane?: boolean) => void;
  onNewSession?: () => void;
  onKillSession?: (session: SessionListItem) => void;
  onArchiveSession?: (session: SessionListItem) => void;
  /** Session IDs currently open in multi-terminal panes */
  openPaneSessionIds?: Set<string>;
  // Header props
  currentMachineName?: string;
  currentProjectName?: string;
  onToggleFullscreen?: () => void;
  isFullscreen?: boolean;
  onOpenNotificationSettings?: () => void;
  /** Number of multi-terminal panes open */
  multiPaneCount?: number;
  /** Toggle split view from header */
  onToggleSplitView?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Resize Handle Component
// ═══════════════════════════════════════════════════════════════════════════

function ResizeHandle({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-1 flex-shrink-0 cursor-col-resize',
        'hover:bg-primary/20 transition-colors duration-150',
        className
      )}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AppShell Component
// ═══════════════════════════════════════════════════════════════════════════

export function AppShell({
  children,
  // Sidebar props
  machines = [],
  projects = [],
  selectedMachineId,
  onSelectMachine,
  onAddMachine,
  onSelectProject,
  selectedProjectName,
  onEditMachine,
  onRemoveMachine,
  canRemoveMachine,
  // Session list props
  sessions = [],
  selectedSessionId,
  onSelectSession,
  onNewSession,
  onKillSession,
  onArchiveSession,
  openPaneSessionIds,
  // Header props
  currentMachineName,
  currentProjectName,
  onToggleFullscreen,
  isFullscreen = false,
  onOpenNotificationSettings,
  multiPaneCount,
  onToggleSplitView,
}: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sessionPanelCollapsed, setSessionPanelCollapsed] = useState(false);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleSessionPanelToggle = useCallback(() => {
    setSessionPanelCollapsed((prev) => !prev);
  }, []);

  // In fullscreen mode, hide the sidebar and session list
  if (isFullscreen) {
    return (
      <div className="h-screen-safe bg-background flex flex-col overflow-hidden">
        <AppHeader
          onSidebarToggle={handleSidebarToggle}
          sidebarCollapsed={sidebarCollapsed}
          currentMachineName={currentMachineName}
          currentProjectName={currentProjectName}
          onNewSession={onNewSession}
          onToggleFullscreen={onToggleFullscreen}
          isFullscreen={isFullscreen}
          onOpenNotificationSettings={onOpenNotificationSettings}
          multiPaneCount={multiPaneCount}
          onToggleSplitView={onToggleSplitView}
        />
        <main className="flex flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    );
  }

  return (
    <div className="h-screen-safe bg-background flex flex-col overflow-hidden">
      {/* Header */}
      <AppHeader
        onSidebarToggle={handleSidebarToggle}
        sidebarCollapsed={sidebarCollapsed}
        currentMachineName={currentMachineName}
        currentProjectName={currentProjectName}
        onNewSession={onNewSession}
        onToggleFullscreen={onToggleFullscreen}
        isFullscreen={isFullscreen}
        onOpenNotificationSettings={onOpenNotificationSettings}
      />

      {/* Main Content - 3 Panel Layout */}
      <div className="flex flex-1 gap-1 overflow-hidden p-2">
        {/* Panel 1: Sidebar (Machines & Projects) - Fixed width */}
        <AnimatePresence mode="wait">
          <motion.div
            key={sidebarCollapsed ? 'collapsed' : 'expanded'}
            initial={{ width: sidebarCollapsed ? 56 : 240 }}
            animate={{ width: sidebarCollapsed ? 56 : 240 }}
            exit={{ opacity: 0 }}
            transition={spring.snappy}
            className="h-full flex-shrink-0"
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggle={handleSidebarToggle}
              machines={machines}
              projects={projects}
              selectedMachineId={selectedMachineId}
              onSelectMachine={onSelectMachine}
              onAddMachine={onAddMachine}
              onSelectProject={onSelectProject}
              selectedProjectName={selectedProjectName}
              onEditMachine={onEditMachine}
              onRemoveMachine={onRemoveMachine}
              canRemoveMachine={canRemoveMachine}
            />
          </motion.div>
        </AnimatePresence>

        <ResizeHandle />

        {/* Panel 2: Session List - Collapsible */}
        <motion.div
          animate={{ width: sessionPanelCollapsed ? 0 : 320 }}
          transition={spring.snappy}
          className="h-full flex-shrink-0 overflow-hidden"
        >
          <div className="h-full" style={{ width: 320 }}>
            <SessionListPanel
              sessions={sessions}
              selectedSessionId={selectedSessionId}
              onSelectSession={onSelectSession}
              onNewSession={onNewSession}
              onKillSession={onKillSession}
              onArchiveSession={onArchiveSession}
              openPaneSessionIds={openPaneSessionIds}
              onCollapse={handleSessionPanelToggle}
            />
          </div>
        </motion.div>

        {sessionPanelCollapsed ? (
          <button
            onClick={handleSessionPanelToggle}
            className={cn(
              'flex h-full w-6 flex-shrink-0 items-center justify-center',
              'rounded-md transition-colors',
              'text-white/40 hover:bg-white/5 hover:text-white/70'
            )}
            title="Show sessions"
            aria-label="Show sessions"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        ) : (
          <ResizeHandle />
        )}

        {/* Panel 3: Main Content (Terminal) - Flex grow */}
        <main className="panel flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
