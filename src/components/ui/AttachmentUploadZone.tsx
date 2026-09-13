'use client';

import { useState, useRef, useCallback } from 'react';
import {
  Group,
  Stack,
  Text,
  SegmentedControl,
  ActionIcon,
  Badge,
  FileButton,
  Button,
  Image as MantineImage,
} from '@mantine/core';
import {
  IconPaperclip,
  IconClipboardCheck,
  IconUpload,
  IconX,
  IconPhoto,
} from '@tabler/icons-react';
import { useImagePaste } from '@/lib/hooks/useImagePaste';
import { useToast } from './Toast';

interface AttachmentUploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  label?: string;
  isModalOpen?: boolean;
}

export default function AttachmentUploadZone({
  files,
  onFilesChange,
  label = 'Attachments',
  isModalOpen = true,
}: AttachmentUploadZoneProps) {
  const [uploadMode, setUploadMode] = useState<'paste' | 'browse'>('paste');
  const [isDragOver, setIsDragOver] = useState(false);
  const resetRef = useRef<() => void>(null);
  const { showToast } = useToast();

  const addFiles = useCallback(
    (newFiles: File[], source: 'paste' | 'browse' | 'drop' = 'browse') => {
      onFilesChange([
        ...files,
        ...newFiles.filter(
          (nf) => !files.some((f) => f.name === nf.name && f.size === nf.size)
        ),
      ]);

      if (source === 'paste') {
        showToast({
          type: 'success',
          title: 'Screenshot Pasted',
          message: `${newFiles.length > 1 ? `${newFiles.length} photos` : 'Photo'} added to attachments!`,
        });
      }
    },
    [files, onFilesChange, showToast]
  );

  // Activate image paste listener whenever modal is open
  useImagePaste({
    enabled: isModalOpen,
    onImagesPasted: (pastedFiles) => {
      addFiles(pastedFiles, 'paste');
    },
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      addFiles(droppedFiles, 'drop');
    }
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <Stack gap="xs">
      <Group justify="space-between" align="center">
        <Group gap={6}>
          <IconPaperclip size={14} className="text-zinc-500" />
          <Text size="sm" fw={500} c="dimmed">
            {label}
          </Text>
        </Group>

        {/* Toggle between Paste (Ctrl+V) and File Explorer */}
        <SegmentedControl
          size="xs"
          value={uploadMode}
          onChange={(val) => setUploadMode(val as 'paste' | 'browse')}
          data={[
            {
              label: (
                <Group gap={4} wrap="nowrap">
                  <IconClipboardCheck size={13} />
                  <span>Paste (Ctrl+V)</span>
                </Group>
              ),
              value: 'paste',
            },
            {
              label: (
                <Group gap={4} wrap="nowrap">
                  <IconUpload size={13} />
                  <span>Browse</span>
                </Group>
              ),
              value: 'browse',
            },
          ]}
        />
      </Group>

      {/* Upload/Paste Interactive Target Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col items-center justify-center gap-2 text-center cursor-pointer select-none ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 scale-[1.01]'
            : uploadMode === 'paste'
            ? 'border-blue-300 dark:border-blue-800/80 bg-blue-50/30 dark:bg-blue-950/20 hover:border-blue-400'
            : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/30 hover:border-zinc-400'
        }`}
      >
        {uploadMode === 'paste' ? (
          <>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500"></span>
              </span>
              <Badge size="sm" variant="light" color="blue" radius="sm">
                Paste Mode Active
              </Badge>
            </div>

            <Text size="sm" fw={600} c="var(--mantine-color-text)">
              Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-zinc-800 bg-zinc-100 border border-zinc-300 rounded-md dark:bg-zinc-800 dark:text-zinc-100 dark:border-zinc-600 shadow-sm">Ctrl + V</kbd> to paste screenshot
            </Text>

            <Text size="xs" c="dimmed" maw={320}>
              Take a snippet using Snipping Tool, then paste it here or anywhere in this window.
            </Text>

            <FileButton
              resetRef={resetRef}
              onChange={(payload) => payload && addFiles(payload, 'browse')}
              multiple
            >
              {(props) => (
                <Button {...props} variant="subtle" size="compact-xs" color="gray" mt={2}>
                  Or click here to browse files
                </Button>
              )}
            </FileButton>
          </>
        ) : (
          <FileButton
            resetRef={resetRef}
            onChange={(payload) => payload && addFiles(payload, 'browse')}
            multiple
          >
            {(props) => (
              <div {...props} className="w-full flex flex-col items-center cursor-pointer">
                <div className="p-2 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 mb-1">
                  <IconUpload size={20} />
                </div>
                <Text size="sm" fw={600} c="var(--mantine-color-text)">
                  Click to choose files
                </Text>
                <Text size="xs" c="dimmed">
                  or drag and drop files directly here
                </Text>
              </div>
            )}
          </FileButton>
        )}
      </div>

      {/* Thumbnail Previews of Staged Files */}
      {files.length > 0 && (
        <div className="mt-1">
          <Group justify="space-between" mb={4}>
            <Text size="xs" fw={600}>
              Selected Files ({files.length})
            </Text>
            <Button
              variant="subtle"
              color="red"
              size="compact-xs"
              onClick={() => onFilesChange([])}
            >
              Clear all
            </Button>
          </Group>

          <div className="flex flex-wrap gap-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${file.size}-${i}`}
                className="relative group border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-900 shadow-sm transition-all"
                style={{ width: '90px', height: '90px' }}
              >
                {file.type.startsWith('image/') ? (
                  <MantineImage
                    src={URL.createObjectURL(file)}
                    w="100%"
                    h="100%"
                    fit="cover"
                    alt={file.name}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full bg-zinc-50 dark:bg-zinc-800/80 p-2">
                    <IconPaperclip size={22} className="text-zinc-400 mb-1" />
                    <Text size="10px" truncate w="100%" ta="center">
                      {file.name}
                    </Text>
                  </div>
                )}

                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="filled"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    title="Remove file"
                  >
                    <IconX size={12} />
                  </ActionIcon>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Stack>
  );
}

