import os
import re

MAPPING = {
    'AlertCircle': 'IconAlertCircle',
    'Loader2': 'IconLoader2',
    'ArrowLeft': 'IconArrowLeft',
    'KeyRound': 'IconKey',
    'ArrowRight': 'IconArrowRight',
    'AlertTriangle': 'IconAlertTriangle',
    'RotateCcw': 'IconRotateClockwise',
    'Home': 'IconHome',
    'Search': 'IconSearch',
    'LayoutDashboard': 'IconLayoutDashboard',
    'FolderKanban': 'IconFolder',
    'Menu': 'IconMenu2',
    'Camera': 'IconCamera',
    'Save': 'IconDeviceFloppy',
    'Check': 'IconCheck',
    'LogOut': 'IconLogout',
    'GithubIcon': 'IconBrandGithub',
    'Eye': 'IconEye',
    'EyeOff': 'IconEyeOff',
    'Bold': 'IconBold',
    'Italic': 'IconItalic',
    'List': 'IconList',
    'ListOrdered': 'IconListNumbers',
    'Link': 'IconLink',
    'LucideIcon': 'any',
    'X': 'IconX',
    'CheckCircle': 'IconCircleCheck',
    'Info': 'IconInfoCircle',
    'MessageSquare': 'IconMessageCircle',
    'Heart': 'IconHeart',
    'Code': 'IconCode',
    'Quote': 'IconQuote',
    'Columns': 'IconColumns',
    'Trash2': 'IconTrash',
    'Plus': 'IconPlus',
    'AlignLeft': 'IconAlignLeft',
    'Pencil': 'IconPencil',
    'Calendar': 'IconCalendar',
    'GripVertical': 'IconGripVertical',
    'Share2': 'IconShare',
    'UserPlus': 'IconUserPlus',
    'UserMinus': 'IconUserMinus',
    'ChevronDown': 'IconChevronDown',
    'LayoutList': 'IconLayoutList',
    'Heading': 'IconHeading',
    'CheckSquare': 'IconSquareCheck',
    'AtSign': 'IconAt',
    'ImageIcon': 'IconPhoto',
    'Strikethrough': 'IconStrikethrough'
}

def replace_in_file(filepath):
    if not os.path.exists(filepath):
        print(f"Not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    lucide_imports = re.findall(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"];?', content)
    if not lucide_imports:
        return

    for imports_str in lucide_imports:
        parts = [p.strip() for p in imports_str.split(',') if p.strip()]
        new_parts = []
        for p in parts:
            if ' as ' in p:
                original, alias = p.split(' as ')
                original, alias = original.strip(), alias.strip()
                if alias in MAPPING:
                    new_parts.append(f"{MAPPING[alias]}")
                elif original in MAPPING:
                    new_parts.append(f"{MAPPING[original]} as {alias}")
                    MAPPING[alias] = MAPPING[original]
                else:
                    new_parts.append(f"Icon{original} as {alias}")
                    MAPPING[alias] = f"Icon{original}"
            else:
                if p in MAPPING:
                    new_parts.append(MAPPING[p])
                else:
                    new_parts.append('Icon' + p)
                    MAPPING[p] = 'Icon' + p
        
        # Build replacement string
        old_import = f"import {{{imports_str}}} from 'lucide-react';"
        old_import2 = f'import {{{imports_str}}} from "lucide-react";'
        new_import = "import { " + ", ".join([p for p in new_parts if p != 'any']) + " } from '@tabler/icons-react';"
        
        content = content.replace(old_import, new_import)
        content = content.replace(old_import2, new_import)
        
        for p in parts:
            if ' as ' in p:
                p = p.split(' as ')[1].strip()
            
            if p == 'LucideIcon':
                content = content.replace('LucideIcon', 'any')
                continue
                
            # Replace tags <Home ...> -> <IconHome ...>
            # Use regex to replace exact tag names
            content = re.sub(r'<\s*' + p + r'([\s/>])', r'<' + MAPPING[p] + r'\1', content)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated: {filepath}")

FILES = [
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\about\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\auth\auth-code-error\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\auth\forgot-password\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\auth\update-password\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\auth\verify-reset\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\error.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\not-found.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\app\profile\page.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\components\AuthForm.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\components\ui\MarkdownEditor.tsx',
    r'c:\Users\Christian Nicolas\Desktop\KanbanBoard\src\components\ui\Toast.tsx',
]

for f in FILES:
    replace_in_file(f)
