"use client";

import { useState, useRef, useEffect } from "react";
import { IconFolder, IconCheck, IconLoader2, IconPencil, IconPlus } from "@tabler/icons-react";
import { Modal, Button, TextInput, Group, Stack, Text, UnstyledButton } from '@mantine/core';

import { ProjectTemplate, PROJECT_TEMPLATES } from "@/lib/templates";

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (title: string, template: ProjectTemplate) => Promise<void>;
  initialTitle?: string;
  mode: "create" | "edit";
}

export default function ProjectModal({
  isOpen,
  onClose,
  onSubmit,
  initialTitle = "",
  mode,
}: ProjectModalProps) {
  const [title, setTitle] = useState(initialTitle);
  const [template, setTemplate] = useState<ProjectTemplate>("empty");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialTitle]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimTitle = title.trim();
    if (!trimTitle) return;
    setIsSubmitting(true);
    try {
      await onSubmit(trimTitle, template);
      onClose();
    } catch {
      // errors handled by parent via toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && typeof window !== "undefined") return null;

  const isEdit = mode === "edit";

  return (
    <Modal 
      opened={isOpen} 
      onClose={onClose} 
      title={
        <Group gap="xs">
          {isEdit ? <IconPencil size={18} className="text-blue-500" /> : <IconPlus size={18} className="text-zinc-500" />}
          <Text fw={600}>{isEdit ? "Rename Project" : "Create New Project"}</Text>
        </Group>
      }
      centered
    >
      <form onSubmit={handleSubmit}>
        <Stack gap="md">
          <TextInput
            label="Project Name"
            placeholder="e.g. Design System, App Launch..."
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            ref={inputRef}
            leftSection={<IconFolder size={16} className="text-zinc-400" />}
            required
            data-autofocus
          />

          {!isEdit && (
            <Stack gap={4}>
              <Text size="sm" fw={500}>Project Template</Text>
              <Stack gap="sm">
                {PROJECT_TEMPLATES.map((tmpl) => (
                  <UnstyledButton
                    key={tmpl.id}
                    onClick={() => setTemplate(tmpl.id)}
                    className={`flex flex-col items-start text-left p-3 rounded-xl border transition-all ${
                      template === tmpl.id
                        ? "border-zinc-900 bg-zinc-50 text-zinc-900 dark:border-zinc-100 dark:bg-zinc-900 dark:text-white ring-1 ring-zinc-900 dark:ring-zinc-100"
                        : "border-zinc-200 hover:border-zinc-300 text-zinc-600 dark:border-zinc-800 dark:hover:border-zinc-700 dark:text-zinc-400"
                    }`}
                  >
                    <Text fw={600} size="sm" mb={4}>{tmpl.name}</Text>
                    <Text size="xs" fw={500} c="dimmed" mb={4}>{tmpl.description}</Text>
                    <Text fz={10} c="dimmed" lh={1}>{tmpl.bestFor}</Text>
                  </UnstyledButton>
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>

        <Group justify="flex-end" mt="xl">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            color="dark" 
            disabled={isSubmitting || !title.trim() || (isEdit && title.trim() === initialTitle)}
            leftSection={isSubmitting ? <IconLoader2 size={16} className="animate-spin" /> : <IconCheck size={16} />}
          >
            {isEdit ? "Save Changes" : "Create Project"}
          </Button>
        </Group>
      </form>
    </Modal>
  );
}
