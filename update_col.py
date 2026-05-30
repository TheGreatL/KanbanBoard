import re

with open('src/components/Column.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace(
    "import { Tooltip, Modal, Button, Text, Group, ActionIcon } from '@mantine/core';",
    "import { Tooltip, Modal, Button, Text, Group, ActionIcon, TextInput, Textarea, Stack, ColorSwatch } from '@mantine/core';"
)

# 2. State
content = content.replace(
    "const [editDescription, setEditDescription] = useState(column.description || \"\");",
    "const [editDescription, setEditDescription] = useState(column.description || \"\");\n  const [editColor, setEditColor] = useState(column.color);"
)

# 3. handleTitleSubmit
old_submit = """  const handleTitleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditTitle(column.title);
      setEditDescription(column.description || "");
      setIsEditingTitle(false);
      return;
    }
    
    // Only update if something actually changed to avoid unnecessary DB calls
    const titleChanged = trimmedTitle !== column.title;
    const descChanged = editDescription !== (column.description || "");
    
    if ((titleChanged || descChanged) && updateColumnDetails) {
      await updateColumnDetails(column.id, trimmedTitle, editDescription || null);
    } else if (titleChanged && updateColumnTitle) {
       await updateColumnTitle(column.id, trimmedTitle);
    }

    setIsEditingTitle(false);
  };"""

new_submit = """  const handleTitleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedTitle = editTitle.trim();
    if (!trimmedTitle) {
      setEditTitle(column.title);
      setEditDescription(column.description || "");
      setEditColor(column.color);
      setIsEditingTitle(false);
      return;
    }
    
    // Only update if something actually changed to avoid unnecessary DB calls
    const titleChanged = trimmedTitle !== column.title;
    const descChanged = editDescription !== (column.description || "");
    const colorChanged = editColor !== column.color;
    
    if (colorChanged && updateColumnColor) {
      await updateColumnColor(column.id, editColor);
    }
    
    if ((titleChanged || descChanged) && updateColumnDetails) {
      await updateColumnDetails(column.id, trimmedTitle, editDescription || null);
    } else if (titleChanged && updateColumnTitle) {
       await updateColumnTitle(column.id, trimmedTitle);
    }

    setIsEditingTitle(false);
  };"""
content = content.replace(old_submit, new_submit)

# 4. Inline form
old_render = """          {/* Title and Description */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {isEditingTitle && !column.is_archive_pool && isEditable ? (
              <form onSubmit={handleTitleSubmit} className="flex-1 min-w-0 flex flex-col gap-1">
                <input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="Column Title"
                  className="w-full text-sm font-semibold text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all placeholder:font-normal"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      setEditTitle(column.title);
                      setEditDescription(column.description || "");
                      setIsEditingTitle(false);
                    }
                  }}
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={() => handleTitleSubmit()}
                  placeholder="Add a description (optional)..."
                  rows={2}
                  className="w-full text-xs text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-600 transition-all resize-none"
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Escape") {
                      setEditTitle(column.title);
                      setEditDescription(column.description || "");
                      setIsEditingTitle(false);
                    }
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleTitleSubmit();
                    }
                  }}
                />
              </form>
            ) : (
              <Tooltip label={column.is_archive_pool || !isEditable ? "" : "Click to edit name & description"} disabled={column.is_archive_pool || !isEditable} position="top" withArrow>
                <div
                  className={cn(
                    "flex flex-col truncate rounded px-1.5 py-0.5 -ml-1.5 transition-colors",
                    !column.is_archive_pool && isEditable && "cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                  )}
                  onClick={(e) => {
                    if (column.is_archive_pool || !isEditable) return;
                    e.stopPropagation();
                    setIsEditingTitle(true);
                    setEditTitle(column.title);
                    setEditDescription(column.description || "");
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                    {column.title}
                  </h3>
                  {column.description && !isEditingTitle && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {column.description}
                    </p>
                  )}
                </div>
              </Tooltip>
            )}
          </div>"""

new_render = """          {/* Title and Description */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <Tooltip label={column.is_archive_pool || !isEditable ? "" : "Click to edit name & description"} disabled={column.is_archive_pool || !isEditable} position="top" withArrow>
              <div
                className={cn(
                  "flex flex-col truncate rounded px-1.5 py-0.5 -ml-1.5 transition-colors",
                  !column.is_archive_pool && isEditable && "cursor-pointer hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
                )}
                onClick={(e) => {
                  if (column.is_archive_pool || !isEditable) return;
                  e.stopPropagation();
                  setIsEditingTitle(true);
                  setEditTitle(column.title);
                  setEditDescription(column.description || "");
                  setEditColor(column.color);
                }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm truncate">
                  {column.title}
                </h3>
                {column.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                      {column.description}
                  </p>
                )}
              </div>
            </Tooltip>
          </div>"""
content = content.replace(old_render, new_render)

# 5. Add Modal at the end
old_modal = """      <Modal opened={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} title={<Group gap="xs"><IconTrash size={18} className="text-amber-500"/><Text fw={600}>Archive Column</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Are you sure you want to archive <Text span fw={600} c="var(--mantine-color-text)">&ldquo;{column.title}&rdquo;</Text>? You can restore it later if needed.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="orange" leftSection={<IconCheck size={16} />} onClick={() => { archiveColumn(column.id); setIsDeleteDialogOpen(false); }}>Confirm Archive</Button>
        </Group>
      </Modal>"""

new_modal = """      <Modal opened={isDeleteDialogOpen} onClose={() => setIsDeleteDialogOpen(false)} title={<Group gap="xs"><IconTrash size={18} className="text-amber-500"/><Text fw={600}>Archive Column</Text></Group>} centered>
        <Text size="sm" c="dimmed" mb="lg">
          Are you sure you want to archive <Text span fw={600} c="var(--mantine-color-text)">&ldquo;{column.title}&rdquo;</Text>? You can restore it later if needed.
        </Text>
        <Group justify="flex-end">
          <Button variant="subtle" color="gray" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button color="orange" leftSection={<IconCheck size={16} />} onClick={() => { archiveColumn(column.id); setIsDeleteDialogOpen(false); }}>Confirm Archive</Button>
        </Group>
      </Modal>

      <Modal opened={isEditingTitle} onClose={() => setIsEditingTitle(false)} title={<Text fw={600}>Edit Column</Text>} centered>
        <form onSubmit={handleTitleSubmit}>
          <Stack gap="md">
            <TextInput
              label="Title"
              placeholder="Column title"
              value={editTitle}
              onChange={(e) => setEditTitle(e.currentTarget.value)}
              required
              data-autofocus
            />
            <Textarea
              label="Description"
              placeholder="Add a description (optional)..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.currentTarget.value)}
              minRows={2}
              autosize
            />
            <Stack gap={4}>
              <Text size="sm" fw={500}>Theme Color</Text>
              <Group gap="sm">
                {AVAILABLE_COLORS.map((color) => (
                  <Tooltip key={color} label={color} position="top" withArrow>
                    <ColorSwatch
                      component="button"
                      type="button"
                      color={`var(--mantine-color-${color}-5)`}
                      onClick={() => setEditColor(color)}
                      style={{ color: '#fff', cursor: 'pointer' }}
                      radius="xl"
                      className={editColor === color ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-zinc-600 dark:ring-offset-zinc-950 shadow-sm scale-110' : 'hover:scale-110 transition-transform'}
                    >
                      {editColor === color && <IconCheck size={12} />}
                    </ColorSwatch>
                  </Tooltip>
                ))}
              </Group>
            </Stack>
            <Group justify="flex-end" mt="md">
              <Button variant="subtle" color="gray" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
              <Button type="submit" color="blue" leftSection={<IconCheck size={16} />}>Save Changes</Button>
            </Group>
          </Stack>
        </form>
      </Modal>"""
content = content.replace(old_modal, new_modal)

with open('src/components/Column.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
