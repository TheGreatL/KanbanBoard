'use client';
import { cn } from "@/lib/utils";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { IconTrash, IconPencil, IconX, IconCheck, IconCalendar, IconGripVertical, IconRotateClockwise, IconPaperclip, IconMagnet } from "@tabler/icons-react";
import { useState, useRef, useEffect } from "react";
import { Tooltip, Modal, Button, Text, Group, ActionIcon, TextInput, Textarea, FileInput, Badge, Image as MantineImage } from '@mantine/core';
import { supabase } from "@/lib/supabase";

export interface Task {
  id: string;
  column_id: string;
  project_id: string;
  title: string;
  content: string;
  position: string;
  created_at?: string;
  archived_at?: string | null;
  previous_column_id?: string | null;
  attachments?: { name: string; url: string; type: string; path: string }[];
}

interface TaskCardProps {
  task: Task;
  columnColor?: string;
  deleteTask: (id: string) => void;
  updateTask?: (id: string, title: string, content: string, attachments?: any[]) => Promise<void>;
  restoreTask?: (id: string, targetColumnId: string) => Promise<void>;
  isOverlay?: boolean;
  isEditable?: boolean;
}

const STRIP_COLOR_MAP: Record<string, string> = {
  zinc: "bg-zinc-400 dark:bg-zinc-500",
  blue: "bg-blue-400 dark:bg-blue-500",
  rose: "bg-rose-400 dark:bg-rose-500",
  emerald: "bg-emerald-400 dark:bg-emerald-500",
  amber: "bg-amber-400 dark:bg-amber-500",
  indigo: "bg-indigo-400 dark:bg-indigo-500",
  violet: "bg-violet-400 dark:bg-violet-500",
  cyan: "bg-cyan-400 dark:bg-cyan-500",
  teal: "bg-teal-400 dark:bg-teal-500",
  fuchsia: "bg-fuchsia-400 dark:bg-fuchsia-500",
  orange: "bg-orange-400 dark:bg-orange-500",
};

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function TaskCard({ task, columnColor = "zinc", deleteTask, updateTask, restoreTask, isOverlay, isEditable = true }: TaskCardProps) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { type: "Task", task },
    disabled: isOverlay || !isEditable,
  });

  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
  };

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title ?? "");
  const [editContent, setEditContent] = useState(task.content ?? "");
  const [editAttachments, setEditAttachments] = useState<{ name: string; url: string; type: string; path: string }[]>(task.attachments ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  const isArchived = !!task.archived_at;
  const accentColorClass = STRIP_COLOR_MAP[columnColor] || STRIP_COLOR_MAP.zinc;

  useEffect(() => {
    setEditTitle((prev: string) => prev !== task.title ? (task.title ?? "") : prev);
    setEditContent((prev: string) => prev !== task.content ? (task.content ?? "") : prev);
    setEditAttachments(task.attachments ?? []);
  }, [task.title, task.content, task.attachments]);

  useEffect(() => {
    if (isEditing && titleInputRef.current) {
      titleInputRef.current.focus({ preventScroll: true });
    }
  }, [isEditing]);

  const handleEditSave = async () => {
    const trimTitle = editTitle.trim();
    const trimContent = editContent.trim();
    if (!trimTitle && !trimContent) return;
    
    let finalAttachments = [...editAttachments];
    
    if (newFiles.length > 0) {
      setIsUploading(true);
      for (const file of newFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file);
          
        if (!uploadError) {
          const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
          finalAttachments.push({
            name: file.name,
            url: data.publicUrl,
            type: file.type,
            path: filePath
          });
        }
      }
      setIsUploading(false);
    }
    
    if (updateTask) {
      await updateTask(task.id, trimTitle, trimContent, finalAttachments);
    }
    setNewFiles([]);
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsEditing(false);
      setEditTitle(task.title ?? "");
      setEditContent(task.content ?? "");
      setEditAttachments(task.attachments ?? []);
      setNewFiles([]);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditTitle(task.title ?? "");
    setEditContent(task.content ?? "");
    setEditAttachments(task.attachments ?? []);
    setNewFiles([]);
  };

  if (isDragging && !isOverlay) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-50 border-2 border-dashed border-zinc-400 dark:border-zinc-500 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 min-h-[80px]"
      />
    );
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className="no-pan group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50 hover:border-blue-500/30 dark:hover:border-blue-500/30 hover:shadow-xl hover:shadow-zinc-200/30 dark:hover:shadow-black/50 transition-all text-sm text-zinc-800 dark:text-zinc-200 flex items-stretch cursor-default relative overflow-hidden active:scale-[0.99]"
        tabIndex={undefined}
      >
        <div className={`w-1 shrink-0 ${accentColorClass} opacity-80 group-hover:opacity-100 transition-opacity`} />

        {isEditable && (
          <Tooltip label="Drag to move" position="right" withArrow>
            <div
              {...attributes}
              {...listeners}
              className="flex items-center justify-center px-1 text-zinc-300 dark:text-zinc-700 hover:text-zinc-500 dark:hover:text-zinc-400 cursor-grab active:cursor-grabbing hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors shrink-0"
            >
              <IconGripVertical size={14} />
            </div>
          </Tooltip>
        )}

        <div 
          className="flex flex-col gap-1.5 p-3 pl-1 flex-1 min-w-0 cursor-pointer"
          onClick={() => setIsViewDialogOpen(true)}
        >
          {task.attachments && task.attachments.find(a => a.type.startsWith('image/')) && (
            <div className="w-full h-24 mb-1 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-800">
              <MantineImage 
                src={task.attachments.find(a => a.type.startsWith('image/'))?.url} 
                alt="Cover" 
                h="100%" 
                w="100%" 
                fit="cover" 
              />
            </div>
          )}
          {task.title && (
            <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm leading-snug break-words">
              {task.title}
            </p>
          )}
          {task.content && (
            <p className="whitespace-pre-wrap text-zinc-500 dark:text-zinc-400 text-xs leading-relaxed break-words font-medium opacity-80 group-hover:opacity-100 transition-opacity line-clamp-3">
              {task.content}
            </p>
          )}

          <div className="flex items-center justify-between mt-1">
            <Group gap="xs">
              {task.created_at ? (
                <span className="flex items-center gap-1.5 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold select-none">
                  <IconCalendar size={12} />
                  {formatDate(task.created_at)}
                </span>
              ) : (
                <span />
              )}
              {task.attachments && task.attachments.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 font-semibold select-none">
                  <IconPaperclip size={12} />
                  {task.attachments.length}
                </span>
              )}
            </Group>

            <div className={cn(
              "flex items-center gap-1",
              isEditable ? "lg:invisible lg:opacity-0 lg:group-hover:visible lg:group-hover:opacity-100 transition-all translate-x-0 lg:translate-x-1 lg:group-hover:translate-x-0" : "hidden"
            )}>
              {restoreTask && isEditable && (
                  <Tooltip label="Restore task" position="top" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="teal"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsRestoreDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <IconRotateClockwise size={14} />
                    </ActionIcon>
                  </Tooltip>
              )}
              {isEditable && (
                <>
                  <Tooltip label="Edit task" position="top" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="blue"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditTitle(task.title ?? "");
                        setEditContent(task.content ?? "");
                        setEditAttachments(task.attachments ?? []);
                        setNewFiles([]);
                        setIsEditing(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <IconPencil size={14} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label={isArchived ? "Delete permanently" : "Archive task"} position="top" withArrow>
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsDeleteDialogOpen(true);
                      }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  </Tooltip>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal opened={isViewDialogOpen} onClose={() => setIsViewDialogOpen(false)} title={<Group gap="xs"><IconCheck size={18} className="text-zinc-400"/><Text fw={600}>View Task</Text></Group>} centered>
        <div className="flex flex-col gap-4">
          <Text fw={700} size="lg" c="var(--mantine-color-text)" style={{ wordBreak: 'break-word' }}>{task.title}</Text>
          {task.content && (
            <Text size="sm" c="dimmed" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{task.content}</Text>
          )}
          {task.created_at && (
             <Group gap="xs" mt="sm">
               <IconCalendar size={14} className="text-zinc-400" />
               <Text size="xs" c="dimmed">Created: {formatDate(task.created_at)}</Text>
             </Group>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <div className="mt-2 border-t border-zinc-100 dark:border-zinc-800 pt-3">
              <Text fw={600} size="sm" mb="xs" c="var(--mantine-color-text)">Attachments</Text>
              <div className="flex flex-wrap gap-3">
                {task.attachments.map((att, i) => (
                  <div key={i} className="rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden relative group" style={{ maxWidth: '200px' }}>
                    {att.type.startsWith('image/') ? (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                        <MantineImage src={att.url} alt={att.name} h={120} w="auto" fit="cover" fallbackSrc="https://placehold.co/200x120?text=Image+Error" />
                      </a>
                    ) : (
                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors h-full">
                        <IconPaperclip size={20} className="text-zinc-500 shrink-0" />
                        <Text size="xs" truncate fw={500}>{att.name}</Text>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={() => setIsViewDialogOpen(false)}>Close</Button>
          {isEditable && (
            <Button color="blue" leftSection={<IconPencil size={16} />} onClick={() => {
              setIsViewDialogOpen(false);
              setEditTitle(task.title ?? "");
              setEditContent(task.content ?? "");
              setEditAttachments(task.attachments ?? []);
              setNewFiles([]);
              setIsEditing(true);
            }}>Edit Task</Button>
          )}
        </Group>
      </Modal>

      <Modal opened={isEditing} onClose={cancelEdit} title={<Group gap="xs"><IconPencil size={18} className="text-zinc-400"/><Text fw={600}>Edit Task</Text></Group>} centered>
        <div className="flex flex-col gap-3">
          <TextInput
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.currentTarget.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="Task title..."
            ref={titleInputRef}
          />
          <Textarea
            label="Description"
            value={editContent}
            onChange={(e) => setEditContent(e.currentTarget.value)}
            onKeyDown={handleEditKeyDown}
            placeholder="Add a description..."
            minRows={4}
            maxRows={8}
            autosize
          />
          <FileInput
            label="Add Attachments"
            placeholder="Select files or images"
            multiple
            value={newFiles}
            onChange={setNewFiles}
            clearable
          />
          {newFiles.length > 0 && (
            <div>
              <Text size="xs" fw={600} mb={4}>New Files to Upload</Text>
              <div className="flex flex-wrap gap-2">
                {newFiles.map((file, i) => (
                  <div key={i} className="relative group border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden" style={{ width: '80px', height: '80px' }}>
                    {file.type.startsWith('image/') ? (
                      <MantineImage src={URL.createObjectURL(file)} w="100%" h="100%" fit="cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-800 p-2">
                        <IconPaperclip size={20} className="text-zinc-400 mb-1" />
                        <Text size="xs" truncate w="100%" ta="center">{file.name}</Text>
                      </div>
                    )}
                    <ActionIcon 
                      size="sm" 
                      color="red" 
                      variant="filled" 
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setNewFiles(newFiles.filter((_, idx) => idx !== i))}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  </div>
                ))}
              </div>
            </div>
          )}
          {editAttachments.length > 0 && (
            <div>
              <Text size="xs" fw={600} mb={4}>Current Attachments</Text>
              <div className="flex flex-col gap-2">
                {editAttachments.map((att, i) => (
                  <Group key={i} justify="space-between" wrap="nowrap" className="p-2 border border-zinc-200 dark:border-zinc-700 rounded-md bg-zinc-50 dark:bg-zinc-800/50">
                    <Group gap="xs" wrap="nowrap" style={{ overflow: 'hidden' }}>
                      {att.type.startsWith('image/') ? <IconMagnet size={16} className="text-zinc-500 shrink-0"/> : <IconPaperclip size={16} className="text-zinc-500 shrink-0"/>}
                      <Text size="xs" truncate>{att.name}</Text>
                    </Group>
                    <ActionIcon size="sm" color="red" variant="subtle" onClick={() => setEditAttachments(editAttachments.filter((_, idx) => idx !== i))}>
                      <IconX size={14} />
                    </ActionIcon>
                  </Group>
                ))}
              </div>
            </div>
          )}
        </div>
        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={cancelEdit}>Cancel</Button>
          <Button color="dark" leftSection={<IconCheck size={16} />} onClick={handleEditSave} loading={isUploading}>Save Changes</Button>
        </Group>
      </Modal>

      <Modal opened={isRestoreDialogOpen} onClose={() => setIsRestoreDialogOpen(false)} title={<Group gap="xs"><IconRotateClockwise size={18} className="text-emerald-500"/><Text fw={600}>Restore Task</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Restore <Text span fw={600} c="var(--mantine-color-text)">&quot;{task.title}&quot;</Text> to its original column?
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setIsRestoreDialogOpen(false)}>Cancel</Button>
          <Button color="teal" leftSection={<IconCheck size={16} />} onClick={async () => {
            if (restoreTask) {
              await restoreTask(task.id, "");
              setIsRestoreDialogOpen(false);
            }
          }}>Restore Task</Button>
        </Group>
      </Modal>

      <Modal opened={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} title={<Group gap="xs">{isArchived ? <IconTrash size={18} className="text-red-500" /> : <IconRotateClockwise size={18} className="text-amber-500" />}<Text fw={600}>{isArchived ? "Delete Permanently" : "Archive Task"}</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          {isArchived ? (
            <>Are you sure you want to permanently delete <Text span fw={600} c="var(--mantine-color-text)">&quot;{task.title}&quot;</Text>? This action cannot be undone.</>
          ) : (
            <>Move <Text span fw={600} c="var(--mantine-color-text)">&quot;{task.title}&quot;</Text> to the archive? You can restore it anytime from the archive pool.</>
          )}
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button color={isArchived ? "red" : "orange"} leftSection={isArchived ? <IconTrash size={16} /> : <IconCheck size={16} />} onClick={() => {
            deleteTask(task.id);
            setIsDeleteDialogOpen(false);
          }}>{isArchived ? "Delete Permanently" : "Confirm Archive"}</Button>
        </Group>
      </Modal>
    </>
  );
}
