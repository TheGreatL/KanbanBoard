export type ProjectTemplate = "empty" | "typical" | "basic" | "software" | "product" | "marketing" | "support";

export interface TemplateColumn {
  title: string;
  color: string;
  description: string;
}

export interface TemplateDefinition {
  id: ProjectTemplate;
  name: string;
  description: string;
  bestFor: string;
  columns: TemplateColumn[];
}

export const PROJECT_TEMPLATES: TemplateDefinition[] = [
  {
    id: "empty",
    name: "Empty Board",
    description: "Start from scratch with no columns.",
    bestFor: "Custom workflows and freeform project tracking.",
    columns: [],
  },
  {
    id: "typical",
    name: "Typical Kanban",
    description: "To Do → In Progress → Done",
    bestFor: "Standard tasks and simple tracking needs.",
    columns: [
      { title: "To Do", color: "blue", description: "Tasks that need to be done." },
      { title: "In Progress", color: "amber", description: "Tasks currently being worked on." },
      { title: "Done", color: "emerald", description: "Completed tasks." },
    ],
  },
  {
    id: "basic",
    name: "Basic Kanban",
    description: "Backlog → To Do → In Progress → Blocked → Done",
    bestFor: "Small teams, personal productivity.",
    columns: [
      { title: "Backlog", color: "zinc", description: "Ideas and tasks for the future." },
      { title: "To Do", color: "blue", description: "Tasks prioritized for the current cycle." },
      { title: "In Progress", color: "amber", description: "Tasks currently being worked on." },
      { title: "Blocked", color: "rose", description: "Tasks that are stuck and need attention." },
      { title: "Done", color: "emerald", description: "Completed tasks." },
    ],
  },
  {
    id: "software",
    name: "Software Development",
    description: "Backlog → Ready → In Progress → Code Review → Testing → Done",
    bestFor: "Dev teams using code reviews and testing.",
    columns: [
      { title: "Backlog", color: "zinc", description: "Feature requests, bugs, and technical debt." },
      { title: "Ready", color: "blue", description: "Tasks refined and ready to pick up." },
      { title: "In Progress", color: "amber", description: "Currently being developed." },
      { title: "Code Review", color: "violet", description: "Awaiting peer review." },
      { title: "Testing", color: "orange", description: "In QA or user acceptance testing." },
      { title: "Done", color: "emerald", description: "Deployed and fully complete." },
    ],
  },
  {
    id: "product",
    name: "Product Development",
    description: "Ideas → Backlog → Design → Development → Review → Launch → Done",
    bestFor: "Product teams working with design and engineering.",
    columns: [
      { title: "Ideas", color: "fuchsia", description: "Raw concepts and feature requests." },
      { title: "Backlog", color: "zinc", description: "Prioritized ideas waiting to be designed." },
      { title: "Design", color: "cyan", description: "UX/UI design and wireframing." },
      { title: "Development", color: "amber", description: "Engineering and implementation." },
      { title: "Review", color: "violet", description: "Stakeholder or product management review." },
      { title: "Launch", color: "teal", description: "Preparing for release." },
      { title: "Done", color: "emerald", description: "Live and available to users." },
    ],
  },
  {
    id: "marketing",
    name: "Marketing",
    description: "Ideas → Planned → Writing → Editing → Scheduled → Published",
    bestFor: "Content creation and campaigns.",
    columns: [
      { title: "Ideas", color: "fuchsia", description: "Campaign and content brainstorming." },
      { title: "Planned", color: "blue", description: "Approved topics lined up for execution." },
      { title: "Writing", color: "amber", description: "Drafting content." },
      { title: "Editing", color: "orange", description: "Review and refinement phase." },
      { title: "Scheduled", color: "violet", description: "Ready and scheduled for release." },
      { title: "Published", color: "emerald", description: "Live to the audience." },
    ],
  },
  {
    id: "support",
    name: "Support / Operations",
    description: "New Tickets → Triaged → In Progress → Waiting → Resolved → Closed",
    bestFor: "Customer support or operational workflows.",
    columns: [
      { title: "New Tickets", color: "rose", description: "Incoming requests needing review." },
      { title: "Triaged", color: "orange", description: "Categorized and prioritized issues." },
      { title: "In Progress", color: "amber", description: "Actively being investigated." },
      { title: "Waiting", color: "blue", description: "Awaiting customer response." },
      { title: "Resolved", color: "teal", description: "Issue fixed, pending confirmation." },
      { title: "Closed", color: "zinc", description: "Archived and complete." },
    ],
  }
];
