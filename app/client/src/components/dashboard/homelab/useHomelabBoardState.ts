import { useState, useEffect, useMemo } from 'react';
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { Service, ServerNode } from '../../../types';
import { useAuth } from '../../../hooks/useAuth';
import { getUserPreferences, saveUserPreferences, UserPreferences } from '../../../lib/userPreferences';
import { api } from '../../../lib/api';
import { ServiceForm } from './ServiceFormModal';

export const SVC_EMPTY: ServiceForm = {
  title: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  is_private: false,
  requires_vpn: false,
};

export interface UseHomelabBoardStateProps {
  services: Service[];
  nodes: ServerNode[];
  vpnConnected?: boolean;
  onRefresh: () => void;
  onOpenInspector?: (type: 'wireguard' | 'pihole' | 'qbittorrent' | 'jellyfin' | 'jellyseerr') => void;
}

export function useHomelabBoardState({
  services,
  nodes,
  vpnConnected,
  onRefresh,
  onOpenInspector,
}: UseHomelabBoardStateProps) {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<UserPreferences>(() => getUserPreferences(user?.id));

  useEffect(() => {
    const onPrefsChange = () => setPrefs(getUserPreferences(user?.id));
    window.addEventListener('mymanager_prefs_changed', onPrefsChange);
    return () => window.removeEventListener('mymanager_prefs_changed', onPrefsChange);
  }, [user?.id]);

  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string>('');
  const [viewModal, setViewModal] = useState<boolean>(false);
  const [serverGaugesModal, setServerGaugesModal] = useState<boolean>(false);
  const [pironmanModal, setPironmanModal] = useState<boolean>(false);
  const [categoryModal, setCategoryModal] = useState<boolean>(false);
  const [newCatName, setNewCatName] = useState<string>('');
  const [renameModal, setRenameModal] = useState<{ open: boolean; oldName: string; newName: string }>({
    open: false,
    oldName: '',
    newName: '',
  });
  const [editing, setEditing] = useState<Service | null>(null);
  const [form, setForm] = useState<ServiceForm>(SVC_EMPTY);
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

  // Sync Pironman RGB accent with website theme
  useEffect(() => {
    if (prefs.syncThemeWithPironman && prefs.pironmanAccentColor) {
      document.documentElement.style.setProperty('--pironman-rgb', prefs.pironmanAccentColor);
      document.documentElement.style.setProperty('--accent-glow', `0 0 20px -3px ${prefs.pironmanAccentColor}80`);
    } else {
      document.documentElement.style.removeProperty('--pironman-rgb');
      document.documentElement.style.removeProperty('--accent-glow');
    }
  }, [prefs.syncThemeWithPironman, prefs.pironmanAccentColor]);

  const isServiceVpnLocked = (s: Service) => {
    const isVpnRequired = Boolean(s.requires_vpn);
    const isLanOrLocal =
      s.url.includes('192.168.') ||
      s.url.includes('10.') ||
      s.url.includes('.home.arpa') ||
      s.url.includes('.local');
    return (isVpnRequired || isLanOrLocal) && !vpnConnected;
  };

  const handleCardClick = (s: Service) => {
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

  const hostNode = nodes.find(n => n.id === 'host');

  // Categories extracted from services and custom lists
  const rawCategories = useMemo(() => {
    const set = new Set<string>();
    services.forEach(s => set.add(s.category?.trim() || 'Services'));
    (prefs.customCategories || []).forEach(c => set.add(c.trim()));
    if (set.size === 0) set.add('Services');
    return Array.from(set).filter(Boolean);
  }, [services, prefs.customCategories]);

  // Active modular widgets configuration in Category Mode
  const activeWidgetKeys = useMemo(() => {
    const vis = (prefs.widgetVisible as any) || {};
    const keys: string[] = [];

    // Separate each computer node into its own card
    if (vis.nodes !== false && nodes.length > 0) {
      nodes.forEach(n => {
        keys.push(`node-${n.id}`);
      });
    }

    if (vis.clock !== false) keys.push('clock');
    if (vis.speedtest !== false) keys.push('speedtest');
    if (vis.notes !== false) keys.push('notes');
    if (vis.pihole !== false) keys.push('pihole');
    if (vis.wireguard !== false) keys.push('wireguard');
    if (vis.jellyfin !== false) keys.push('jellyfin');
    if (vis.jellyseerr !== false) keys.push('jellyseerr');
    if (vis.qbittorrent !== false) keys.push('qbittorrent');
    return keys;
  }, [prefs.widgetVisible, nodes]);

  // Category board items in Category Mode (pure categories, no widgets mixed in)
  const categoryBoardItems = useMemo(() => {
    const savedOrder = prefs.categoryOrder || [];
    const allExpected = rawCategories.map(c => `cat:${c}`);

    const sorted: string[] = [];
    for (const item of savedOrder) {
      const canonical = item.startsWith('cat:') ? item : `cat:${item}`;
      if (allExpected.includes(canonical) && !sorted.includes(canonical)) {
        sorted.push(canonical);
      }
    }

    for (const item of allExpected) {
      if (!sorted.includes(item)) {
        sorted.push(item);
      }
    }

    return sorted;
  }, [rawCategories, prefs.categoryOrder]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = categoryBoardItems.indexOf(active.id as string);
    const newIndex = categoryBoardItems.indexOf(over.id as string);
    if (oldIndex !== -1 && newIndex !== -1) {
      const newOrder = arrayMove(categoryBoardItems, oldIndex, newIndex);
      const updated = { ...prefs, categoryOrder: newOrder };
      setPrefs(updated);
      saveUserPreferences(user?.id, updated);
    }
  };

  // Add / Edit Service Form Actions
  const openNew = (category?: string) => {
    setEditing(null);
    setForm({ ...SVC_EMPTY, category: category || 'Services' });
    setModalError('');
    setModal(true);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      title: s.title,
      url: s.url,
      description: s.description || '',
      icon: s.icon || '',
      category: s.category || 'Services',
      is_private: Boolean(s.is_private),
      requires_vpn: Boolean(s.requires_vpn),
    });
    setModalError('');
    setModal(true);
  };

  const handleServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setModalError('Title is required');
      return;
    }
    try {
      if (editing) {
        await api.put(`/services/${editing.id}`, form);
      } else {
        await api.post('/services', form);
      }
      setModal(false);
      onRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save service');
    }
  };

  const removeService = async (id: number) => {
    if (!window.confirm('Are you sure you want to remove this service?')) return;
    try {
      await api.delete(`/services/${id}`);
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Failed to delete service');
    }
  };

  // Category Actions
  const handleAddCategory = () => {
    const trimmed = newCatName.trim();
    if (!trimmed) return;
    const current = prefs.customCategories || [];
    if (!current.includes(trimmed)) {
      const nextCustom = [...current, trimmed];
      const nextOrder = [...(prefs.categoryOrder || []), `cat:${trimmed}`];
      const updated = { ...prefs, customCategories: nextCustom, categoryOrder: nextOrder };
      setPrefs(updated);
      saveUserPreferences(user?.id, updated);
    }
    setNewCatName('');
    setCategoryModal(false);
  };

  const handleRenameCategory = () => {
    const oldName = renameModal.oldName;
    const newName = renameModal.newName.trim();
    if (!newName || newName === oldName) {
      setRenameModal({ open: false, oldName: '', newName: '' });
      return;
    }
    const currentCustom = (prefs.customCategories || []).map(c => c === oldName ? newName : c);
    const currentOrder = (prefs.categoryOrder || []).map(c => {
      if (c === oldName || c === `cat:${oldName}`) return `cat:${newName}`;
      return c;
    });
    const updated = { ...prefs, customCategories: currentCustom, categoryOrder: currentOrder };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
    setRenameModal({ open: false, oldName: '', newName: '' });
  };

  // Set board size (columns and rows) for a widget, same model as service cards
  const setWidgetBoardSize = (widgetKey: string, colSpan: number, rowSpan: number) => {
    const updated: UserPreferences = {
      ...prefs,
      widgetSizes: { ...(prefs.widgetSizes || {}), [`grid:${widgetKey}`]: { colSpan, rowSpan } },
    };
    setPrefs(updated);
    saveUserPreferences(user?.id, updated);
  };

  return {
    user,
    prefs,
    setPrefs,
    error,
    setError,
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
    activeWidgetKeys,
    unifiedBoardItems: categoryBoardItems,
    categoryBoardItems,
    sensors,
    handleDragEnd,
    openNew,
    openEdit,
    handleServiceSubmit,
    removeService,
    handleAddCategory,
    handleRenameCategory,
    setWidgetBoardSize,
  };
}
