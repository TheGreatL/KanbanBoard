'use client';
import { 
  IconPlus, IconFolder, IconLogout, IconTrash, IconPencil, 
  IconX, IconArchive, IconRotateClockwise, IconCheck, 
  IconChevronRight, IconUsers, IconSettings 
} from "@tabler/icons-react";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "./ui/Toast";
import ProjectModal from "./modals/ProjectModal";
import Link from "next/link";
import { SidebarSkeleton } from "./ui/Skeleton";
import { ProjectTemplate } from "@/lib/templates";
import { Modal, Button, Text, Group, Menu, Avatar, UnstyledButton, ActionIcon, Tooltip } from '@mantine/core';

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
  onCreateProject: (title: string, template: ProjectTemplate) => Promise<void>;
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
  const [profile, setProfile] = useState<{ username: string; avatar_url: string | null } | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectToRestore, setProjectToRestore] = useState<{ id: string; title: string } | null>(null);
  const [projectToArchive, setProjectToArchive] = useState<{ id: string; title: string } | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [projectModalMode, setProjectModalMode] = useState<"create" | "edit">("create");
  const [projectModalTitle, setProjectModalTitle] = useState("");
  const [projectModalId, setProjectModalId] = useState<string | null>(null);

  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizing, setIsResizing] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing || !isDesktop) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    } else {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, isDesktop]);

  const activeProjects = projects.filter((p) => !p.archived_at);
  const archivedProjects = projects.filter((p) => p.archived_at);

  useEffect(() => {
    if (!currentUserId) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", currentUserId)
        .single();
      if (data) setProfile(data);
    };
    fetchProfile();

    const profileChannel = supabase
      .channel(`profile_${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${currentUserId}`,
        },
        (payload: any) => {
          setProfile(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [currentUserId]);

  const handleCreate = async (title: string, template: ProjectTemplate) => {
    try {
      await onCreateProject(title, template);
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
    setProjectToDelete(null);
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
          <IconFolder
            size={14}
            className={`shrink-0 transition-colors ${
              activeProjectId === p.id ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-400 dark:text-zinc-600"
            }`}
          />
          {p.title}
          {p.user_id !== currentUserId && (
            <IconUsers size={12} className="ml-1 text-zinc-400 group-hover:text-zinc-500" />
          )}
        </span>

        <div className="flex items-center gap-1 lg:opacity-0 lg:group-hover:opacity-100 transition-all ml-2">
          <Tooltip label="Edit Project" position="top" withArrow>
            <ActionIcon
              variant="subtle"
              color="blue"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setProjectModalMode("edit");
                setProjectModalTitle(p.title);
                setProjectModalId(p.id);
                setIsProjectModalOpen(true);
              }}
            >
              <IconPencil size={14} />
            </ActionIcon>
          </Tooltip>
          {isArchived ? (
            <>
              <Tooltip label="Restore Project" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="teal"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToRestore({ id: p.id, title: p.title });
                  }}
                >
                  <IconRotateClockwise size={14} />
                </ActionIcon>
              </Tooltip>
              <Tooltip label="Delete Project Permanently" position="top" withArrow>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setProjectToDelete(p.id);
                  }}
                >
                  <IconTrash size={14} />
                </ActionIcon>
              </Tooltip>
            </>
          ) : (
            <Tooltip label="Archive Project" position="top" withArrow>
              <ActionIcon
                variant="subtle"
                color="orange"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setProjectToArchive({ id: p.id, title: p.title });
                }}
              >
                <IconArchive size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </div>
      </div>
    </li>
  );

  return (
    <aside 
      className={cn(
        "border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 flex flex-col h-full shrink-0 shadow-sm relative transition-[width] duration-75 lg:transition-none",
        !isDesktop ? "w-72" : ""
      )}
      style={{ width: isDesktop ? sidebarWidth : undefined }}
    >
      <div 
        onMouseDown={() => setIsResizing(true)}
        className="absolute top-0 right-[-3px] w-1.5 h-full cursor-col-resize hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors z-[60] lg:block hidden"
      />
      <div className="p-4 flex items-center justify-between border-b border-zinc-200/50 dark:border-zinc-800/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shadow-sm">
            <IconFolder size={18} className="text-white" />
          </div>
          <h1 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Kanban</h1>
        </div>
        {onClose && (
         <div className="lg:hidden block">
            <ActionIcon
            variant="subtle"
            color="gray"
            className="lg:hidden"
            onClick={onClose}
          >
            <IconX size={20} />
          </ActionIcon>
             </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar p-3">
        <div className="flex items-center justify-between px-2 mb-2">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase">Projects</h2>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            onClick={() => {
              setProjectModalMode("create");
              setProjectModalTitle("");
              setProjectModalId(null);
              setIsProjectModalOpen(true);
            }}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </div>

        {isLoading ? (
          <SidebarSkeleton />
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
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase group"
                >
                  <IconChevronRight
                    size={14}
                    className={cn(
                      "transition-transform duration-200",
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

      <div className="p-3 border-t border-zinc-200/50 dark:border-zinc-800/50">
        <Menu shadow="md" width={200} position="top-start" offset={10}>
          <Menu.Target>
            <UnstyledButton className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
              <Avatar 
                src={profile?.avatar_url || "https://oqhjxepxjzkfunemjvqp.supabase.co/storage/v1/object/public/avatars/user-default.png"} 
                radius="xl" 
                size="sm" 
              />
              <div className="flex-1 min-w-0 text-left">
                <Text size="sm" fw={600} truncate c="var(--mantine-color-text)">
                  {profile?.username || "—"}
                </Text>
                <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                  My account
                </Text>
              </div>
              <IconChevronRight size={16} className="text-zinc-400" />
            </UnstyledButton>
          </Menu.Target>

          <Menu.Dropdown>
            <Menu.Item leftSection={<IconSettings size={14} />} component={Link} href="/profile">
              Profile Settings
            </Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" leftSection={<IconLogout size={14} />} onClick={onLogout}>
              Sign Out
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSubmit={projectModalMode === "create" ? handleCreate : handleUpdate}
        mode={projectModalMode}
        initialTitle={projectModalTitle}
      />

      <Modal opened={!!projectToArchive} onClose={() => setProjectToArchive(null)} title={<Group gap="xs"><IconArchive size={18} className="text-amber-500"/><Text fw={600}>Archive Project</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Move <Text span fw={600} c="var(--mantine-color-text)">&quot;{projectToArchive?.title}&quot;</Text> to the archives? You can restore it later.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setProjectToArchive(null)}>Cancel</Button>
          <Button color="orange" leftSection={<IconCheck size={16} />} onClick={() => projectToArchive && handleArchive(projectToArchive.id, projectToArchive.title)}>Confirm Archive</Button>
        </Group>
      </Modal>

      <Modal opened={!!projectToRestore} onClose={() => setProjectToRestore(null)} title={<Group gap="xs"><IconRotateClockwise size={18} className="text-emerald-500"/><Text fw={600}>Restore Project</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Restore <Text span fw={600} c="var(--mantine-color-text)">&quot;{projectToRestore?.title}&quot;</Text>? It will appear back in your active projects list.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setProjectToRestore(null)}>Cancel</Button>
          <Button color="teal" leftSection={<IconCheck size={16} />} onClick={() => projectToRestore && handleRestore(projectToRestore.id, projectToRestore.title)}>Restore Project</Button>
        </Group>
      </Modal>

      <Modal opened={!!projectToDelete} onClose={() => setProjectToDelete(null)} title={<Group gap="xs"><IconTrash size={18} className="text-red-500"/><Text fw={600}>Delete Project</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Are you sure you want to delete this project? This action <Text span fw={600} c="var(--mantine-color-text)">cannot be undone</Text>.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setProjectToDelete(null)}>Cancel</Button>
          <Button color="red" leftSection={<IconTrash size={16} />} onClick={() => {
            const p = projects.find(proj => proj.id === projectToDelete);
            if (p) handleDelete(p.id, p.title);
            setProjectToDelete(null);
          }}>Delete Project</Button>
        </Group>
      </Modal>
    </aside>
  );
}
