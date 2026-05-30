"use client";

import { useState, useRef, useEffect } from "react";
import { IconPlus, IconLayoutList, IconAlignLeft, IconLoader2, IconCheck } from "@tabler/icons-react";
import { Modal, Button, TextInput, Select, Group, Stack, Text } from '@mantine/core';
import { ColumnType } from "../Column";
import MarkdownEditor from "../ui/MarkdownEditor";

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnType[];
  selectedColumnId: string;
  onSelectedColumnIdChange: (id: string) => void;
  onAddTask: (columnId: string, title: string, content: string) => Promise<void>;
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
    await onAddTask(selectedColumnId, trimTitle, trimContent);
    setNewTaskTitle("");
    setNewTaskContent("");
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    onClose();
    setNewTaskTitle("");
    setNewTaskContent("");
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
