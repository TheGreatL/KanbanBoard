"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, Camera, Save, Check, LogOut } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const DEFAULT_AVATAR =
  "https://oqhjxepxjzkfunemjvqp.supabase.co/storage/v1/object/public/avatars/user-default.png";

export default function ProfilePage() {
  const { showToast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        router.push("/auth");
        return;
      }
      setUser(session.user);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (data) {
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url || "");
      }
      setLoading(false);
    };

    fetchProfile();
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ username, avatar_url: avatarUrl })
        .eq("id", user.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      showToast({
        type: "success",
        title: "Profile Updated",
        message: "Your changes have been saved.",
      });
    } catch (err) {
      showToast({
        type: "error",
        title: "Update Failed",
        message: err instanceof Error ? err.message : "Could not save profile.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);

    try {
      setUploading(true);
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      setAvatarUrl(data.publicUrl);
      setPreviewUrl("");

      showToast({
        type: "info",
        title: "Avatar Ready",
        message: "Click 'Save Changes' to apply your new avatar.",
      });
    } catch (error) {
      setPreviewUrl("");
      showToast({
        type: "error",
        title: "Upload Failed",
        message: error instanceof Error ? error.message : "Could not upload avatar.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-950">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-300 dark:text-zinc-700" />
      </div>
    );
  }

  const displayAvatar = previewUrl || avatarUrl || DEFAULT_AVATAR;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
      {/* Top bar — matches the app header */}
      <div className="glass border-b border-zinc-200/50 dark:border-zinc-800/50 px-4 lg:px-8 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors group text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Board
        </button>
        <span className="text-zinc-300 dark:text-zinc-700">/</span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Profile Settings
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-start justify-center p-4 lg:p-8">
        <div className="w-full max-w-lg space-y-4">

          {/* Avatar card */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 flex items-center gap-5">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800">
                <img
                  src={displayAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 transition-transform active:scale-95">
                {uploading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={uploadAvatar}
                  disabled={uploading}
                />
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-zinc-900 dark:text-zinc-100 text-base truncate">
                {username || "—"}
              </p>
              <p className="text-xs text-zinc-400 truncate mt-0.5">{user.email}</p>
              <p className="text-[10px] text-zinc-400 mt-2 font-medium">
                Click the camera to change your avatar
              </p>
            </div>
          </div>

          {/* Form card */}
          <form
            onSubmit={handleSave}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Account Details
              </h2>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {/* Username row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-20 shrink-0">
                  Username
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 bg-transparent text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none placeholder-zinc-400"
                  placeholder="Enter username"
                />
              </div>

              {/* Email row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 w-20 shrink-0">
                  Email
                </span>
                <span className="flex-1 text-sm text-zinc-400 dark:text-zinc-500 truncate select-all">
                  {user.email}
                </span>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
              <button
                type="submit"
                disabled={isSaving || !username.trim()}
                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {saved ? (
                  <Check className="w-4 h-4" />
                ) : isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {saved ? "Saved!" : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Danger zone */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Session
              </h2>
            </div>
            <div className="px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Sign out
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  You'll be redirected to the login page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  supabase.auth.signOut();
                  router.push("/auth");
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
