import { json } from "@/lib/api";

const TEMPLATES = [
  { id: "nps-standard", name: "NPS Survey", category: "NPS", questionCount: 3, description: "Standard Net Promoter Score survey" },
  { id: "csat-basic", name: "Customer Satisfaction", category: "CSAT", questionCount: 5, description: "Basic CSAT survey with follow-up" },
  { id: "onboarding-feedback", name: "Onboarding Feedback", category: "Onboarding", questionCount: 8, description: "New client onboarding experience" },
  { id: "event-feedback", name: "Event Feedback", category: "Event", questionCount: 6, description: "Post-event satisfaction survey" },
  { id: "employee-engagement", name: "Employee Engagement", category: "Feedback", questionCount: 10, description: "Quarterly team engagement check" },
];

export async function GET() {
  return json(TEMPLATES);
}
