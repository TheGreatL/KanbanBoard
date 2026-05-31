# Minimalist Kanban Board

A highly interactive, Figma-inspired Kanban board built with Next.js 15 and Supabase. This application features a zoomable and pannable canvas, providing a fluid and modern task management experience.

## ✨ Features

-   **🎯 Interactive Canvas**: Figma-like pan and zoom interactions for a spacious workspace.
-   **📋 Multi-Project Support**: Create and manage multiple projects with dedicated boards.
-   **🌗 Modern UI**: Minimalist design with full dark mode support.
-   **🔄 Drag & Drop**: Seamless task and column reordering powered by `dnd-kit`.
-   **⚡ Real-time Updates**: Instant synchronization with Supabase backend.
-   **🎨 Dynamic Columns**: Customizable column titles and color-coded headers.
-   **📱 Responsive Controls**: Keyboard shortcuts (Space + Drag to pan) and zoom controls.
-   **📎 Task Attachments**: Easily upload and manage file attachments for each task.
-   **🔍 Task Preview**: Quick preview dialogs to view task details without losing context.
-   **📦 Archive Alerts**: Confirmation alerts when dropping tasks into the archive to prevent accidental deletions.
-   **🔗 Shareable Links**: Generate secure tokens to share project boards with anonymous users.
-   **📜 Activity Log**: Comprehensive audit trail tracking task, column, and member changes in real-time.
-   **📲 Progressive Web App (PWA)**: Installable on desktop and mobile devices for a native app experience.

## 🚀 Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Database**: [Supabase](https://supabase.com/)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Animations**: [@react-spring/web](https://react-spring.dev/)
-   **Gestures**: [@use-gesture/react](https://use-gesture.netlify.app/)
-   **Drag & Drop**: [@dnd-kit/core](https://dnd-kit.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## 🛠️ Getting Started

### Prerequisites

-   Node.js 18+
-   A Supabase project

### Installation

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/your-username/kanban-board.git
    cd kanban-board
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Create a `.env.local` file in the root directory and add your Supabase credentials:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=your-project-url
    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
    ```

4.  **Run the development server**:
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser.

### Running as a PWA (Production)

Service workers and caching are intentionally disabled in development mode. To test the Progressive Web App installation locally:
```bash
npm run build
npm run start
```
Once running, you can install the app via the "Install App" icon in your browser's address bar or via the button on the About page.

## ⌨️ Controls

-   **Pan**: `Space + Drag` or `Middle Mouse Drag` or `Trackpad Scroll`.
-   **Zoom**: `Ctrl + Scroll` or `Pinch to Zoom`.
-   **Reset View**: Click the zoom percentage in the bottom right.

## 📄 License

MIT
