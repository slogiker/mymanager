import React from 'react';
import { Lock } from 'lucide-react';
import { Service, ServerNode, SpeedtestResult } from '../../../types';
import { UserPreferences } from '../../../lib/userPreferences';
import { ServerGaugesModal } from '../widgets';
import { PironmanConfigModal } from '../PironmanConfigModal';
import {
  ServiceFormModal,
  ServiceForm,
  CategoryModals,
  CustomizeGridModal,
} from './index';

export interface BoardModalsContainerProps {
  user: any;
  prefs: UserPreferences;
  onUpdatePrefs: (updated: UserPreferences) => void;
  services: Service[];
  nodes: ServerNode[];
  speedtest?: SpeedtestResult | null;
  rawCategories: string[];

  // Service form modal
  serviceModalOpen: boolean;
  onCloseServiceModal: () => void;
  serviceForm: ServiceForm;
  setServiceForm: React.Dispatch<React.SetStateAction<ServiceForm>>;
  isEditingService: boolean;
  serviceModalError: string;
  onSubmitService: (e: React.FormEvent) => void;

  // Category modals
  categoryModalOpen: boolean;
  onCloseCategoryModal: () => void;
  newCatName: string;
  onChangeNewCatName: (name: string) => void;
  onAddCategory: () => void;
  renameModal: { open: boolean; oldName: string; newName: string };
  onCloseRenameModal: () => void;
  onChangeRenameName: (name: string) => void;
  onRenameCategory: () => void;

  // Customize modal
  customizeModalOpen: boolean;
  onCloseCustomizeModal: () => void;

  // Server gauges modal
  serverGaugesModalOpen: boolean;
  onCloseServerGaugesModal: () => void;
  onToggleServerGauge: (nodeId: string, gaugeKey: string) => void;
  onResetServerGauges: () => void;

  // Pironman modal
  pironmanModalOpen: boolean;
  onClosePironmanModal: () => void;
  onOpenPironmanModal?: () => void;
  onToggleSyncPironmanTheme: (enabled: boolean, color: string) => void;

  // VPN notice
  vpnNotice: { title: string; url: string } | null;
}

export function BoardModalsContainer({
  user,
  prefs,
  onUpdatePrefs,
  services,
  nodes,
  speedtest,
  rawCategories,
  serviceModalOpen,
  onCloseServiceModal,
  serviceForm,
  setServiceForm,
  isEditingService,
  serviceModalError,
  onSubmitService,
  categoryModalOpen,
  onCloseCategoryModal,
  newCatName,
  onChangeNewCatName,
  onAddCategory,
  renameModal,
  onCloseRenameModal,
  onChangeRenameName,
  onRenameCategory,
  customizeModalOpen,
  onCloseCustomizeModal,
  serverGaugesModalOpen,
  onCloseServerGaugesModal,
  onToggleServerGauge,
  onResetServerGauges,
  pironmanModalOpen,
  onClosePironmanModal,
  onOpenPironmanModal,
  onToggleSyncPironmanTheme,
  vpnNotice,
}: BoardModalsContainerProps) {
  const isOwner = user?.role === 'owner';

  return (
    <>
      {/* Service Add/Edit Modal */}
      <ServiceFormModal
        open={serviceModalOpen}
        onClose={onCloseServiceModal}
        form={serviceForm}
        setForm={setServiceForm}
        isEditing={isEditingService}
        modalError={serviceModalError}
        onSubmit={onSubmitService}
      />

      {/* Category Creation & Rename Modals */}
      <CategoryModals
        categoryModal={categoryModalOpen}
        onCloseCategoryModal={onCloseCategoryModal}
        newCatName={newCatName}
        onChangeNewCatName={onChangeNewCatName}
        onAddCategory={onAddCategory}
        renameModal={renameModal}
        onCloseRenameModal={onCloseRenameModal}
        onChangeRenameName={onChangeRenameName}
        onRenameCategory={onRenameCategory}
      />

      {/* Unified Layered Settings & Customization Modal */}
      <CustomizeGridModal
        open={customizeModalOpen}
        onClose={onCloseCustomizeModal}
        prefs={prefs}
        onUpdatePrefs={onUpdatePrefs}
        userId={user?.id}
        services={services}
        orderedCategories={rawCategories}
        nodes={nodes}
        speedtest={speedtest}
        onToggleServerGauge={onToggleServerGauge}
        onResetServerGauges={onResetServerGauges}
        onOpenPironman={onOpenPironmanModal}
        isOwner={isOwner}
      />

      {/* Server Gauges Configuration Modal */}
      {isOwner && (
        <ServerGaugesModal
          open={serverGaugesModalOpen}
          onClose={onCloseServerGaugesModal}
          nodes={nodes}
          speedtest={speedtest}
          serverGauges={prefs.serverGauges}
          onToggleGauge={onToggleServerGauge}
          onResetGauges={onResetServerGauges}
        />
      )}

      {/* Pironman 5 RGB Configuration Modal */}
      {isOwner && (
        <PironmanConfigModal
          open={pironmanModalOpen}
          onClose={onClosePironmanModal}
          syncThemeWithPironman={Boolean(prefs.syncThemeWithPironman)}
          onToggleSyncTheme={onToggleSyncPironmanTheme}
        />
      )}

      {/* VPN / LAN Locked Host Toast Notification */}
      {vpnNotice && (
        <div className="fixed bottom-6 right-6 max-w-md p-4 rounded-2xl border border-amber-500/40 bg-[#16181f]/95 text-slate-200 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-400">VPN Connection Required</h4>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                <span className="font-semibold text-white">{vpnNotice.title}</span> is hosted on a protected private LAN. Please enable your WireGuard VPN tunnel to connect.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
