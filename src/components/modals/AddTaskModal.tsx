"use client";

import { useState, useRef, useEffect } from "react";
import { IconPlus, IconLayoutList, IconAlignLeft, IconLoader2, IconCheck, IconPaperclip, IconPhoto, IconX } from "@tabler/icons-react";
import { Modal, Button, TextInput, Select, Group, Stack, Text, FileInput, Image as MantineImage, ActionIcon } from '@mantine/core';
import { ColumnType } from "../Column";
import MarkdownEditor from "../ui/MarkdownEditor";
import { supabase } from "@/lib/supabase";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnType[];
  selectedColumnId: string;
  onSelectedColumnIdChange: (id: string) => void;
  onAddTask: (columnId: string, title: string, content: string, attachments: any[]) => Promise<void>;
}

export default function AddTaskModal({
  isOpen,
  onClose,
  columns,
  selectedColumnId,
  onSelectedColumnIdChange,
  onAddTask,
}: AddTaskModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        addTitleInputRef.current?.focus();
        addTitleInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedColumnId) return;
    const trimTitle = newTaskTitle.trim();
    const trimContent = newTaskContent.trim();
    if (!trimTitle && !trimContent) return;

    setIsSubmitting(true);
    
    const uploadedAttachments: any[] = [];
    
    if (files.length > 0) {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('task-attachments')
          .upload(filePath, file);
          
        if (!uploadError) {
          const { data } = supabase.storage.from('task-attachments').getPublicUrl(filePath);
          uploadedAttachments.push({
            name: file.name,
            url: data.publicUrl,
            type: file.type,
            path: filePath
          });
        } else {
          console.error("Upload error:", uploadError);
        }
      }
    }

    await onAddTask(selectedColumnId, trimTitle, trimContent, uploadedAttachments);
    setNewTaskTitle("");
    setNewTaskContent("");
    setFiles([]);
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    onClose();
    setNewTaskTitle("");
    setNewTaskContent("");
    setFiles([]);
  };

  if (!isOpen && typeof window !== "undefined") return null;

  return (
    <Modal 
      opened={isOpen} 
      onClose={handleClose} 
      title={
        <Group gap="xs">
          <IconPlus size={18} />
          <Text fw={600}>Create New Task</Text>
        </Group>
      }
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <Select
            label="Select Column"
            data={columns.map((col) => ({ value: col.id, label: col.title }))}
            value={selectedColumnId}
            onChange={(val) => val && onSelectedColumnIdChange(val)}
            required
            allowDeselect={false}
          />

          <TextInput
            label={
              <Group gap={6}>
                <IconLayoutList size={14} />
                <Text size="sm" fw={500}>Task Title</Text>
              </Group>
            }
            placeholder="What needs to be done?"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.currentTarget.value)}
            ref={addTitleInputRef}
            data-autofocus
          />

            <Stack gap={4}>
              <Group gap={6} mb={4}>
                <IconAlignLeft size={14} className="text-zinc-500" />
                <Text size="sm" fw={500} c="dimmed">Description</Text>
              </Group>
              <MarkdownEditor
                value={newTaskContent}
                onChange={setNewTaskContent}
                placeholder="Add some details..."
              />
            </Stack>

            <FileInput
              label={
                <Group gap={6}>
                  <IconPaperclip size={14} className="text-zinc-500" />
                  <Text size="sm" fw={500} c="dimmed">Attachments</Text>
                </Group>
              }
              placeholder="Upload files or images"
              multiple
              value={[]}
              onChange={(payload) => {
                if (payload && payload.length > 0) {
                  setFiles(prev => {
                    const existing = new Set(prev.map(f => `${f.name}-${f.size}`));
                    const toAdd = payload.filter(f => !existing.has(`${f.name}-${f.size}`));
                    return [...prev, ...toAdd];
                  });
                }
              }}
            />
            {files.length > 0 && (
              <div>
                <Text size="xs" fw={600} mb={4}>Selected Files</Text>
                <div className="flex flex-wrap gap-2">
                  {files.map((file, i) => (
                    <div key={i} className="relative group border border-zinc-200 dark:border-zinc-700 rounded-md overflow-hidden" style={{ width: '100px', height: '100px' }}>
                      {file.type.startsWith('image/') ? (
                        <MantineImage src={URL.createObjectURL(file)} w="100%" h="100%" fit="cover" />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-800 p-2">
                          <IconPaperclip size={24} className="text-zinc-400 mb-1" />
                          <Text size="xs" truncate w="100%" ta="center">{file.name}</Text>
                        </div>
                      )}
                      <ActionIcon 
                        size="sm" 
                        color="red" 
                        variant="filled" 
                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                      >
                        <IconX size={12} />
                      </ActionIcon>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            color="dark" 
            disabled={isSubmitting || (!newTaskTitle.trim() && !newTaskContent.trim())}
            leftSection={isSubmitting ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
          >
            Create Task
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
