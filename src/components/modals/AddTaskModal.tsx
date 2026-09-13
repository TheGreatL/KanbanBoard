"use client";

import { useState, useRef, useEffect } from "react";
import { IconPlus, IconLayoutList, IconAlignLeft, IconLoader2, IconCheck } from "@tabler/icons-react";
import { Modal, Button, TextInput, Select, Group, Stack, Text } from '@mantine/core';
import { ColumnType } from "../Column";
import MarkdownEditor from "../ui/MarkdownEditor";
import AttachmentUploadZone from "../ui/AttachmentUploadZone";
import { uploadTaskFiles, TaskAttachment } from "@/lib/attachments";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnType[];
  selectedColumnId: string;
  onSelectedColumnIdChange: (id: string) => void;
  onAddTask: (columnId: string, title: string, content: string, attachments: TaskAttachment[]) => Promise<void>;
  initialFiles?: File[];
}

export default function AddTaskModal({
  isOpen,
  onClose,
  columns,
  selectedColumnId,
  onSelectedColumnIdChange,
  onAddTask,
  initialFiles,
}: AddTaskModalProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskContent, setNewTaskContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialFiles && initialFiles.length > 0) {
        setFiles(initialFiles);
      }
      setTimeout(() => {
        addTitleInputRef.current?.focus();
        addTitleInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialFiles]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!selectedColumnId) return;
    const trimTitle = newTaskTitle.trim();
    const trimContent = newTaskContent.trim();
    if (!trimTitle && !trimContent) return;

    setIsSubmitting(true);
    
    const uploadedAttachments = await uploadTaskFiles(files);

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

            <AttachmentUploadZone
              files={files}
              onFilesChange={setFiles}
              isModalOpen={isOpen}
            />
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
