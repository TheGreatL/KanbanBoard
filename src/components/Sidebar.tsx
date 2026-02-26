import { Plus, FolderKanban, LogOut, Loader2, Trash2, Pencil, X, Archive, RotateCcw, ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface Project {
  id: string;
  title: string;
  user_id: string;
  archived_at?: string | null;
}

interface SidebarProps {
  projects: Project[];
  activeProjectId: string | null;
  isLoading: boolean;
  onSelectProject: (id: string) => void;
  onCreateProject: (title: string) => Promise<void>;
  onArchiveProject: (id: string) => Promise<void>;
  onRestoreProject: (id: string) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  onUpdateProject: (id: string, title: string) => Promise<void>;
  onLogout: () => void;
  currentUserId: string | null;
}

export default function Sidebar({
  projects,
  activeProjectId,
  isLoading,
  onSelectProject,
  onCreateProject,
  onArchiveProject,
  onRestoreProject,
  onDeleteProject,
  onUpdateProject,
  onLogout,
  currentUserId,
}: SidebarProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creatingId, setCreatingId] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);

  const activeProjects = projects.filter((p) => !p.archived_at);
  const archivedProjects = projects.filter((p) => p.archived_at);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreatingId(true);
    await onCreateProject(newTitle.trim());
    setNewTitle("");
    setIsCreating(false);
    setCreatingId(false);
  };

  const handleUpdate = async (id: string) => {
    if (!editTitle.trim()) {
      setEditingId(null);
      return;
    }
    await onUpdateProject(id, editTitle.trim());
    setEditingId(null);
  };

  const renderProjectItem = (p: Project, isArchived: boolean = false) => (
    <li key={p.id}>
      <div
        className={cn(
          "group flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors",
          activeProjectId === p.id
            ? "bg-zinc-200/50 dark:bg-zinc-800/50 text-zinc-900 dark:text-zinc-100 font-medium"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-zinc-100",
          isArchived && activeProjectId !== p.id && "opacity-60 hover:opacity-100"
        )}
        onClick={() => onSelectProject(p.id)}
      >
        {editingId === p.id ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(p.id);
            }}
            className="flex-1 mr-2"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              autoFocus
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => handleUpdate(p.id)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Escape") setEditingId(null);
              }}
              className="w-full text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all"
              disabled={creatingId}
            />
          </form>
        ) : (
          <span className="truncate flex-1 flex items-center gap-1.5">
            <FolderKanban
              className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                activeProjectId === p.id ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600"
              }`}
            />
            {p.title}
            {p.user_id !== currentUserId && (
              <Users className="w-2.5 h-2.5 ml-1 text-zinc-400 group-hover:text-zinc-500" />
            )}
          </span>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2">
          {editingId !== p.id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditingId(p.id);
                setEditTitle(p.title);
              }}
              className="text-zinc-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Edit Project"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          {isArchived ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestoreProject(p.id);
                }}
                className="text-zinc-400 hover:text-emerald-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                title="Restore Project"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectToDelete(p.id);
                }}
                className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                title="Delete Project Permanently"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onArchiveProject(p.id);
              }}
              className="text-zinc-400 hover:text-amber-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              title="Archive Project"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 flex flex-col h-full shrink-0">
      <div className="p-4 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <FolderKanban className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
        <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">Kanban Board</h1>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Projects</h2>
          <button
            onClick={() => setIsCreating(true)}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {isCreating && (
          <form onSubmit={handleCreate} className="mb-2">
            <input
              autoFocus
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onBlur={() => !newTitle && setIsCreating(false)}
              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all text-zinc-900 dark:text-zinc-100"
              placeholder="Project name..."
              disabled={creatingId}
            />
          </form>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-300 dark:text-zinc-700" />
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-1">
              {activeProjects.map((p) => renderProjectItem(p, false))}
              {activeProjects.length === 0 && !isCreating && (
                <li className="px-3 py-2 text-xs text-zinc-400 text-center">No active projects yet.</li>
              )}
            </ul>

            {archivedProjects.length > 0 && (
              <div className="space-y-1">
                <button
                  onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase tracking-wider group"
                >
                  <ChevronRight
                    className={cn(
                      "w-3.5 h-3.5 transition-transform duration-200",
                      isArchivedExpanded && "rotate-90"
                    )}
                  />
                  <span>Archived</span>
                  <span className="ml-auto bg-zinc-200/50 dark:bg-zinc-800/50 px-1.5 py-0.5 rounded text-[10px]">
                    {archivedProjects.length}
                  </span>
                </button>

                {isArchivedExpanded && (
                  <ul className="space-y-1 mt-1">
                    {archivedProjects.map((p) => renderProjectItem(p, true))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={onLogout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/30 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Delete Modal */}
      {projectToDelete && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6 cursor-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setProjectToDelete(null);
            }}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Delete Project</h2>
              <button
                onClick={() => setProjectToDelete(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete this project, including all its columns and tasks? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteProject(projectToDelete);
                  setProjectToDelete(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-red-500 text-white font-medium rounded-lg hover:bg-red-500/90 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
