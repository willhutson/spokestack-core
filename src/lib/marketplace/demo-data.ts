export interface DemoRecord {
  id: string;
  [key: string]: unknown;
}

export interface ModuleDemo {
  moduleId: string;
  label: string;
  description: string;
  sampleRecords: DemoRecord[];
  columns: {
    key: string;
    label: string;
    format?: "currency" | "date" | "status" | "text";
  }[];
  actions: { label: string; description: string }[];
}

export const MODULE_DEMOS: Record<string, ModuleDemo> = {
  CRM: {
    moduleId: "CRM",
    label: "CRM",
    description:
      "Track leads, contacts, and deals through your sales pipeline.",
    sampleRecords: [
      { id: "d1", name: "Acme Corp", stage: "Proposal Sent", value: 45000, owner: "Sarah K.", lastContact: "2026-03-28" },
      { id: "d2", name: "Gulf Media Group", stage: "Qualified", value: 120000, owner: "Will H.", lastContact: "2026-03-30" },
      { id: "d3", name: "Noon Express", stage: "Negotiation", value: 78000, owner: "Sarah K.", lastContact: "2026-03-25" },
      { id: "d4", name: "Careem Business", stage: "Won", value: 200000, owner: "Ahmed R.", lastContact: "2026-03-31" },
    ],
    columns: [
      { key: "name", label: "Company" },
      { key: "stage", label: "Stage", format: "status" },
      { key: "value", label: "Deal Value", format: "currency" },
      { key: "owner", label: "Owner" },
      { key: "lastContact", label: "Last Contact", format: "date" },
    ],
    actions: [
      { label: "Log a call", description: "Record a client interaction" },
      { label: "Move to next stage", description: "Advance the deal pipeline" },
      { label: "Schedule follow-up", description: "Set a reminder to reconnect" },
    ],
  },
  CONTENT_STUDIO: {
    moduleId: "CONTENT_STUDIO",
    label: "Content Studio",
    description: "Plan, create, and manage content across all channels.",
    sampleRecords: [
      { id: "d1", title: "Q2 Campaign Brief", type: "Brief", status: "In Review", author: "Lina M.", dueDate: "2026-04-10" },
      { id: "d2", title: "Instagram Carousel \u2014 Ramadan", type: "Social Post", status: "Approved", author: "Omar T.", dueDate: "2026-04-01" },
      { id: "d3", title: "Website Refresh Copy", type: "Web Copy", status: "Draft", author: "Will H.", dueDate: "2026-04-15" },
      { id: "d4", title: "Client Testimonial Video", type: "Video", status: "In Production", author: "Lina M.", dueDate: "2026-04-20" },
    ],
    columns: [
      { key: "title", label: "Title" },
      { key: "type", label: "Type" },
      { key: "status", label: "Status", format: "status" },
      { key: "author", label: "Author" },
      { key: "dueDate", label: "Due", format: "date" },
    ],
    actions: [
      { label: "Create brief", description: "Start a new content brief" },
      { label: "Request review", description: "Send content for approval" },
      { label: "Publish", description: "Push content live" },
    ],
  },
  FINANCE: {
    moduleId: "FINANCE",
    label: "Finance",
    description: "Invoices, expenses, and financial reporting.",
    sampleRecords: [
      { id: "d1", invoiceNo: "INV-2026-041", client: "Acme Corp", amount: 15000, status: "Paid", date: "2026-03-15" },
      { id: "d2", invoiceNo: "INV-2026-042", client: "Gulf Media Group", amount: 45000, status: "Pending", date: "2026-03-22" },
      { id: "d3", invoiceNo: "INV-2026-043", client: "Noon Express", amount: 8500, status: "Overdue", date: "2026-02-28" },
      { id: "d4", invoiceNo: "INV-2026-044", client: "Careem Business", amount: 62000, status: "Draft", date: "2026-03-31" },
    ],
    columns: [
      { key: "invoiceNo", label: "Invoice #" },
      { key: "client", label: "Client" },
      { key: "amount", label: "Amount", format: "currency" },
      { key: "status", label: "Status", format: "status" },
      { key: "date", label: "Date", format: "date" },
    ],
    actions: [
      { label: "Create invoice", description: "Generate a new invoice" },
      { label: "Record payment", description: "Mark an invoice as paid" },
      { label: "Export report", description: "Download financial summary" },
    ],
  },
  TIME_LEAVE: {
    moduleId: "TIME_LEAVE",
    label: "Time & Leave",
    description: "Track hours, manage time-off requests, and monitor capacity.",
    sampleRecords: [
      { id: "d1", employee: "Sarah K.", type: "Time Log", hours: 7.5, project: "Gulf Media Rebrand", date: "2026-03-31" },
      { id: "d2", employee: "Omar T.", type: "Leave Request", hours: 8, project: "\u2014", date: "2026-04-05", status: "Pending" },
      { id: "d3", employee: "Lina M.", type: "Time Log", hours: 6, project: "Noon Campaign", date: "2026-03-31" },
      { id: "d4", employee: "Ahmed R.", type: "Leave Request", hours: 16, project: "\u2014", date: "2026-04-10", status: "Approved" },
    ],
    columns: [
      { key: "employee", label: "Employee" },
      { key: "type", label: "Type" },
      { key: "hours", label: "Hours" },
      { key: "project", label: "Project" },
      { key: "date", label: "Date", format: "date" },
    ],
    actions: [
      { label: "Log hours", description: "Record time against a project" },
      { label: "Request leave", description: "Submit a time-off request" },
      { label: "View capacity", description: "See team availability" },
    ],
  },
  SOCIAL_PUBLISHING: {
    moduleId: "SOCIAL_PUBLISHING",
    label: "Social Publishing",
    description: "Schedule, publish, and track social media posts.",
    sampleRecords: [
      { id: "d1", caption: "Ramadan Kareem from the LMTD team", platform: "Instagram", scheduledFor: "2026-04-01T09:00", status: "Published" },
      { id: "d2", caption: "Behind the scenes of our latest shoot", platform: "TikTok", scheduledFor: "2026-04-02T14:00", status: "Scheduled" },
      { id: "d3", caption: "New case study: Gulf Media rebrand", platform: "LinkedIn", scheduledFor: "2026-04-03T10:00", status: "Draft" },
      { id: "d4", caption: "We're hiring! Senior designer role open", platform: "Twitter/X", scheduledFor: "2026-04-04T11:00", status: "Scheduled" },
    ],
    columns: [
      { key: "caption", label: "Caption" },
      { key: "platform", label: "Platform" },
      { key: "scheduledFor", label: "Scheduled", format: "date" },
      { key: "status", label: "Status", format: "status" },
    ],
    actions: [
      { label: "Create post", description: "Draft a new social post" },
      { label: "Schedule batch", description: "Queue multiple posts" },
      { label: "View analytics", description: "Check engagement metrics" },
    ],
  },
  ANALYTICS: {
    moduleId: "ANALYTICS",
    label: "Analytics",
    description: "Business intelligence dashboards and performance metrics.",
    sampleRecords: [
      { id: "d1", metric: "Revenue (MTD)", value: 285000, change: "+12%", period: "March 2026", status: "Up" },
      { id: "d2", metric: "Active Projects", value: 8, change: "+2", period: "March 2026", status: "Up" },
      { id: "d3", metric: "Brief Approval Time", value: 2.3, change: "-15%", period: "March 2026", status: "Improved" },
      { id: "d4", metric: "Team Utilization", value: 78, change: "-3%", period: "March 2026", status: "Down" },
    ],
    columns: [
      { key: "metric", label: "Metric" },
      { key: "value", label: "Value" },
      { key: "change", label: "Change" },
      { key: "period", label: "Period" },
      { key: "status", label: "Trend", format: "status" },
    ],
    actions: [
      { label: "Create dashboard", description: "Build a custom metrics view" },
      { label: "Schedule report", description: "Auto-send weekly summaries" },
      { label: "Set alert", description: "Get notified on metric changes" },
    ],
  },
  WORKFLOWS: {
    moduleId: "WORKFLOWS",
    label: "Workflows",
    description: "Multi-step automation with triggers and conditions.",
    sampleRecords: [
      { id: "d1", name: "New Brief Intake", trigger: "Brief created", steps: 5, status: "Active", runs: 34 },
      { id: "d2", name: "Invoice Reminder", trigger: "Invoice overdue", steps: 3, status: "Active", runs: 12 },
      { id: "d3", name: "Onboarding Checklist", trigger: "Team member added", steps: 8, status: "Draft", runs: 0 },
      { id: "d4", name: "Project QA Gate", trigger: "Phase completed", steps: 4, status: "Active", runs: 21 },
    ],
    columns: [
      { key: "name", label: "Workflow" },
      { key: "trigger", label: "Trigger" },
      { key: "steps", label: "Steps" },
      { key: "status", label: "Status", format: "status" },
      { key: "runs", label: "Runs" },
    ],
    actions: [
      { label: "Create workflow", description: "Build a new automation" },
      { label: "Import template", description: "Start from a pre-built template" },
      { label: "View run history", description: "See past executions" },
    ],
  },
};
