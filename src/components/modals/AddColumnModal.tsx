"use client";

import { useState, useRef, useEffect } from "react";
import { IconColumns, IconCheck, IconLoader2 } from "@tabler/icons-react";
import { Modal, Button, TextInput, Group, ColorSwatch, Tooltip, Stack, Text } from '@mantine/core';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddColumn: (title: string, color: string, description?: string) => Promise<void>;
  availableColors: string[];
  dotColorMap: Record<string, string>;
}

export default function AddColumnModal({
  isOpen,
  onClose,
  onAddColumn,
  availableColors,
  dotColorMap,
}: AddColumnModalProps) {
  const [newColumnTitle, setNewColumnTitle] = useState("");
  const [newColumnDescription, setNewColumnDescription] = useState("");
  const [newColumnColor, setNewColumnColor] = useState("zinc");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const columnTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        columnTitleInputRef.current?.focus();
        columnTitleInputRef.current?.select();
      }, 50);
    }
  }, [isOpen]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimTitle = newColumnTitle.trim();
    if (!trimTitle) return;

    setIsSubmitting(true);
    await onAddColumn(trimTitle, newColumnColor, newColumnDescription.trim() || undefined);
    setNewColumnTitle("");
    setNewColumnDescription("");
    setNewColumnColor("zinc");
    setIsSubmitting(false);
    onClose();
  };

  const handleClose = () => {
    onClose();
    setNewColumnTitle("");
    setNewColumnDescription("");
    setNewColumnColor("zinc");
  };

  if (!isOpen && typeof window !== "undefined") return null;

  return (
    <Modal 
      opened={isOpen} 
      onClose={handleClose} 
      title={
        <Group gap="xs">
          <IconColumns size={18} className="text-zinc-500" />
          <Text fw={600}>Add New Column</Text>
        </Group>
      }
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Column Name"
            placeholder="e.g. In Progress, Done..."
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.currentTarget.value)}
            ref={columnTitleInputRef}
            required
            data-autofocus
          />

          <TextInput
            label="Description (Optional)"
            placeholder="e.g. Tasks currently being worked on."
            value={newColumnDescription}
            onChange={(e) => setNewColumnDescription(e.currentTarget.value)}
          />

          <Stack gap={4}>
            <Text size="sm" fw={500}>Theme Color</Text>
            <Group gap="sm">
              {availableColors.map((color) => (
                <Tooltip key={color} label={color} position="top" withArrow>
                  <button
                    type="button"
                    onClick={() => setNewColumnColor(color)}
                    className={`w-6 h-6 flex items-center justify-center rounded-full ${dotColorMap[color]} hover:scale-110 transition-transform ${newColumnColor === color ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-600 dark:ring-offset-zinc-950 shadow-sm scale-110' : ''}`}
                  >
                    {newColumnColor === color && <IconCheck size={14} className="text-white drop-shadow-sm" />}
                  </button>
                </Tooltip>
              ))}
            </Group>
          </Stack>
        </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            color="dark" 
            disabled={isSubmitting || !newColumnTitle.trim()}
            leftSection={isSubmitting ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
          >
            Create Column
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
