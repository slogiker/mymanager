import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  GRID_CONSTANTS,
  CardPosition,
  layoutCategoryCards,
  getFillerCells,
  computePushedLayout,
} from '../../../lib/cardGridEngine';
import { Link } from 'react-router-dom';
import { ErrorBoundary } from '../../common/ErrorBoundary';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import {
  Search,
  FolderPlus,
  Sliders,
  RefreshCw,
  DownloadCloud,
  Plus,
  LayoutGrid,
  Layers,
  Lock,
  Shield,
  X,
  Server,
  Activity,
  User as UserIcon,
  ChevronDown,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Copy,
  Edit2,
  Trash2,
  Film,
  Tv,
  Play,
  Pause,
  ArrowDown,
  ArrowUp,
  Maximize2,
  Bookmark,
  HardDrive,
} from 'lucide-react';
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
import { useAuth } from '../../../hooks/useAuth';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../../../lib/userPreferences';
import { api } from '../../../lib/api';
import { TimeWidget, NotesWidget, MultiServerNodesWidget, QbittorrentWidget } from '../widgets';
import { Modal, Field, ErrBox, ServiceIcon } from '../common';
import { SortableCategoryColumn } from './SortableCategoryColumn';

export interface ServiceForm {
  title: string;
  url: string;
  description: string;
  icon: string;
  category: string;
  is_private: boolean;
  requires_vpn: boolean;
}

const SVC_EMPTY: ServiceForm = {
  title: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  is_private: false,
  requires_vpn: false,
};

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
  const { user } = useAuth();
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [viewModal, setViewModal] = useState<boolean>(false);
  const [categoryModal, setCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [renameModal, setRenameModal] = useState<{ open: boolean; oldName: string; newName: string }>({
    open: false,
    oldName: '',
    newName: '',
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(SVC_EMPTY);
  const [testingUrl, setTestingUrl] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    status: 'online' | 'error' | 'offline' | 'timeout';
    statusCode?: number;
    statusText?: string;
    error?: string;
    latency?: string;
  } | null>(null);

  const [vpnNotice, setVpnNotice] = useState<{ title: string; url: string } | null>(null);

  const handleVpnLockedClick = (title: string, url: string) => {
    setVpnNotice({ title, url });
  };

  useEffect(() => {
    if (vpnNotice) {
      const timer = setTimeout(() => setVpnNotice(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [vpnNotice]);

  const [copiedUrlId, setCopiedUrlId] = useState<number | null>(null);

  const isServiceVpnLocked = (s: Service) => {
    const isVpnRequired = Boolean(s.requires_vpn);
    const isLanOrLocal =
      s.url.includes('192.168.') ||
      s.url.includes('10.') ||
      s.url.includes('.home.arpa') ||
      s.url.includes('.local');
    return (isVpnRequired || isLanOrLocal) && !vpnConnected;
  };


  const formatSeconds = (sec: number): string => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));

  useEffect(() => {
    const onPrefsChange = () => setPrefs(getUserPreferences(user?.id));
    window.addEventListener('mymanager_prefs_changed', onPrefsChange);
    return () => window.removeEventListener('mymanager_prefs_changed', onPrefsChange);
  }, [user?.id]);

  // Extract all categories including custom ones
  const rawCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => set.add(s.category?.trim() || 'Services'));
    (prefs.customCategories || []).forEach(c => set.add(c.trim()));
    if (set.size === 0) set.add('Services');
    return Array.from(set).filter(Boolean);
  }, [services, prefs.customCategories]);

  // Order categories based on user preferences
  const orderedCategories = useMemo(() => {
    const order = prefs.categoryOrder || [];
    const remaining = rawCategories.filter(c => !order.includes(c));
    const sorted = [...order.filter(c => rawCategories.includes(c)), ...remaining];
    return sorted;
  }, [rawCategories, prefs.categoryOrder]);

  // Drag and drop sensor configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedCategories.indexOf(active.id as string);
    const newIndex = orderedCategories.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(orderedCategories, oldIndex, newIndex);
      const updated = { ...prefs, categoryOrder: newOrder };
      setPrefs(updated);
      saveUserPreferences(user?.id, updated);
    }
  };

  const testUrl = async () => {
    if (!form.url || !form.url.startsWith('http')) {
      setTestResult({
        status: 'offline',
        error: 'Please enter a valid http:// or https:// URL first',
        latency: '0ms',
      });
      return;
    }
    setTestingUrl(true);
    setTestResult(null);
    try {
      const res = await api.post<any>('/services/test', { url: form.url });
      setTestResult(res);
    } catch (e) {
      setTestResult({
        status: 'offline',
        error: (e as Error).message || 'Connection test failed',
        latency: '-',
      });
    } finally {
      setTestingUrl(false);
    }
  };

  const setFormField = (k: keyof ServiceForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const openNew = (cat?: string) => {
    setEditing(null);
    setForm({ ...SVC_EMPTY, category: cat || '' });
    setModalError('');
    setTestResult(null);
    setTestingUrl(false);
    setModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      title: s.title || '',
      url: s.url || '',
      description: s.description || '',
      icon: s.icon || '',
      category: s.category || '',
      is_private: !!s.is_private,
      requires_vpn: !!s.requires_vpn,
    });
    setModalError('');
    setTestResult(null);
    setTestingUrl(false);
    setModal(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setModalError('');
    try {
      if (editing) await api.put(`/services/${editing.id}`, form);
      else await api.post('/services', form);
      setModal(false);
      setModalError('');
      onRefresh();
    } catch (e) {
      setModalError((e as Error).message);
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Delete service?')) return;
    try {
      await api.delete(`/services/${id}`);
      onRefresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const name = newCatName.trim();
    const updatedCustom = Array.from(new Set([...(prefs.customCategories || []), name]));
    const updatedOrder = [...(prefs.categoryOrder || []), name];
    const updated = { ...prefs, customCategories: updatedCustom, categoryOrder: updatedOrder };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
    setNewCatName('');
    setCategoryModal(false);
  };

  const handleRenameCategory = async () => {
    const { oldName, newName } = renameModal;
    if (!newName.trim() || newName === oldName) {
      setRenameModal({ open: false, oldName: '', newName: '' });
      return;
    }
    const trimmed = newName.trim();
    // Update any services that belong to oldName
    const matches = services.filter(s => (s.category?.trim() || 'Services') === oldName);
    for (const s of matches) {
      try {
        await api.put(`/services/${s.id}`, { ...s, category: trimmed });
      } catch (err) {
        console.error(err);
      }
    }
    // Update prefs
    const updatedCustom = (prefs.customCategories || []).map(c => c === oldName ? trimmed : c);
    const updatedOrder = (prefs.categoryOrder || []).map(c => c === oldName ? trimmed : c);
    const updatedWidths = { ...(prefs.categoryWidths || {}) };
    if (updatedWidths[oldName]) {
      updatedWidths[trimmed] = updatedWidths[oldName];
      delete updatedWidths[oldName];
    }
    const updated = { ...prefs, customCategories: updatedCustom, categoryOrder: updatedOrder, categoryWidths: updatedWidths };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
    setRenameModal({ open: false, oldName: '', newName: '' });
    onRefresh();
  };

  const handleMoveCardCategory = async (serviceId: number, fromCat: string, toCat: string) => {
    if (!toCat || fromCat === toCat) return;

    // Check if fromCat has any other services left
    const remainingInFrom = services.filter(
      (s) => s.id !== serviceId && (s.category?.trim() || 'Services') === fromCat
    );

    let updatedPrefs = { ...prefs };
    let prefsChanged = false;

    if (remainingInFrom.length === 0) {
      // Category is now empty - remove it from customCategories, categoryOrder, and categoryWidths
      const newCustom = (prefs.customCategories || []).filter((c) => c !== fromCat);
      const newOrder = (prefs.categoryOrder || []).filter((c) => c !== fromCat);
      const newWidths = { ...(prefs.categoryWidths || {}) };
      delete newWidths[fromCat];

      updatedPrefs = {
        ...prefs,
        customCategories: newCustom,
        categoryOrder: newOrder,
        categoryWidths: newWidths,
      };
      prefsChanged = true;
    }

    if (!(updatedPrefs.categoryOrder || []).includes(toCat)) {
      updatedPrefs = {
        ...updatedPrefs,
        categoryOrder: [...(updatedPrefs.categoryOrder || []), toCat],
      };
      prefsChanged = true;
    }

    if (prefsChanged) {
      setPrefs(updatedPrefs);
      saveUserPreferences(user?.id, updatedPrefs);
    }

    if (onMoveCardCategory) {
      onMoveCardCategory(serviceId, fromCat, toCat);
    } else {
      const s = services.find((x) => x.id === serviceId);
      if (s) {
        try {
          await api.put(`/services/${serviceId}`, { ...s, category: toCat });
          onRefresh();
        } catch (err) {
          console.error('Failed to move service category', err);
        }
      }
    }
  };

  const toggleCategoryHide = (cat: string) => {
    const isHidden = prefs.hiddenCategories.includes(cat);
    const updatedList = isHidden
      ? prefs.hiddenCategories.filter(c => c !== cat)
      : [...prefs.hiddenCategories, cat];
    const updated = { ...prefs, hiddenCategories: updatedList };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
  };

  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const toggleCategoryExpand = (cat: string) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  const toggleServiceHide = (serviceId: number) => {
    const current = prefs.hiddenServices || [];
    const updated = current.includes(serviceId)
      ? current.filter(id => id !== serviceId)
      : [...current, serviceId];
    const nextPrefs = { ...prefs, hiddenServices: updated };
    setPrefs(nextPrefs);
    saveUserPreferences(user?.id, nextPrefs);
  };

  // Filtered services (respects hiddenServices preference)
  const filteredServices = useMemo(() => {
    return services.filter(s =>
      !prefs.hiddenServices?.includes(s.id) &&
      (
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        (s.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (s.category || '').toLowerCase().includes(search.toLowerCase())
      )
    );
  }, [services, search, prefs.hiddenServices]);

  const flatGridRef = useRef<HTMLDivElement>(null);
  const preventClickRef = useRef<boolean>(false);

  const handleCardClick = (s: Service, e?: React.MouseEvent) => {
    if (preventClickRef.current) {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
    if (isServiceVpnLocked(s)) {
      handleVpnLockedClick(s.title, s.url);
      return;
    }
    if (!s.url || s.url === '#') {
      if (s.telemetryType && onOpenInspector) {
        onOpenInspector(s.telemetryType);
      }
    } else {
      window.open(s.url, '_blank', 'noopener,noreferrer');
    }
  };

  // 8-column layout calculation for flat grid view
  const placedFlatCards = useMemo(() => {
    return layoutCategoryCards(filteredServices, GRID_CONSTANTS.FLAT_COLS);
  }, [filteredServices]);

  const [flatLivePushedCards, setFlatLivePushedCards] = useState<(Service & CardPosition)[] | null>(null);
  const flatLivePushedRef = useRef(flatLivePushedCards);
  flatLivePushedRef.current = flatLivePushedCards;

  const activeFlatCards = flatLivePushedCards || placedFlatCards;

  const [flatResizing, setFlatResizing] = useState<{
    id: number;
    startCol: number;
    startRow: number;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  const [flatCardDragging, setFlatCardDragging] = useState<{
    id: number;
    startCol: number;
    startRow: number;
    colSpan: number;
    rowSpan: number;
  } | null>(null);

  const flatFillerCells = useMemo(() => {
    const isInteracting = flatResizing !== null || flatCardDragging !== null;
    return getFillerCells(activeFlatCards, GRID_CONSTANTS.FLAT_COLS, isInteracting ? 4 : 3);
  }, [activeFlatCards, flatResizing, flatCardDragging]);

  const handleStartFlatCardDrag = (e: React.MouseEvent, card: Service & CardPosition) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.resize-handle') ||
      target.closest('[data-no-drag]')
    ) {
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    let isDragActive = false;

    const gridRect = flatGridRef.current ? flatGridRef.current.getBoundingClientRect() : null;
    const gridWidth = flatGridRef.current ? flatGridRef.current.clientWidth : 960;
    const colWidth = (gridWidth - (GRID_CONSTANTS.FLAT_COLS - 1) * GRID_CONSTANTS.GAP) / GRID_CONSTANTS.FLAT_COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT + GRID_CONSTANTS.GAP;

    const grabOffsetCol = gridRect ? Math.floor((startX - gridRect.left) / colWidth) - card.startCol : 0;
    const grabOffsetRow = gridRect ? Math.floor((startY - gridRect.top) / rowHeight) - card.startRow : 0;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dist = Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY);
      if (!isDragActive) {
        if (dist < 6) return;
        isDragActive = true;
        preventClickRef.current = true;
      }

      if (!flatGridRef.current) return;
      const currentGridRect = flatGridRef.current.getBoundingClientRect();
      const currentX = moveEvent.clientX - currentGridRect.left;
      const currentY = moveEvent.clientY - currentGridRect.top;

      const rawCol = Math.floor(currentX / colWidth) - grabOffsetCol;
      const rawRow = Math.floor(currentY / rowHeight) - grabOffsetRow;

      const targetCol = Math.max(0, Math.min(GRID_CONSTANTS.FLAT_COLS - card.colSpan, rawCol));
      const targetRow = Math.max(0, Math.min(GRID_CONSTANTS.MAX_ROWS - 1, rawRow));

      const candidate: CardPosition = {
        id: card.id,
        startCol: targetCol,
        startRow: targetRow,
        colSpan: card.colSpan,
        rowSpan: card.rowSpan,
      };

      const pushedLayout = computePushedLayout(candidate, placedFlatCards, GRID_CONSTANTS.FLAT_COLS);
      flatLivePushedRef.current = pushedLayout;
      setFlatCardDragging(candidate);
      setFlatLivePushedCards(pushedLayout);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      if (isDragActive) {
        const finalLayout = flatLivePushedRef.current;
        if (finalLayout && onUpdateCardLayout) {
          const changedCards: Array<{
            id: number;
            start_col: number;
            start_row: number;
            col_span: number;
            row_span: number;
          }> = [];

          for (const item of finalLayout) {
            const original = placedFlatCards.find((c) => c.id === item.id);
            if (
              !original ||
              original.startCol !== item.startCol ||
              original.startRow !== item.startRow ||
              original.colSpan !== item.colSpan ||
              original.rowSpan !== item.rowSpan
            ) {
              changedCards.push({
                id: item.id,
                start_col: item.startCol,
                start_row: item.startRow,
                col_span: item.colSpan,
                row_span: item.rowSpan,
              });
            }
          }

          if (changedCards.length > 0) {
            onUpdateCardLayout(changedCards);
          }
        }

        preventClickRef.current = true;
        setTimeout(() => {
          preventClickRef.current = false;
        }, 150);
      } else {
        preventClickRef.current = false;
      }

      flatLivePushedRef.current = null;
      setFlatCardDragging(null);
      setFlatLivePushedCards(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleStartFlatResize = (
    e: React.MouseEvent,
    card: Service & CardPosition,
    direction: 'se' | 'top' = 'se'
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const initialColSpan = card.colSpan;
    const initialRowSpan = card.rowSpan;
    const initialStartCol = card.startCol;
    const initialStartRow = card.startRow;
    const gridWidth = flatGridRef.current ? flatGridRef.current.clientWidth : 960;
    const colWidth = (gridWidth - (GRID_CONSTANTS.FLAT_COLS - 1) * GRID_CONSTANTS.GAP) / GRID_CONSTANTS.FLAT_COLS;
    const rowHeight = GRID_CONSTANTS.CELL_HEIGHT;

    const initialCandidate: CardPosition = {
      id: card.id,
      startCol: initialStartCol,
      startRow: initialStartRow,
      colSpan: initialColSpan,
      rowSpan: initialRowSpan,
    };
    setFlatResizing(initialCandidate);
    setFlatLivePushedCards(null);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      preventClickRef.current = true;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;

      let candidateStartCol = initialStartCol;
      let candidateStartRow = initialStartRow;
      let candidateColSpan = initialColSpan;
      let candidateRowSpan = initialRowSpan;

      if (direction === 'top') {
        const rowStep = Math.round(-deltaY / (rowHeight * 0.45));
        if (rowStep > 0) {
          const maxUp = Math.min(initialStartRow, 3 - initialRowSpan);
          const actualUp = Math.max(0, Math.min(maxUp, rowStep));
          candidateStartRow = initialStartRow - actualUp;
          candidateRowSpan = initialRowSpan + actualUp;
        } else if (rowStep < 0) {
          const maxDown = initialRowSpan - 1;
          const actualDown = Math.max(0, Math.min(maxDown, -rowStep));
          candidateStartRow = initialStartRow + actualDown;
          candidateRowSpan = initialRowSpan - actualDown;
        }
      } else {
        const colStep = Math.round(deltaX / (colWidth * 0.45));
        const rowStep = Math.round(deltaY / (rowHeight * 0.45));

        candidateColSpan = Math.max(1, Math.min(GRID_CONSTANTS.FLAT_COLS, initialColSpan + colStep));
        candidateStartCol = Math.max(0, Math.min(GRID_CONSTANTS.FLAT_COLS - candidateColSpan, initialStartCol));

        if (initialRowSpan + rowStep >= 1) {
          candidateRowSpan = Math.max(1, Math.min(3, initialRowSpan + rowStep));
          candidateStartRow = initialStartRow;
        } else {
          const excessUp = 1 - (initialRowSpan + rowStep);
          const maxUp = Math.min(initialStartRow, 2);
          const actualUp = Math.min(maxUp, excessUp);
          candidateStartRow = initialStartRow - actualUp;
          candidateRowSpan = Math.min(3, 1 + actualUp);
        }
      }

      const candidate: CardPosition = {
        id: card.id,
        startCol: candidateStartCol,
        startRow: candidateStartRow,
        colSpan: candidateColSpan,
        rowSpan: candidateRowSpan,
      };

      const pushedLayout = computePushedLayout(candidate, placedFlatCards, GRID_CONSTANTS.FLAT_COLS);
      flatLivePushedRef.current = pushedLayout;
      setFlatResizing(candidate);
      setFlatLivePushedCards(pushedLayout);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      preventClickRef.current = true;
      setTimeout(() => {
        preventClickRef.current = false;
      }, 150);

      const finalLayout = flatLivePushedRef.current;
      if (finalLayout && onUpdateCardLayout) {
        const changedCards: Array<{
          id: number;
          start_col: number;
          start_row: number;
          col_span: number;
          row_span: number;
        }> = [];

        for (const item of finalLayout) {
          const original = placedFlatCards.find((c) => c.id === item.id);
          if (
            !original ||
            original.startCol !== item.startCol ||
            original.startRow !== item.startRow ||
            original.colSpan !== item.colSpan ||
            original.rowSpan !== item.rowSpan
          ) {
            changedCards.push({
              id: item.id,
              start_col: item.startCol,
              start_row: item.startRow,
              col_span: item.colSpan,
              row_span: item.rowSpan,
            });
          }
        }

        if (changedCards.length > 0) {
          onUpdateCardLayout(changedCards);
        }
      }

      flatLivePushedRef.current = null;
      setFlatResizing(null);
      setFlatLivePushedCards(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const hostNode = nodes.find(n => n.id === 'host');
  const nasNode = nodes.find(n => n.id.includes('41') || n.name.toLowerCase().includes('storage') || n.name.toLowerCase().includes('nas'));

  return (
    <div className="space-y-8">
      {/* Cluster Telemetry Row: Only visible to Owner/Admin */}
      {user?.role === 'owner' && prefs.widgetVisible?.nodes !== false && (
        <MultiServerNodesWidget
          nodes={nodes}
          loading={loadingNodes}
          speedtest={speedtest}
          serverGauges={prefs.serverGauges}
          onUpdateServerGauges={(updated) => {
            const next = { ...prefs, serverGauges: updated };
            setPrefs(next);
            saveUserPreferences(user?.id, next);
          }}
          isAdmin={true}
          onRunSpeedtest={onRunSpeedtest}
          isRunningSpeedtest={isRunningSpeedtest}
        />
      )}

      {/* Top Widgets: Time and Quick Notes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {prefs.widgetVisible?.clock !== false && (
          <div className="col-span-1">
            <TimeWidget uptime={hostNode?.uptime} />
          </div>
        )}
        {prefs.widgetVisible?.notes !== false && (
          <div className={prefs.widgetVisible?.clock !== false ? 'col-span-1 md:col-span-2' : 'col-span-1 md:col-span-3'}>
            <NotesWidget />
          </div>
        )}
      </div>

      {/* Search & Grid Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services or categories..."
            className="w-full pl-10 pr-4 py-2 bg-[#17181e] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-red-500/50 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setCategoryModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
              title="Create a new custom category box"
            >
              <FolderPlus className="w-3.5 h-3.5 text-red-400" />
              <span>Add Category</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              const next = !prefs.disableCategories;
              const updated = { ...prefs, disableCategories: next };
              setPrefs(updated);
              saveUserPreferences(user?.id, updated);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold transition-colors ${
              prefs.disableCategories
                ? 'border-red-500/50 bg-red-600/10 text-red-400'
                : 'border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white'
            }`}
            title={prefs.disableCategories ? 'Switch to Grouped Categories' : 'Disable Categories (Flat Grid)'}
          >
            <Layers className="w-3.5 h-3.5 text-red-400" />
            <span>{prefs.disableCategories ? 'Flat Grid' : 'Categories'}</span>
          </button>
          <button
            onClick={() => setViewModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-800 hover:border-slate-700 bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors"
            title="Customize Visible Cards & Widgets"
          >
            <Sliders className="w-3.5 h-3.5 text-red-500" />
            <span>Customize Grid</span>
            {prefs.hiddenCategories.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-red-600/20 text-red-400 border border-red-500/30 font-mono">
                {prefs.hiddenCategories.length} hidden
              </span>
            )}
          </button>
          <button
            onClick={onRefresh}
            className="p-2 text-slate-400 hover:text-white border border-slate-800 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {user && (
            <button
              onClick={() => openNew()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Service
            </button>
          )}
        </div>
      </div>

      <ErrBox msg={error} />

      {/* qBittorrent Dedicated Downloads & Telemetry Widget */}
      {prefs.widgetVisible?.qbittorrent !== false && qbitStats?.online && (
        <QbittorrentWidget
          data={qbitStats}
          onOpenInspector={() => onOpenInspector?.('qbittorrent')}
        />
      )}

      {/* Flat 2x1 Grid or Grouped Categories */}
      {prefs.disableCategories ? (
        filteredServices.length === 0 ? (
          <div className="py-16 px-6 text-center rounded-2xl border border-slate-800/80 bg-[#16181f]/80">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
              <LayoutGrid className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No service cards visible</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {search
                ? `No services matched "${search}". Try clearing your search.`
                : user?.role === 'owner'
                ? 'Your homelab board is empty. Add a service or customize your grid view.'
                : 'No service cards are currently assigned to your account. Contact an administrator for access.'}
            </p>
            {search ? (
              <button
                onClick={() => setSearch('')}
                className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition-colors"
              >
                Clear search filter
              </button>
            ) : user?.role === 'owner' ? (
              <button
                onClick={() => openNew()}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add First Service
              </button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Unified 8-Column Flat Grid with Free Drag & Resize */}
            <div className="w-full overflow-x-auto pb-4">
              <div
                ref={flatGridRef}
                className="grid gap-2.5 relative select-none min-w-[850px] xl:min-w-0"
                style={{
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  gridAutoRows: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
                }}
              >
                {/* Available Slots Outline (Shown when user is actively resizing or dragging) */}
                {(flatResizing !== null || flatCardDragging !== null) && flatFillerCells.map((filler) => (
                  <div
                    key={`flat-filler-${filler.col}-${filler.row}`}
                    style={{
                      gridColumn: `${filler.col + 1} / span 1`,
                      gridRow: `${filler.row + 1} / span 1`,
                      minHeight: `${GRID_CONSTANTS.CELL_HEIGHT}px`,
                    }}
                    className="rounded-xl border border-dashed border-red-500/30 bg-red-500/[0.03] pointer-events-none transition-all"
                  />
                ))}

                {/* Placed Service Cards */}
                {activeFlatCards.map((s) => {
                  const isCurrentDragging = flatCardDragging?.id === s.id;
                  const isCurrentResizing = flatResizing?.id === s.id;
                  const currentColSpan = isCurrentResizing && flatResizing ? flatResizing.colSpan : s.colSpan;
                  const currentRowSpan = isCurrentResizing && flatResizing ? flatResizing.rowSpan : s.rowSpan;
                  const startCol = s.startCol;
                  const startRow = s.startRow;

                  const locked = isServiceVpnLocked(s);
                  const isOnline = s.status === 'online';
                  const isOffline = s.status === 'offline' || s.status === 'timeout';
                  const isCompact = currentColSpan === 1 && currentRowSpan === 1;
                  const isExpanded = currentRowSpan >= 2;

                  return (
                    <div
                      key={s.id}
                      onMouseDown={(e) => Boolean(user) && handleStartFlatCardDrag(e, s)}
                      onClick={(e) => handleCardClick(s, e)}
                      role="link"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCardClick(s);
                      }}
                      style={{
                        gridColumn: `${startCol + 1} / span ${currentColSpan}`,
                        gridRow: `${startRow + 1} / span ${currentRowSpan}`,
                      }}
                      className={`group relative rounded-xl border transition-colors duration-150 select-none overflow-hidden ${
                        isCurrentDragging
                          ? 'border-red-500/80 shadow-2xl scale-[0.98] bg-[#1a1d28]/60 z-20 cursor-grabbing ring-2 ring-red-500/30 opacity-40 border-dashed'
                          : isCurrentResizing
                          ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)] bg-[#1c1f2b] z-30 cursor-se-resize'
                          : locked
                          ? 'border-amber-500/30 bg-[#16181f]/60 opacity-60 hover:opacity-85 hover:border-amber-500/50 hover:shadow-lg cursor-pointer'
                          : 'border-slate-800/80 bg-[#16181f]/80 hover:bg-[#1c1f2b] hover:border-slate-700/80 hover:shadow-lg cursor-pointer'
                      } ${
                        isCompact
                          ? 'p-2.5 flex flex-col justify-between'
                          : isExpanded
                          ? 'p-3.5 flex flex-col justify-between'
                          : 'p-3 flex items-center justify-between'
                      }`}
                    >
                      {isCompact ? (
                        /* Compact 1x1 Card */
                        <>
                          <div className="flex items-center gap-2 min-w-0 pr-4">
                            <ServiceIcon icon={s.icon} title={s.title} />
                            <div className="min-w-0">
                              <div className="font-bold text-xs text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1">
                                <span className="truncate">{s.title}</span>
                                {locked && <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500 truncate block mt-0.5">
                                {s.url.replace(/^https?:\/\//, '')}
                              </span>
                            </div>
                          </div>

                          {/* Hover Action Buttons for Compact 1x1 Card */}
                          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 bg-[#16181f]/95 p-0.5 rounded-lg border border-slate-700/80 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(s.url);
                                setCopiedUrlId(s.id);
                                setTimeout(() => setCopiedUrlId(null), 1500);
                              }}
                              className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                              title="Copy URL"
                            >
                              {copiedUrlId === s.id ? (
                                <Check className="w-2.5 h-2.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-2.5 h-2.5" />
                              )}
                            </button>
                            {user && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    openEdit(s);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                  title="Edit service"
                                >
                                  <Edit2 className="w-2.5 h-2.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    remove(s.id);
                                  }}
                                  className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                                  title="Remove service"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 text-[9px] font-mono">
                            <span
                              className={`flex items-center gap-1 ${
                                isOnline ? 'text-emerald-400' : isOffline ? 'text-rose-400' : 'text-slate-500'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                                }`}
                              />
                              {s.status || 'ping'}
                            </span>
                            <div className="flex items-center gap-1">
                              {s.telemetryType && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenInspector?.(s.telemetryType!);
                                  }}
                                  className="p-0.5 text-slate-400 hover:text-emerald-400 transition-colors"
                                  title="Inspect live telemetry"
                                >
                                  <Activity className="w-3 h-3 text-emerald-400" />
                                </button>
                              )}
                              {locked ? (
                                <span className="inline-flex items-center gap-0.5 text-amber-400 font-mono font-bold" title="WireGuard VPN or LAN required">
                                  <Lock className="w-2.5 h-2.5" />
                                  VPN
                                </span>
                              ) : (
                                s.requires_vpn && <span className="text-purple-400 font-bold">VPN</span>
                              )}
                            </div>
                          </div>
                        </>
                      ) : isExpanded ? (
                        /* Big / Expanded Card (Rich, Dynamic & Engaging) */
                        <div className="flex flex-col justify-between h-full space-y-2.5">
                          {/* Top Row: Icon, Title, Status & Actions */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                              <ServiceIcon icon={s.icon} title={s.title} />
                              <div className="min-w-0">
                                <div className="font-bold text-sm text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
                                  <span>{s.title}</span>
                                  {locked ? (
                                    <Lock className="w-3 h-3 text-amber-400 shrink-0" title="WireGuard VPN or LAN required to access this service" />
                                  ) : (
                                    <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                  )}
                                </div>
                                <span className="text-[11px] font-mono text-slate-500 truncate block mt-0.5">
                                  {s.url.replace(/^https?:\/\//, '')}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {locked ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                  <Lock className="w-2.5 h-2.5 text-amber-400" />
                                  VPN Locked
                                </span>
                              ) : s.requires_vpn ? (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  <Shield className="w-2.5 h-2.5 text-purple-400" />
                                  VPN
                                </span>
                              ) : null}

                              <div
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                                  isOnline
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                    : isOffline
                                    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                    : 'bg-slate-800 text-slate-400 border-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                                  }`}
                                />
                                <span>{s.status || 'ping'}</span>
                              </div>

                              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {s.telemetryType && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      onOpenInspector?.(s.telemetryType!);
                                    }}
                                    className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                                    title="Inspect live telemetry"
                                  >
                                    <Activity className="w-3 h-3 text-emerald-400" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(s.url);
                                    setCopiedUrlId(s.id);
                                    setTimeout(() => setCopiedUrlId(null), 1500);
                                  }}
                                  className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                  title="Copy URL"
                                >
                                  {copiedUrlId === s.id ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                {user && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openEdit(s);
                                      }}
                                      className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                      title="Edit service"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        remove(s.id);
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                                      title="Remove service"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Middle: Description & Live Interactive Widgets */}
                          <div className="space-y-2 flex-1">
                            {s.description && (
                              <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                                {s.description}
                              </p>
                            )}

                            {/* Jellyfin Live Stream Widget */}
                            {(s.telemetryType === 'jellyfin' || s.title.toLowerCase().includes('jellyfin')) && (
                              <div className="p-2.5 rounded-xl bg-purple-950/25 border border-purple-500/20 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                                    <Film className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Jellyfin Media</span>
                                  </div>
                                  <span className="text-purple-400 text-[10px]">
                                    {jellyfinStats?.activeStreamCount || 0} active stream{jellyfinStats?.activeStreamCount === 1 ? '' : 's'}
                                  </span>
                                </div>
                                {jellyfinStats?.ownerStats?.activeUsers?.[0] ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-300 truncate">
                                      <span className="font-semibold text-white truncate">{jellyfinStats.ownerStats.activeUsers[0].item}</span>
                                      <span className="text-slate-400 shrink-0 ml-2">{jellyfinStats.ownerStats.activeUsers[0].userName}</span>
                                    </div>
                                    <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
                                      <div
                                        className="bg-purple-500 h-full rounded-full transition-all"
                                        style={{
                                          width: `${Math.min(100, Math.round(((jellyfinStats.ownerStats.activeUsers[0].playbackPosition || 0) / (jellyfinStats.ownerStats.activeUsers[0].playbackDuration || 1)) * 100))}%`
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-mono text-slate-500">No media actively streaming</div>
                                )}
                              </div>
                            )}

                            {/* Jellyseerr Requests Widget */}
                            {(s.telemetryType === 'jellyseerr' || s.title.toLowerCase().includes('jellyseerr')) && (
                              <div className="p-2.5 rounded-xl bg-blue-950/25 border border-blue-500/20 flex items-center justify-between text-[11px] font-mono">
                                <div className="flex items-center gap-1.5 text-blue-300 font-bold">
                                  <Tv className="w-3.5 h-3.5 text-blue-400" />
                                  <span>Pending Requests</span>
                                </div>
                                <span className="font-bold text-white px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
                                  {jellyseerrStats?.pendingRequests ?? 0}
                                </span>
                              </div>
                            )}

                            {/* NAS / Nextcloud Storage Widget */}
                            {(s.category?.toLowerCase() === 'nas' || s.title.toLowerCase().includes('nas') || s.title.toLowerCase().includes('nextcloud')) && nasNode?.disk && (
                              <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 space-y-1.5">
                                <div className="flex items-center justify-between text-[11px] font-mono">
                                  <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                                    <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Pool Storage</span>
                                  </div>
                                  <span className="text-amber-300 font-bold">{nasNode.disk.free} free</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-amber-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${nasNode.disk.percent || 46}%` }}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                                  <span>{nasNode.disk.used} used</span>
                                  <span>{nasNode.disk.total} total</span>
                                </div>
                              </div>
                            )}

                            {/* qBittorrent Torrent Speeds Widget */}
                            {(s.telemetryType === 'qbittorrent' || s.title.toLowerCase().includes('qbit') || s.title.toLowerCase().includes('torrent')) && (
                              <div className="p-2.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between text-[11px] font-mono">
                                <div className="flex items-center gap-2">
                                  <span className="text-cyan-400 font-bold">↓ {qbitStats?.serverState?.dl_info_speed_str || '0 B/s'}</span>
                                  <span className="text-slate-600">·</span>
                                  <span className="text-cyan-300 font-bold">↑ {qbitStats?.serverState?.up_info_speed_str || '0 B/s'}</span>
                                </div>
                                <span className="text-[10px] text-slate-400">{qbitStats?.torrents?.length || 0} active</span>
                              </div>
                            )}

                            {/* Pi-hole Stats Widget */}
                            {(s.telemetryType === 'pihole' || s.title.toLowerCase().includes('pi-hole') || s.title.toLowerCase().includes('pihole')) && (
                              <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between text-[11px] font-mono">
                                <span className="text-emerald-400 font-bold">Blocked: {piholeStats?.ads_blocked_today?.toLocaleString() || '18,420'}</span>
                                <span className="font-bold text-white text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded border border-emerald-500/30">
                                  {piholeStats?.ads_percentage_today ? `${piholeStats.ads_percentage_today.toFixed(1)}%` : '28.4%'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Bottom Row: Category Pill & Direct Launch Action */}
                          <div className="pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px] font-mono">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800/60 text-slate-400 border border-slate-700/60">
                              {s.category || 'Services'}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 group-hover:text-red-300 transition-colors">
                              <span>Launch</span>
                              <ExternalLink className="w-3 h-3" />
                            </span>
                          </div>
                        </div>
                      ) : (
                        /* Standard 2x1 Card */
                        <>
                          <div className="flex items-center gap-3 min-w-0 pr-2">
                            <ServiceIcon icon={s.icon} title={s.title} />
                            <div className="min-w-0">
                              <div className="font-bold text-sm text-slate-100 group-hover:text-red-400 transition-colors truncate flex items-center gap-1.5">
                                <span>{s.title}</span>
                                {locked ? (
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" title="WireGuard VPN or LAN required to access this service" />
                                ) : (
                                  <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 truncate block mt-0.5">
                                {s.url.replace(/^https?:\/\//, '')}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {locked ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30" title="Connect to WireGuard VPN to access this hostname">
                                <Lock className="w-2.5 h-2.5 text-amber-400" />
                                VPN Locked
                              </span>
                            ) : s.requires_vpn ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-mono bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                <Shield className="w-2.5 h-2.5 text-purple-400" />
                                VPN
                              </span>
                            ) : null}

                            <div
                              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${
                                isOnline
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isOffline
                                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isOnline ? 'bg-emerald-400 animate-pulse' : isOffline ? 'bg-rose-500' : 'bg-slate-500'
                                }`}
                              />
                              <span>{s.status || 'ping'}</span>
                            </div>

                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {s.telemetryType && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onOpenInspector?.(s.telemetryType!);
                                  }}
                                  className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                                  title="Inspect live telemetry"
                                >
                                  <Activity className="w-3 h-3 text-emerald-400" />
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(s.url);
                                  setCopiedUrlId(s.id);
                                  setTimeout(() => setCopiedUrlId(null), 1500);
                                }}
                                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                title="Copy URL"
                              >
                                {copiedUrlId === s.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              {user && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      openEdit(s);
                                    }}
                                    className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors"
                                    title="Edit service"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      remove(s.id);
                                    }}
                                    className="p-1 text-slate-400 hover:text-red-400 rounded hover:bg-slate-800 transition-colors"
                                    title="Remove service"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Resize indicator badge when resizing */}
                      {isCurrentResizing && (
                        <span className="absolute top-1 right-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                          {currentColSpan}×{currentRowSpan}
                        </span>
                      )}

                      {/* Top Edge Resize Handle (Drag upward) */}
                      <div
                        onMouseDown={(e) => handleStartFlatResize(e, s, 'top')}
                        data-no-drag="true"
                        className="resize-handle absolute top-0 inset-x-0 h-2.5 cursor-ns-resize z-20 group/tophandle flex items-center justify-center"
                        title="Drag upward to resize card"
                      >
                        <div className="w-10 h-0.5 rounded-full bg-slate-600/40 group-hover/tophandle:bg-red-400 group-hover/tophandle:h-1 opacity-0 group-hover:opacity-100 transition-all" />
                      </div>

                      {/* Drag Handle to Resize Card */}
                      <div
                        onMouseDown={(e) => handleStartFlatResize(e, s, 'se')}
                        data-no-drag="true"
                        className="resize-handle absolute bottom-0.5 right-0.5 w-5 h-5 cursor-se-resize flex items-center justify-center text-slate-600 hover:text-red-400 opacity-20 group-hover:opacity-100 transition-opacity z-20"
                        title="Drag to resize card"
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" className="text-current">
                          <circle cx="7" cy="7" r="1" fill="currentColor" />
                          <circle cx="7" cy="4" r="1" fill="currentColor" />
                          <circle cx="7" cy="1" r="1" fill="currentColor" />
                          <circle cx="4" cy="7" r="1" fill="currentColor" />
                          <circle cx="4" cy="4" r="1" fill="currentColor" />
                          <circle cx="1" cy="7" r="1" fill="currentColor" />
                        </svg>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rich Homelab Live Telemetry Panels */}
            <div className="pt-4 border-t border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between px-1 text-xs font-mono uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-2 font-bold text-slate-200">
                  <Activity className="w-4 h-4 text-red-500" />
                  <span>Homelab Live Activity & Telemetry</span>
                </span>
                <span className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-normal">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Realtime Updates</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Jellyfin Live Stream Panel */}
                <div
                  onClick={() => onOpenInspector?.('jellyfin')}
                  className="rounded-2xl border border-slate-800/80 bg-[#141620]/90 p-4 space-y-3 cursor-pointer hover:border-purple-500/30 transition-colors"
                  title="Click to open Jellyfin Inspector"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                        <Film className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>Jellyfin Media Server</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${jellyfinStats?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">media.slogiker.si</span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      (jellyfinStats?.activeStreamCount ?? 0) > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {jellyfinStats?.activeStreamCount ?? 0} active stream{(jellyfinStats?.activeStreamCount ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  {/* Active Streams List */}
                  {jellyfinStats?.ownerStats?.activeUsers && jellyfinStats.ownerStats.activeUsers.length > 0 ? (
                    <div className="space-y-2">
                      {jellyfinStats.ownerStats.activeUsers.map((u, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                              <span className="font-bold text-xs text-white truncate">{u.item}</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                {u.itemType || 'Video'}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">
                              {u.userName} · {u.playMethod || 'DirectPlay'}
                            </span>
                          </div>

                          {u.playbackDuration ? (
                            <div className="space-y-1">
                              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(100, Math.round(((u.playbackPosition || 0) / u.playbackDuration) * 100))}%`,
                                  }}
                                />
                              </div>
                              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                                <span>{formatSeconds(u.playbackPosition || 0)}</span>
                                <span>{formatSeconds(u.playbackDuration)}</span>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-5 text-center border border-dashed border-slate-800/80 rounded-xl bg-[#11131a]/50">
                      <Film className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-400 font-medium">Jellyfin is ready · 0 active streams</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 font-mono">Stream status will update live as media plays</p>
                    </div>
                  )}
                </div>

                {/* Jellyseerr Media Requests Panel */}
                <div
                  onClick={() => onOpenInspector?.('jellyseerr')}
                  className="rounded-2xl border border-slate-800/80 bg-[#141620]/90 p-4 space-y-3 cursor-pointer hover:border-amber-500/30 transition-colors"
                  title="Click to open Jellyseerr Inspector"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                        <Bookmark className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-1.5">
                          <span>Jellyseerr Media Requests</span>
                          <span className={`w-1.5 h-1.5 rounded-full ${jellyseerrStats?.online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">request.slogiker.si</span>
                      </div>
                    </div>
                    <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full border ${
                      (jellyseerrStats?.pendingCount ?? 0) > 0
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30 font-bold'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      {jellyseerrStats?.pendingCount ?? 0} pending · {jellyseerrStats?.totalCount ?? 0} total
                    </span>
                  </div>

                  {/* Requests List */}
                  {jellyseerrStats?.ownerStats?.recentRequests && jellyseerrStats.ownerStats.recentRequests.length > 0 ? (
                    <div className="space-y-2">
                      {jellyseerrStats.ownerStats.recentRequests.slice(0, 3).map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs">
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-slate-200 truncate">{req.title}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Requested by <span className="text-amber-300 font-bold">{req.requestedBy}</span> · {req.type.toUpperCase()}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 shrink-0">
                            Pending
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-5 text-center border border-dashed border-slate-800/80 rounded-xl bg-[#11131a]/50">
                      <Check className="w-6 h-6 text-emerald-500/80 mx-auto mb-1.5" />
                      <p className="text-xs text-slate-400 font-medium">All media requests fulfilled</p>
                      <p className="text-[10px] text-slate-600 mt-0.5 font-mono">{jellyseerrStats?.totalCount ?? 0} total requests managed</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Telemetry (qBittorrent, WireGuard, Pi-hole) if online */}
              {(qbitStats?.online || wgStats?.online || piholeStats?.online) && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  {qbitStats?.online && (
                    <div
                      onClick={() => onOpenInspector?.('qbittorrent')}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-[#141620]/90 flex items-center justify-between text-xs cursor-pointer hover:border-sky-500/30 transition-colors"
                      title="Inspect qBittorrent"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          <ArrowDown className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">qBittorrent</div>
                          <div className="text-[10px] font-mono text-slate-500">{qbitStats.activeCount} active torrents</div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-sky-400">
                        ↓ {(qbitStats.downloadSpeed / (1024 * 1024)).toFixed(1)} MB/s
                      </div>
                    </div>
                  )}

                  {wgStats?.online && (
                    <div
                      onClick={() => onOpenInspector?.('wireguard')}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-[#141620]/90 flex items-center justify-between text-xs cursor-pointer hover:border-purple-500/30 transition-colors"
                      title="Inspect WireGuard"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">WireGuard VPN</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {wgStats.connectedPeers ?? wgStats.activePeers ?? 0} active peers
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        Online
                      </span>
                    </div>
                  )}

                  {piholeStats?.online && (
                    <div
                      onClick={() => onOpenInspector?.('pihole')}
                      className="p-3.5 rounded-xl border border-slate-800/80 bg-[#141620]/90 flex items-center justify-between text-xs cursor-pointer hover:border-rose-500/30 transition-colors"
                      title="Inspect Pi-hole"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <Activity className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-white">Pi-hole DNS</div>
                          <div className="text-[10px] font-mono text-slate-500">
                            {piholeStats.queriesToday?.toLocaleString?.() ?? piholeStats.queriesToday} queries
                          </div>
                        </div>
                      </div>
                      <div className="text-right font-mono text-[11px] text-emerald-400">
                        {Number(piholeStats.percentBlocked ?? 0).toFixed(1)}% blocked
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      ) : orderedCategories.length === 0 || !orderedCategories.some(cat => !prefs.hiddenCategories.includes(cat) && (user?.role === 'owner' || filteredServices.some(s => (s.category?.trim() || 'Services') === cat))) ? (
        <div className="py-16 px-6 text-center rounded-2xl border border-slate-800/80 bg-[#16181f]/80">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-white">No service cards visible</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search
              ? `No services matched "${search}". Try clearing your search.`
              : user
              ? 'Your homelab board is empty or all categories are currently hidden. Add a service or customize your grid view.'
              : 'No service cards are currently assigned to your account. Contact an administrator for access.'}
          </p>
          {search ? (
            <button
              onClick={() => setSearch('')}
              className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg transition-colors"
            >
              Clear search filter
            </button>
          ) : user ? (
            <button
              onClick={() => openNew()}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Service
            </button>
          ) : null}
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedCategories} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
              {orderedCategories.map((cat) => {
                if (prefs.hiddenCategories.includes(cat)) return null;
                const items = filteredServices.filter(s => (s.category?.trim() || 'Services') === cat);
                if (!user && items.length === 0) return null;
                const colSpan = (prefs.categoryWidths && prefs.categoryWidths[cat]) || 1;

                return (
                  <ErrorBoundary key={cat} isInline fallbackTitle={`Column: ${cat}`}>
                    <SortableCategoryColumn
                      id={cat}
                      category={cat}
                      items={items}
                      colSpan={colSpan}
                      vpnConnected={vpnConnected}
                      onVpnLockedClick={handleVpnLockedClick}
                      isOwner={Boolean(user)}
                      onRename={(old) => setRenameModal({ open: true, oldName: old, newName: old })}
                      onAddService={(c) => openNew(c)}
                      onEditService={openEdit}
                      onDeleteService={remove}
                      onUpdateCardLayout={onUpdateCardLayout}
                      onOpenInspector={onOpenInspector}
                      onMoveCardCategory={handleMoveCardCategory}
                    />
                  </ErrorBoundary>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* VPN / LAN Locked Host Toast Notification */}
      {vpnNotice && (
        <div className="fixed bottom-6 right-6 max-w-md p-4 rounded-2xl border border-amber-500/40 bg-[#16181f]/95 text-slate-200 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-amber-400">WireGuard VPN / LAN Required</h4>
              <p className="text-xs text-slate-300 mt-1">
                <strong className="text-white">{vpnNotice.title}</strong> uses an internal homelab address{' '}
                <code className="text-amber-300 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  {vpnNotice.url.replace(/^https?:\/\//, '')}
                </code>{' '}
                which cannot be reached without an active WireGuard VPN connection or local home network access.
              </p>
              <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-purple-400" />
                Connect to WireGuard VPN to unlock and open this service.
              </p>
            </div>
            <button
              onClick={() => setVpnNotice(null)}
              className="text-slate-500 hover:text-white p-1 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {orderedCategories.length === 0 && (
        <div className="p-12 text-center rounded-2xl border border-slate-800/80 bg-[#16181f]">
          <Server className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No categories found.</p>
          <button onClick={() => setCategoryModal(true)} className="mt-3 text-xs text-red-400 hover:underline">
            Add your first category box
          </button>
        </div>
      )}

      {/* Add / Edit Service Modal */}
      <Modal
        open={modal}
        onClose={() => { setModal(false); setModalError(''); }}
        title={editing ? 'Edit Service' : 'Add Service'}
        footer={
          <>
            <button onClick={() => { setModal(false); setModalError(''); }} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={submit} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors">
              {editing ? 'Save Changes' : 'Create Service'}
            </button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-3.5">
          <ErrBox msg={modalError} />
          <Field label="Service Name *">
            <input className="input-field" required value={form.title} onChange={setFormField('title')} placeholder="e.g. Plex Media Server" />
          </Field>
          <Field label="URL (Internal or External) *">
            <div className="flex gap-2">
              <input
                className="input-field flex-1"
                required
                value={form.url}
                onChange={setFormField('url')}
                placeholder="http://192.168.1.136:32400 or https://..."
              />
              <button
                type="button"
                onClick={testUrl}
                disabled={testingUrl || !form.url}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 border border-slate-700 disabled:opacity-50 transition-colors shrink-0"
              >
                {testingUrl ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-red-500" />
                    <span>Testing...</span>
                  </>
                ) : (
                  <>
                    <Activity className="w-3.5 h-3.5 text-red-400" />
                    <span>Test</span>
                  </>
                )}
              </button>
            </div>

            {/* Use SSL Switch */}
            <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/60">
              <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                Protocol:
                <span className={form.url.startsWith('https://') ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                  {form.url.startsWith('https://') ? 'HTTPS (SSL)' : 'HTTP'}
                </span>
              </span>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <span className="text-[11px] font-semibold text-slate-300">Use SSL</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={form.url.startsWith('https://')}
                  onClick={() => {
                    if (form.url.startsWith('https://')) {
                      setForm(f => ({ ...f, url: f.url.replace(/^https:\/\//, 'http://') }));
                    } else if (form.url.startsWith('http://')) {
                      setForm(f => ({ ...f, url: f.url.replace(/^http:\/\//, 'https://') }));
                    } else if (form.url) {
                      setForm(f => ({ ...f, url: `https://${f.url}` }));
                    } else {
                      setForm(f => ({ ...f, url: 'https://' }));
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    form.url.startsWith('https://') ? 'bg-emerald-600' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      form.url.startsWith('https://') ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            </div>

            {testResult && (
              <div
                className={`mt-2 flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono border ${
                  testResult.status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${testResult.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                <span>
                  {testResult.status === 'online'
                    ? `Online · HTTP ${testResult.statusCode || 200} ${testResult.statusText || 'OK'} (${testResult.latency})`
                    : `Offline · ${testResult.error || 'Connection failed'} (${testResult.latency})`}
                </span>
              </div>
            )}
          </Field>
          <Field label="Description (Optional note)">
            <textarea className="input-field" rows={2} value={form.description} onChange={setFormField('description')} placeholder="Self-hosted personal media streaming service..." />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Icon Name or URL">
              <input className="input-field" value={form.icon} onChange={setFormField('icon')} placeholder="plex, docker, or http://..." />
            </Field>
            <Field label="Category / Column">
              <input className="input-field" value={form.category} onChange={setFormField('category')} placeholder="Media, Storage, Infrastructure..." />
            </Field>
          </div>
          <div className="pt-2 text-xs text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.requires_vpn} onChange={setFormField('requires_vpn')} className="rounded accent-red-500" />
              <span>Requires WireGuard / VPN</span>
            </label>
          </div>
        </form>
      </Modal>

      {/* Add Custom Category Box Modal */}
      <Modal
        open={categoryModal}
        onClose={() => setCategoryModal(false)}
        title="Add Custom Category Box"
        footer={
          <>
            <button onClick={() => setCategoryModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleAddCategory} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors">
              Create Category
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Create a custom category box on your board. You can drag and drop it anywhere, resize its width, and populate it with service cards.
          </p>
          <Field label="Category Name">
            <input
              className="input-field"
              placeholder="e.g. Smart Home, Databases, Automation..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCategory(); }}
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* Rename Category Modal */}
      <Modal
        open={renameModal.open}
        onClose={() => setRenameModal({ open: false, oldName: '', newName: '' })}
        title={`Rename Category: ${renameModal.oldName}`}
        footer={
          <>
            <button onClick={() => setRenameModal({ open: false, oldName: '', newName: '' })} className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleRenameCategory} className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold transition-colors">
              Save Name
            </button>
          </>
        }
      >
        <div className="space-y-4 text-xs">
          <Field label="New Category Name">
            <input
              className="input-field"
              value={renameModal.newName}
              onChange={(e) => setRenameModal(r => ({ ...r, newName: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameCategory(); }}
              autoFocus
            />
          </Field>
        </div>
      </Modal>

      {/* Customize Grid & Widgets Modal */}
      <Modal
        open={viewModal}
        onClose={() => setViewModal(false)}
        title="Customize Homelab Grid & Widgets"
        footer={
          <div className="flex items-center justify-between w-full">
            <Link
              to="/profile"
              onClick={() => setViewModal(false)}
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Full Account Settings
            </Link>
            <button
              onClick={() => setViewModal(false)}
              className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-4 text-xs">
          {/* Display & Layout Mode */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Display & Layout</span>
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="pr-4">
                <div className="font-semibold text-xs text-white">Disable Categories (Flat Grid)</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Show all service cards in a unified responsive grid and display homelab telemetry underneath.
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(prefs.disableCategories)}
                onClick={() => {
                  const next = !prefs.disableCategories;
                  const updated = { ...prefs, disableCategories: next };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  prefs.disableCategories ? 'bg-red-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition duration-200 ease-in-out ${
                    prefs.disableCategories ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Widget Toggles */}
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Widgets</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.clock !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true, qbittorrent: true }), clock: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.clock !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Time Widget
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.notes !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true, qbittorrent: true }), notes: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.notes !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Notes Widget
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.nodes !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true, qbittorrent: true }), nodes: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.nodes !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                Cluster Nodes
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = prefs.widgetVisible?.qbittorrent !== false;
                  const updated = { ...prefs, widgetVisible: { ...(prefs.widgetVisible || { clock: true, nodes: true, notes: true, qbittorrent: true }), qbittorrent: !val } };
                  setPrefs(updated);
                  saveUserPreferences(user?.id, updated);
                }}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  prefs.widgetVisible?.qbittorrent !== false
                    ? 'bg-red-600/10 border-red-500/40 text-white font-bold'
                    : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}
              >
                qBittorrent
              </button>
            </div>
          </div>

          {/* Category Visibility & Services Breakdown */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">Category Columns & Services</span>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {orderedCategories.map(cat => {
                const isCatHidden = prefs.hiddenCategories.includes(cat);
                const catServices = services.filter(s => (s.category?.trim() || 'Services') === cat);
                const isExpanded = expandedCategories[cat] ?? false;
                const visibleCount = catServices.filter(s => !prefs.hiddenServices?.includes(s.id)).length;

                return (
                  <div
                    key={cat}
                    className="rounded-xl border border-slate-800/80 bg-slate-900/60 overflow-hidden transition-all"
                  >
                    {/* Category Row */}
                    <div className="flex items-center justify-between p-2.5 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand(cat)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left group/cat"
                      >
                        <div className="p-1 rounded text-slate-500 group-hover/cat:text-slate-300 transition-colors">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-red-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className={`font-semibold text-xs transition-colors ${!isCatHidden ? 'text-white' : 'text-slate-500'}`}>
                            {cat}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {visibleCount}/{catServices.length} visible
                          </div>
                        </div>
                      </button>

                      {/* Category Hide Checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleCategoryHide(cat)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          !isCatHidden
                            ? 'bg-red-600/10 border-red-500/40 text-red-400 hover:bg-red-600/20'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-400'
                        }`}
                        title={isCatHidden ? `Show entire ${cat} category` : `Hide entire ${cat} category`}
                      >
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                          !isCatHidden ? 'bg-red-600 border-red-500 text-white' : 'border-slate-600 bg-slate-700/50'
                        }`}>
                          {!isCatHidden && <Check className="w-2.5 h-2.5 stroke-[2.5]" />}
                        </div>
                        <span>{!isCatHidden ? 'Shown' : 'Hidden'}</span>
                      </button>
                    </div>

                    {/* Expandable Services List */}
                    {isExpanded && (
                      <div className="border-t border-slate-800/80 bg-slate-950/40 p-2 space-y-1.5">
                        {catServices.length === 0 ? (
                          <div className="text-[11px] text-slate-600 py-1.5 px-2 italic">
                            No services in this category
                          </div>
                        ) : (
                          catServices.map(s => {
                            const isSvcHidden = isCatHidden || (prefs.hiddenServices?.includes(s.id) ?? false);
                            return (
                              <div
                                key={s.id}
                                className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                                  !isSvcHidden
                                    ? 'bg-slate-900/80 border-slate-800/80 text-slate-200'
                                    : 'bg-slate-950/60 border-slate-800/40 text-slate-500 opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 pr-2">
                                  <ServiceIcon icon={s.icon} title={s.title} />
                                  <div className="min-w-0">
                                    <div className="text-xs font-medium truncate">{s.title}</div>
                                    <div className="text-[9px] font-mono text-slate-500 truncate">
                                      {s.url.replace(/^https?:\/\//, '')}
                                    </div>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isCatHidden}
                                  onClick={() => toggleServiceHide(s.id)}
                                  className={`px-2 py-1 rounded-md border text-[10px] font-mono flex items-center gap-1 transition-all ${
                                    isCatHidden
                                      ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
                                      : !isSvcHidden
                                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
                                      : 'bg-slate-800/40 border-slate-700/60 text-slate-500 hover:text-slate-400'
                                  }`}
                                  title={isCatHidden ? 'Category is hidden' : isSvcHidden ? 'Show service' : 'Hide service'}
                                >
                                  {!isSvcHidden ? (
                                    <>
                                      <Eye className="w-3 h-3 text-emerald-400" />
                                      <span>Visible</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3 h-3 text-slate-500" />
                                      <span>Hidden</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
