import re

with open('src/components/Column.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace('import { Plus, Trash2, X, GripVertical, LayoutList, AlignLeft, Check, Archive, ChevronRight } from "lucide-react";', 
                          'import { IconPlus, IconTrash, IconX, IconGripVertical, IconLayoutList, IconAlignLeft, IconCheck, IconArchive, IconChevronRight } from "@tabler/icons-react";')

content = content.replace('import { Tooltip } from "./ui/Tooltip";',
                          "import { Tooltip, Modal, Button, Text, Group, ActionIcon, TextInput, Textarea, Stack, ColorSwatch } from '@mantine/core';")
content = content.replace('import { createPortal } from "react-dom";\n', '')

# 2. Icons
content = content.replace('<GripVertical', '<IconGripVertical')
content = content.replace('<Trash2', '<IconTrash')
content = content.replace('<LayoutList', '<IconLayoutList')
content = content.replace('<Plus', '<IconPlus')
content = content.replace('<Check', '<IconCheck')
content = content.replace('<X', '<IconX')

# 3. Tooltip prop (label instead of content)
content = content.replace('content="Drag to reorder column"', 'label="Drag to reorder column"')
content = content.replace('content={isEditable ? "Change column color" : "Column color"}', 'label={isEditable ? "Change column color" : "Column color"}')
content = content.replace('content={color}', 'label={color}')
content = content.replace('content={column.is_archive_pool || !isEditable ? "" : "Click to edit name & description"}', 'label={column.is_archive_pool || !isEditable ? "" : "Click to edit name & description"}')
content = content.replace('content="Archive column"', 'label="Archive column"')

# 4. Remove createPortal for Delete Modal
old_delete_modal = """      {/* Archive Column Modal — portalled to document.body */}
      {isDeleteDialogOpen && typeof window !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div
            className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl w-full max-w-sm flex flex-col max-h-[calc(100dvh-2rem)] overflow-y-auto gap-4 p-6 cursor-auto"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Escape") setIsDeleteDialogOpen(false);
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconTrash className="w-4 h-4 text-amber-400" />
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">Archive Column</h2>
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer"
              >
                <IconX className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to archive <span className="font-medium text-zinc-900 dark:text-zinc-100">&ldquo;{column.title}&rdquo;</span>? You can restore it later if needed.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setIsDeleteDialogOpen(false)}
                className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors font-medium cursor-pointer rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  archiveColumn(column.id);
                  setIsDeleteDialogOpen(false);
                }}
                className="px-4 py-2 text-xs bg-amber-500 hover:bg-amber-600 text-amber-950 transition-colors font-semibold cursor-pointer rounded-lg flex items-center gap-1.5 shadow-sm"
              >
                <IconCheck className="w-3.5 h-3.5" />
                Confirm Archive
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}"""

new_delete_modal = """      <Modal opened={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} title={<Group gap="xs"><IconTrash size={18} className="text-amber-500"/><Text fw={600}>Archive Column</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Are you sure you want to archive <Text span fw={600} c="var(--mantine-color-text)">&ldquo;{column.title}&rdquo;</Text>? You can restore it later if needed.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="orange" leftSection={<IconCheck size={16} />} onClick={() => { archiveColumn(column.id); setIsDeleteDialogOpen(false); }}>Confirm Archive</Button>
        </Group>
      </Modal>"""

content = content.replace(old_delete_modal, new_delete_modal)

with open('src/components/Column.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed imports and delete modal")
