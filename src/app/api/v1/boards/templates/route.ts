import { json } from "@/lib/api";

const TEMPLATES = [
  { id: "sprint", name: "Sprint Board", category: "Engineering", description: "Two-week sprint planning", columns: ["Backlog", "In Progress", "Review", "Done"] },
  { id: "kanban", name: "Kanban", category: "General", description: "Simple kanban workflow", columns: ["To Do", "Doing", "Done"] },
  { id: "bug-tracker", name: "Bug Tracker", category: "Engineering", description: "Bug lifecycle tracking", columns: ["Reported", "Triaging", "Fixing", "Testing", "Closed"] },
  { id: "content-calendar", name: "Content Calendar", category: "Marketing", description: "Content production pipeline", columns: ["Ideas", "Writing", "Editing", "Scheduled", "Published"] },
  { id: "launch-checklist", name: "Launch Checklist", category: "General", description: "Product launch planning", columns: ["Planning", "Building", "Testing", "Launch", "Post-Launch"] },
];

export async function GET() {
  return json(TEMPLATES);
}
