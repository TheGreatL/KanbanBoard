"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import { Tooltip } from "../ui/Tooltip";
import {
  Share2, X, Search, Loader2, UserPlus, UserMinus, ChevronDown, Check,
} from "lucide-react";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  currentUserId: string | null;
}

const ROLES = [
  { value: "viewer", label: "Viewer", description: "Read-only access" },
  { value: "editor", label: "Editor", description: "Can edit tasks" },
];

function RoleDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const selected = ROLES.find((r) => r.value === value) ?? ROLES[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
      >
        <span className="text-zinc-800 dark:text-zinc-100">{selected.label}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 w-44 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => {
                onChange(role.value);
                setOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div>
                <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{role.label}</p>
                <p className="text-[10px] text-zinc-400">{role.description}</p>
              </div>
              {value === role.value && (
                <Check className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShareModal({ isOpen, onClose, projectId, currentUserId }: ShareModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [projectMembers, setProjectMembers] = useState<any[]>([]);
  const [invitingRole, setInvitingRole] = useState("viewer");

  const currentUserRole = projectMembers.find((m) => m.user_id === currentUserId)?.role;
  const isOwner = currentUserRole === "owner";

  // Set of user IDs already in the project (for filtering search results)
  const memberUserIds = new Set(projectMembers.map((m) => m.user_id));

  const fetchProjectMembers = async () => {
    const { data } = await supabase
      .from("project_members")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("project_id", projectId);
    if (data) setProjectMembers(data);
  };

  useEffect(() => {
    if (isOpen) fetchProjectMembers();
  }, [isOpen, projectId]);

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .ilike("username", `%${query}%`)
      .limit(10); // fetch more so filtering still shows results

    // Filter out users who are already members
    const filtered = (data || []).filter((u) => !memberUserIds.has(u.id));
    setSearchResults(filtered.slice(0, 5));
    setIsSearching(false);
  };

  const addProjectMember = async (userId: string) => {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId, role: invitingRole });

    if (!error) {
      await fetchProjectMembers();
      setSearchQuery("");
      setSearchResults([]);
    }
  };

  const removeProjectMember = async (memberId: string) => {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      await fetchProjectMembers();
    }
  };

  if (!isOpen || typeof window === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-4 p-6"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-semibold">
            <Share2 className="w-4 h-4 text-zinc-500" />
            <h2>Share Project</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Invite Section */}
        <div className="flex flex-col gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchUsers(e.target.value);
              }}
              className="w-full pl-10 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:focus:ring-zinc-800 transition-all text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none"
              placeholder="Invite by username..."
            />
          </div>

          {isOwner && (
            <div className="flex items-center gap-2 px-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase">Role:</span>
              <RoleDropdown value={invitingRole} onChange={setInvitingRole} />
            </div>
          )}

          {/* Search Results */}
          {isSearching ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
            </div>
          ) : searchResults.length > 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800">
              {searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-xs font-bold shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                      ) : (
                        user.username.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{user.username}</span>
                  </div>
                  <button
                    onClick={() => addProjectMember(user.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    Invite
                  </button>
                </div>
              ))}
            </div>
          ) : searchQuery.trim() && !isSearching ? (
            <p className="text-xs text-zinc-400 text-center py-2">No users found.</p>
          ) : null}
        </div>

        {/* Members List */}
        <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider px-1">Current Members</h3>
          <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto pr-1">
            {projectMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center text-[10px] font-bold shrink-0">
                    {member.profile?.avatar_url ? (
                      <img src={member.profile.avatar_url} alt={member.profile.username} className="w-full h-full object-cover" />
                    ) : (
                      member.profile?.username?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {member.profile?.username}
                    </span>
                    <span className="text-[10px] text-zinc-500 capitalize">{member.role}</span>
                  </div>
                </div>
                {member.user_id !== currentUserId &&
                  member.role !== "owner" &&
                  isOwner && (
                    <Tooltip text="Remove member">
                      <button
                        onClick={() => removeProjectMember(member.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  )}
              </div>
            ))}
            {projectMembers.length === 0 && (
              <p className="text-xs text-zinc-500 italic p-2 text-center">No other members yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
