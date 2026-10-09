import React from 'react';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import {
  Service,
  ServerNode,
  SpeedtestResult,
  JellyfinStats,
  JellyseerrStats,
  QbittorrentStats,
  WireguardStats,
  PiholeStats,
} from '../../../types';
import { TopWidgetsGrid } from '../widgets';
import { ErrBox } from '../common';
import {
  DashboardToolbar,
  BoardModalsContainer,
  useHomelabBoardState,
} from './index';
import { useIsMobile } from './boardGrid';
import { saveUserPreferences } from '../../../lib/userPreferences';

export interface HomelabBoardProps {
  services: Service[];
  nodes: ServerNode[];
  loadingNodes: boolean;
  speedtest?: SpeedtestResult | null;
  vpnConnected?: boolean;
  jellyfinStats?: JellyfinStats | null;
  jellyseerrStats?: JellyseerrStats | null;
  qbitStats?: QbittorrentStats | null;
  wgStats?: WireguardStats | null;
  piholeStats?: PiholeStats | null;
  onRunSpeedtest?: () => void;
  isRunningSpeedtest?: boolean;
  onUpdateCardLayout?: (updates: Array<{ id: number; start_col: number; start_row: number; col_span: number; row_span: number }>) => void;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
  onRefresh: () => void;
  onMoveCardCategory?: (serviceId: number, fromCategory: string, toCategory: string) => void;
}

export function HomelabBoard({
  services,
  nodes,
  loadingNodes,
  speedtest,
  vpnConnected,
  jellyfinStats,
  jellyseerrStats,
  qbitStats,
  wgStats,
  piholeStats,
  onRunSpeedtest,
  isRunningSpeedtest,
  onUpdateCardLayout,
  onOpenInspector,
  onRefresh,
  onMoveCardCategory,
}: HomelabBoardProps) {
  const {
    user,
    prefs,
    setPrefs,
    error,
    search,
    setSearch,
    modal,
    setModal,
    modalError,
    viewModal,
    setViewModal,
    serverGaugesModal,
    setServerGaugesModal,
    pironmanModal,
    setPironmanModal,
    categoryModal,
    setCategoryModal,
    newCatName,
    setNewCatName,
    renameModal,
    setRenameModal,
    editing,
    form,
    setForm,
    vpnNotice,
    handleVpnLockedClick,
    isServiceVpnLocked,
    handleCardClick,
    filteredServices,
    hostNode,
    rawCategories,
    unifiedBoardItems,
    sensors,
    handleDragEnd,
    openNew,
    openEdit,
    handleServiceSubmit,
    removeService,
    handleAddCategory,
    handleRenameCategory,
    setWidgetBoardSize,
  } = useHomelabBoardState({
    services,
    nodes,
    vpnConnected,
    onRefresh,
    onOpenInspector,
  });

  const isMobile = useIsMobile();

  return (
    <div className="space-y-6">
      {/* Top Action Toolbar (Always at the very top) */}
      <DashboardToolbar
        search={search}
        onSearchChange={setSearch}
        user={user}
        onOpenCustomize={() => setViewModal(true)}
        onOpenServerGauges={user?.role === 'owner' ? () => setServerGaugesModal(true) : undefined}
        onOpenPironman={user?.role === 'owner' ? () => setPironmanModal(true) : undefined}
        onRefresh={onRefresh}
        onAddService={() => openNew()}
      />

      <ErrBox msg={error} />

      {/* Unified Canvas Dashboard (All services and modular widgets unified) */}
      <ErrorBoundary fallbackTitle="Dashboard Grid" onReset={onRefresh}>
        <TopWidgetsGrid
          prefs={prefs}
          onUpdatePrefs={setPrefs}
          userId={user?.id}
          uptime={hostNode?.uptime}
          speedtest={speedtest}
          onRunSpeedtest={onRunSpeedtest}
          isRunningSpeedtest={isRunningSpeedtest}
          qbitStats={qbitStats}
          piholeStats={piholeStats}
          wgStats={wgStats}
          jellyfinStats={jellyfinStats}
          jellyseerrStats={jellyseerrStats}
          onOpenInspector={onOpenInspector}
          nodes={nodes}
          loadingNodes={loadingNodes}
          isAdmin={user?.role === 'owner'}
          serverGauges={prefs.serverGauges}
          onOpenPironman={() => setPironmanModal(true)}
          onOpenCustomize={() => setViewModal(true)}
          onUpdateServerGauges={(updated) => {
            const next = { ...prefs, serverGauges: updated };
            setPrefs(next);
            saveUserPreferences(user?.id, next);
          }}
          searchQuery={search}
          flatMode={true}
          services={filteredServices}
          onCardClick={handleCardClick}
          onEditService={openEdit}
          onDeleteService={removeService}
          onUpdateCardLayout={onUpdateCardLayout}
          isServiceVpnLocked={isServiceVpnLocked}
        />
      </ErrorBoundary>

      {/* Modals and Notifications Container */}
      <BoardModalsContainer
        user={user}
        prefs={prefs}
        onUpdatePrefs={setPrefs}
        services={services}
        nodes={nodes}
        speedtest={speedtest}
        rawCategories={rawCategories}
        serviceModalOpen={modal}
        onCloseServiceModal={() => setModal(false)}
        serviceForm={form}
        setServiceForm={setForm}
        isEditingService={Boolean(editing)}
        serviceModalError={modalError}
        onSubmitService={handleServiceSubmit}
        categoryModalOpen={categoryModal}
        onCloseCategoryModal={() => setCategoryModal(false)}
        newCatName={newCatName}
        onChangeNewCatName={setNewCatName}
        onAddCategory={handleAddCategory}
        renameModal={renameModal}
        onCloseRenameModal={() => setRenameModal({ open: false, oldName: '', newName: '' })}
        onChangeRenameName={(newName) => setRenameModal(r => ({ ...r, newName }))}
        onRenameCategory={handleRenameCategory}
        customizeModalOpen={viewModal}
        onCloseCustomizeModal={() => setViewModal(false)}
        serverGaugesModalOpen={serverGaugesModal}
        onCloseServerGaugesModal={() => setServerGaugesModal(false)}
        onToggleServerGauge={(nodeId, gaugeKey) => {
          const current = prefs.serverGauges?.[nodeId] || {};
          const currentVal = (current as any)[gaugeKey] !== false;
          const next = {
            ...prefs.serverGauges,
            [nodeId]: {
              ...current,
              [gaugeKey]: !currentVal,
            },
          };
          const updated = { ...prefs, serverGauges: next };
          setPrefs(updated);
          saveUserPreferences(user?.id, updated);
        }}
        onResetServerGauges={() => {
          const updated = { ...prefs, serverGauges: {} };
          setPrefs(updated);
          saveUserPreferences(user?.id, updated);
        }}
        pironmanModalOpen={pironmanModal}
        onClosePironmanModal={() => setPironmanModal(false)}
        onOpenPironmanModal={() => setPironmanModal(true)}
        onToggleSyncPironmanTheme={(enabled, color) => {
          const next = {
            ...prefs,
            syncThemeWithPironman: enabled,
            pironmanAccentColor: color,
          };
          setPrefs(next);
          saveUserPreferences(user?.id, next);
        }}
        vpnNotice={vpnNotice}
      />
    </div>
  );
}
