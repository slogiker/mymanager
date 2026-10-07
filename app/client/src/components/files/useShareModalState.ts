import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../lib/api';

export interface UserCandidate {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface ItemPermission {
  id: number;
  item_type: string;
  item_id: string;
  user_id: number;
  permission: 'viewer' | 'editor';
  created_at: string;
  name: string;
  username: string;
  email: string;
}

export interface ItemOwner {
  id: number;
  name: string;
  username: string;
  email: string;
}

export interface ShareRecord {
  id: string;
  type: string;
  item_id: string;
  token: string;
  permission?: 'viewer' | 'editor';
  is_public?: number;
  expires_at: string | null;
  created_at: string;
  share_url?: string;
}

export interface UseShareModalStateProps {
  open: boolean;
  type: 'file' | 'folder' | 'clip';
  itemId: string | number;
}

export function useShareModalState({ open, type, itemId }: UseShareModalStateProps) {
  const [accessMode, setAccessMode] = useState<'public' | 'restricted'>('public');
  const [publicRole, setPublicRole] = useState<'viewer' | 'editor'>('viewer');
  const [expiry, setExpiry] = useState('never');

  const [activeShare, setActiveShare] = useState<ShareRecord | null>(null);
  const [creatingShare, setCreatingShare] = useState(false);
  const [copied, setCopied] = useState(false);

  const [owner, setOwner] = useState<ItemOwner | null>(null);
  const [permissions, setPermissions] = useState<ItemPermission[]>([]);
  const [usersList, setUsersList] = useState<UserCandidate[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  const [selectedUser, setSelectedUser] = useState<UserCandidate | null>(null);
  const [selectedRole, setSelectedRole] = useState<'viewer' | 'editor'>('viewer');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = useCallback(async () => {
    if (!open) return;
    setError(null);
    try {
      const shares = await api.get<ShareRecord[]>('/shares');
      const existing = shares.find(s => s.type === type && String(s.item_id) === String(itemId));
      if (existing) {
        setActiveShare(existing);
        setAccessMode('public');
        if (existing.permission) setPublicRole(existing.permission);
      } else {
        setActiveShare(null);
        setAccessMode('restricted');
      }
    } catch {
      setActiveShare(null);
    }

    try {
      const permData = await api.get<{ owner: ItemOwner; permissions: ItemPermission[] }>(
        `/shares/permissions/${type}/${itemId}`
      );
      setOwner(permData.owner);
      setPermissions(permData.permissions || []);
    } catch {}

    setLoadingUsers(true);
    try {
      const users = await api.get<UserCandidate[]>('/users');
      setUsersList(users);
    } catch {
      setUsersList([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [open, type, itemId]);

  useEffect(() => {
    if (open) {
      loadData();
      setSelectedUser(null);
      setError(null);
    }
  }, [open, loadData]);

  async function handleCreatePublicShare(targetRole?: 'viewer' | 'editor') {
    setCreatingShare(true);
    setError(null);
    try {
      const share = await api.post<ShareRecord>('/shares', {
        type,
        item_id: String(itemId),
        permission: targetRole || publicRole,
        expiry: expiry === 'never' ? null : expiry,
        is_public: 1,
      });
      setActiveShare(share);
      setAccessMode('public');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to create share link';
      setError(msg);
    } finally {
      setCreatingShare(false);
    }
  }

  async function handleAccessModeChange(mode: 'public' | 'restricted') {
    if (mode === 'public') {
      if (!activeShare) {
        await handleCreatePublicShare();
      } else {
        setAccessMode('public');
      }
    } else {
      if (activeShare) {
        await handleRevokePublicShare();
      }
      setAccessMode('restricted');
    }
  }

  async function handleRevokePublicShare() {
    if (!activeShare) return;
    try {
      await api.delete(`/shares/${activeShare.token}`);
      setActiveShare(null);
    } catch {}
  }

  async function handleAddUser() {
    if (!selectedUser) return;
    setAddingUser(true);
    setError(null);
    try {
      const newPerm = await api.post<ItemPermission>(`/shares/permissions/${type}/${itemId}`, {
        user_id: selectedUser.id,
        permission: selectedRole,
      });
      setPermissions(prev => {
        const filtered = prev.filter(p => p.user_id !== selectedUser.id);
        return [...filtered, newPerm];
      });
      setSelectedUser(null);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to add user permission';
      setError(msg);
    } finally {
      setAddingUser(false);
    }
  }

  async function handleUpdateUserRole(userId: number, newRole: 'viewer' | 'editor') {
    try {
      const updated = await api.post<ItemPermission>(`/shares/permissions/${type}/${itemId}`, {
        user_id: userId,
        permission: newRole,
      });
      setPermissions(prev => prev.map(p => (p.user_id === userId ? updated : p)));
    } catch {}
  }

  async function handleRemoveUser(userId: number) {
    try {
      await api.delete(`/shares/permissions/${type}/${itemId}/${userId}`);
      setPermissions(prev => prev.filter(p => p.user_id !== userId));
    } catch {}
  }

  async function handleBroadcastToUsers() {
    setBroadcasting(true);
    setBroadcastMsg(null);
    try {
      const res = await api.post<{ message: string; shared_count: number }>(
        `/clipboard/${itemId}/share-to-users`
      );
      setBroadcastMsg(res.message || `Shared to ${res.shared_count} user(s)`);
      setTimeout(() => setBroadcastMsg(null), 4000);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'Failed to broadcast clip';
      setError(msg);
    } finally {
      setBroadcasting(false);
    }
  }

  function copyLink(token?: string) {
    const t = token || activeShare?.token;
    if (!t) return;
    const url = `${window.location.origin}/share/${t}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  const shareUrl = activeShare ? `${window.location.origin}/share/${activeShare.token}` : null;
  const availableCandidates = usersList.filter(
    u => u.id !== owner?.id && !permissions.some(p => p.user_id === u.id)
  );

  return {
    accessMode,
    publicRole,
    setPublicRole,
    expiry,
    setExpiry,
    activeShare,
    creatingShare,
    copied,
    owner,
    permissions,
    loadingUsers,
    selectedUser,
    setSelectedUser,
    selectedRole,
    setSelectedRole,
    userDropdownOpen,
    setUserDropdownOpen,
    addingUser,
    broadcasting,
    broadcastMsg,
    error,
    dropdownRef,
    availableCandidates,
    shareUrl,
    handleCreatePublicShare,
    handleAccessModeChange,
    handleRevokePublicShare,
    handleAddUser,
    handleUpdateUserRole,
    handleRemoveUser,
    handleBroadcastToUsers,
    copyLink,
  };
}
