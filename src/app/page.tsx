"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, LayoutDashboard } from "lucide-react";
import Sidebar, { Project } from "@/components/Sidebar";
import dynamic from "next/dynamic";

const KanbanBoard = dynamic(() => import("@/components/KanbanBoard"), { ssr: false });

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const router = useRouter();


  const fetchProjects = useCallback(async () => {
    setLoadingProjects(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      setProjects(data);
      // Only set active project from UNARCHIVED ones if none is active
      setActiveProjectId((prev) => {
        if (prev) return prev;
        const firstActive = data.find(p => !p.archived_at);
        return firstActive ? firstActive.id : (data.length > 0 ? data[0].id : null);
      });
    }
    setLoadingProjects(false);
  }, []); // no deps needed — reads supabase client (stable) only

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
      } else {
        setCurrentUserId(session.user.id);
        fetchProjects();
        setLoading(false);
      }
    };
    
    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/auth");
        } else {
          setCurrentUserId(session.user.id);
          fetchProjects();
        }
      }
    );

    // Subscribe to project_members changes to update project list in real-time
    const membersChannel = supabase
      .channel("sidebar_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "project_members",
        },
        () => {
          fetchProjects();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
        },
        () => {
          fetchProjects();
        }
      )
      .subscribe();

    return () => {
      authListener.subscription.unsubscribe();
      supabase.removeChannel(membersChannel);
    };
  }, [router, fetchProjects]);

  const createProject = async (title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("projects")
      .insert({ title, user_id: user.id })
      .select()
      .single();

    if (data) {
      setProjects([data, ...projects]);
      setActiveProjectId(data.id);
    }
  };

  const archiveProject = async (id: string) => {
    const now = new Date().toISOString();
    setProjects(projects.map((p) => (p.id === id ? { ...p, archived_at: now } : p)));
    
    // If archiving active project, switch to another active one
    if (activeProjectId === id) {
      const remainingActive = projects.filter((p) => p.id !== id && !p.archived_at);
      setActiveProjectId(remainingActive.length > 0 ? remainingActive[0].id : null);
    }
    
    await supabase.from("projects").update({ archived_at: now }).eq("id", id);
  };

  const restoreProject = async (id: string) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, archived_at: null } : p)));
    await supabase.from("projects").update({ archived_at: null }).eq("id", id);
  };

  const deleteProjectPermanently = async (id: string) => {
    setProjects(projects.filter((p) => p.id !== id));
    if (activeProjectId === id) {
      const remaining = projects.filter((p) => p.id !== id && !p.archived_at);
      const remainingAll = projects.filter((p) => p.id !== id);
      setActiveProjectId(remaining.length > 0 ? remaining[0].id : (remainingAll.length > 0 ? remainingAll[0].id : null));
    }
    await supabase.from("projects").delete().eq("id", id);
  };

  const updateProject = async (id: string, title: string) => {
    setProjects(projects.map((p) => (p.id === id ? { ...p, title } : p)));
    await supabase.from("projects").update({ title }).eq("id", id);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 overflow-hidden">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        isLoading={loadingProjects}
        onSelectProject={setActiveProjectId}
        onCreateProject={createProject}
        onArchiveProject={archiveProject}
        onRestoreProject={restoreProject}
        onDeleteProject={deleteProjectPermanently}
        onUpdateProject={updateProject}
        onLogout={handleLogout}
        currentUserId={currentUserId}
      />
      
      <main className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-zinc-950 min-w-0 min-h-0">
        {activeProjectId ? (
          <div className="flex-1 p-8 min-w-0 min-h-0 relative overflow-hidden">
            <KanbanBoard projectId={activeProjectId} />
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto">
            <div className="w-16 h-16 bg-zinc-100 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800">
              <LayoutDashboard className="w-8 h-8 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              No projects yet
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mb-8 text-sm">
              Create a new project to start organizing your tasks and ideas with your new minimalist Kanban board.
            </p>
            {/* The sidebar has a create project button anyway, but we can add an action here too or just point to sidebar */}
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              ← Use the sidebar to create your first project
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
