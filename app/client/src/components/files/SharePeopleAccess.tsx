import React from 'react';
import { UserPlus, ChevronDown, User } from 'lucide-react';
import { UserCandidate, ItemOwner, ItemPermission } from './useShareModalState';

export interface SharePeopleAccessProps {
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  userDropdownOpen: boolean;
  setUserDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
  selectedUser: UserCandidate | null;
  setSelectedUser: (u: UserCandidate | null) => void;
  selectedRole: 'viewer' | 'editor';
  setSelectedRole: (r: 'viewer' | 'editor') => void;
  availableCandidates: UserCandidate[];
  loadingUsers: boolean;
  addingUser: boolean;
  onAddUser: () => void;
  owner: ItemOwner | null;
  permissions: ItemPermission[];
  onUpdateUserRole: (userId: number, role: 'viewer' | 'editor') => void;
  onRemoveUser: (userId: number) => void;
}

export function SharePeopleAccess({
  dropdownRef,
  userDropdownOpen,
  setUserDropdownOpen,
  selectedUser,
  setSelectedUser,
  selectedRole,
  setSelectedRole,
  availableCandidates,
  loadingUsers,
  addingUser,
  onAddUser,
  owner,
  permissions,
  onUpdateUserRole,
  onRemoveUser,
}: SharePeopleAccessProps) {
  return (
    <>
      {/* 1. Add People Input */}
      <div className="mb-5">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
          <UserPlus size={13} className="text-red-400" /> Add people
        </label>
        <div className="flex gap-2 relative">
          <div className="relative flex-1" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setUserDropdownOpen(v => !v)}
              className="w-full flex items-center justify-between bg-[#17181e] hover:bg-[#1c1e26] border border-white/10 hover:border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-left text-slate-200 transition-colors"
            >
              {selectedUser ? (
                <span className="truncate">
                  <span className="font-semibold text-white">{selectedUser.username}</span>{' '}
                  <span className="text-slate-400 text-[11px]">({selectedUser.email})</span>
                </span>
              ) : (
                <span className="text-slate-500">
                  {loadingUsers ? 'Loading users...' : availableCandidates.length === 0 ? 'No more users to add' : 'Select a user...'}
                </span>
              )}
              <ChevronDown size={12} className="text-slate-500 shrink-0 ml-2" />
            </button>

            {/* Custom Dark Dropdown */}
            {userDropdownOpen && availableCandidates.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 z-40 bg-[#17181e] border border-white/15 rounded-xl shadow-2xl p-1.5 max-h-48 overflow-y-auto backdrop-blur-md divide-y divide-white/5">
                {availableCandidates.map(u => (
                  <div
                    key={u.id}
                    onClick={() => {
                      setSelectedUser(u);
                      setUserDropdownOpen(false);
                    }}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <div className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-[10px] font-bold border border-red-500/30 shrink-0">
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-white truncate">{u.username}</p>
                      <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Role for added user */}
          <select
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value as 'viewer' | 'editor')}
            className="bg-[#17181e] border border-white/10 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-red-500"
            style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
          >
            <option value="viewer" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Viewer</option>
            <option value="editor" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Editor</option>
          </select>

          <button
            onClick={onAddUser}
            disabled={!selectedUser || addingUser}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-red-600/20 disabled:opacity-40 shrink-0"
          >
            {addingUser ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>

      {/* 2. People with access List */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">People with access</p>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {/* Owner Row */}
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-red-600/20 text-red-400 flex items-center justify-center text-xs font-bold border border-red-500/30 shrink-0">
                {owner?.username ? owner.username.charAt(0).toUpperCase() : <User size={13} />}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {owner?.username || 'Owner'} <span className="text-slate-500 text-[11px]">(Owner)</span>
                </p>
                <p className="text-[10px] text-slate-400 truncate">{owner?.email || 'System Owner'}</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-slate-400 px-2 py-1 bg-white/5 rounded-lg border border-white/10 shrink-0">
              Owner
            </span>
          </div>

          {/* Collaborators Rows */}
          {permissions.map(p => (
            <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xs font-bold border border-blue-500/30 shrink-0">
                  {p.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-200 truncate">{p.username}</p>
                  <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <select
                  value={p.permission}
                  onChange={e => {
                    if (e.target.value === 'remove') {
                      onRemoveUser(p.user_id);
                    } else {
                      onUpdateUserRole(p.user_id, e.target.value as 'viewer' | 'editor');
                    }
                  }}
                  className="bg-[#17181e] text-xs text-slate-200 border border-white/10 rounded-lg px-2.5 py-1 outline-none"
                  style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}
                >
                  <option value="viewer" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Viewer</option>
                  <option value="editor" style={{ backgroundColor: '#17181e', color: '#f1f5f9' }}>Editor</option>
                  <option value="remove" style={{ backgroundColor: '#17181e', color: '#ef4444' }}>Remove access</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
