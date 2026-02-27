import { Plus, FolderKanban, LogOut, Loader2, Trash2, Pencil, X, Archive, RotateCcw, Check, ChevronRight, Users } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip } from "./ui/Tooltip";
import { useToast } from "./ui/Toast";
import ProjectModal from "./modals/ProjectModal";
import { createPortal } from "react-dom";

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
  onClose?: () => void;
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
  onClose,
}: SidebarProps) {
  const { showToast } = useToast();
  const [projectToRestore, setProjectToRestore] = useState<{ id: string; title: string } | null>(null);
  const [projectToArchive, setProjectToArchive] = useState<{ id: string; title: string } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<"create" | "edit">("create");
  const [projectModalTitle, setProjectModalTitle] = useState("");
  const [projectModalId, setProjectModalId] = useState<string | null>(null);

  const activeProjects = projects.filter((p) => !p.archived_at);
  const archivedProjects = projects.filter((p) => p.archived_at);

  const handleCreate = async (title: string) => {
    try {
      await onCreateProject(title);
      showToast({
        type: "success",
        title: "Project Created",
        message: `"${title}" is ready for your tasks.`,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Creation Failed",
        message: "Could not create the project.",
      });
      throw err;
    }
  };

  const handleUpdate = async (title: string) => {
    if (!projectModalId) return;
    try {
      await onUpdateProject(projectModalId, title);
      showToast({
        type: "success",
        title: "Project Rename",
        message: `Project renamed to "${title}".`,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Rename Failed",
        message: "Could not update project name.",
      });
      throw err;
    }
  };

  const handleArchive = async (id: string, title: string) => {
    try {
      await onArchiveProject(id);
      showToast({
        type: "info",
        title: "Project Archived",
        message: `"${title}" has been moved to archives.`,
        action: {
          label: "Undo",
          onClick: () => onRestoreProject(id),
        },
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Archive Failed",
        message: "Could not archive project.",
      });
    }
    setProjectToArchive(null);
  };

  const handleRestore = async (id: string, title: string) => {
    try {
      await onRestoreProject(id);
      showToast({
        type: "success",
        title: "Project Restored",
        message: `"${title}" is back in active projects.`,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Restore Failed",
        message: "Could not restore project.",
      });
    }
    setProjectToRestore(null);
  };

  const handleDelete = async (id: string, title: string) => {
    try {
      await onDeleteProject(id);
      showToast({
        type: "info",
        title: "Project Deleted",
        message: `"${title}" and its data have been removed.`,
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Delete Failed",
        message: "Could not permanently delete project.",
      });
    }
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
        <span className="truncate flex-1 flex items-center gap-1.5 font-medium">
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

        <div className="flex items-center gap-1  lg:opacity-0 lg:group-hover:opacity-100 transition-all ml-2">
          <Tooltip text="Edit Project">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setProjectModalMode("edit");
                setProjectModalTitle(p.title);
                setProjectModalId(p.id);
                setIsProjectModalOpen(true);
              }}
              className="text-zinc-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
          {isArchived ? (
            <>
              <Tooltip text="Restore Project">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToRestore({ id: p.id, title: p.title });
                  }}
                  className="text-zinc-400 hover:text-emerald-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
              <Tooltip text="Delete Project Permanently">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(p.id);
                  }}
                  className="text-zinc-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            </>
          ) : (
            <Tooltip text="Archive Project">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectToArchive({ id: p.id, title: p.title });
                }}
                className="text-zinc-400 hover:text-amber-500 transition-colors p-1 rounded-md hover:bg-zinc-200 dark:hover:bg-zinc-800 cursor-pointer"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <aside className="w-72 lg:w-64 border-r border-zinc-200/50 dark:border-zinc-800/50 glass flex flex-col h-full shrink-0 shadow-xl lg:shadow-none">
      <div className="p-4 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FolderKanban className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Kanban</h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Projects</h2>
          <button
            onClick={() => {
              setProjectModalMode("create");
              setProjectModalTitle("");
              setProjectModalId(null);
              setIsProjectModalOpen(true);
            }}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>


        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="w-5 h-5 animate-spin text-zinc-300 dark:text-zinc-700" />
          </div>
        ) : (
          <div className="space-y-4">
            <ul className="space-y-1">
              {activeProjects.map((p) => renderProjectItem(p, false))}
              {activeProjects.length === 0 && (
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

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={projectModalMode === "create" ? handleCreate : handleUpdate}
        mode={projectModalMode}
        initialTitle={projectModalTitle}
      />

      {/* Archive Project Modal - Portalled */}
      {projectToArchive && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[203] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6 cursor-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setProjectToArchive(null);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="w-4 h-4 text-amber-500" />
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Archive Project</h2>
              </div>
              <button
                onClick={() => setProjectToArchive(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Move <span className="font-bold text-zinc-900 dark:text-zinc-100">"{projectToArchive.title}"</span> to the archives? You can restore it later if you need to work on it again.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setProjectToArchive(null)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(projectToArchive.id, projectToArchive.title)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs text-white font-bold bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Confirm Archive
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Restore Project Modal - Portalled */}
      {projectToRestore && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[203] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col gap-4 p-6 cursor-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setProjectToRestore(null);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-emerald-500" />
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Restore Project</h2>
              </div>
              <button
                onClick={() => setProjectToRestore(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Restore <span className="font-bold text-zinc-900 dark:text-zinc-100">"{projectToRestore.title}"</span>? It will appear back in your active projects list.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setProjectToRestore(null)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(projectToRestore.id, projectToRestore.title)}
                className="flex items-center gap-1.5 px-5 py-2 text-xs text-white font-bold bg-emerald-500 rounded-lg hover:bg-emerald-600 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Restore Project
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Modal - Portalled */}
      {projectToDelete && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[203] flex items-center justify-center bg-black/40 backdrop-blur-[2px] px-4"
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
              <div className="flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <h2 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">Delete Project</h2>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
              Are you sure you want to delete this project, including all its columns and tasks? This action <span className="text-zinc-900 dark:text-zinc-100 font-bold">cannot be undone</span>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-bold cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const p = projects.find(proj => proj.id === projectToDelete);
                  if (p) handleDelete(p.id, p.title);
                  setProjectToDelete(null);
                }}
                className="flex items-center gap-1.5 px-5 py-2 text-xs bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Project
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </aside>
  );
}
