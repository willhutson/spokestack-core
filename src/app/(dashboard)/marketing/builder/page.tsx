"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { MarketingNav } from "../MarketingNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

type TemplateType = "social" | "email" | "ad" | "landing";

interface Draft {
  id: string;
  key: string;
  value: {
    templateType: TemplateType;
    status: string;
    content: Record<string, unknown>;
    createdAt: string;
  };
}

const TEMPLATES: { type: TemplateType; label: string; description: string }[] = [
  { type: "social", label: "Social Post", description: "Create posts for social media platforms" },
  { type: "email", label: "Email Newsletter", description: "Design email campaigns and newsletters" },
  { type: "ad", label: "Ad Creative", description: "Build ad copy for paid campaigns" },
  { type: "landing", label: "Landing Page Copy", description: "Write landing page content" },
];

const CHAR_LIMITS: Record<string, number> = {
  Instagram: 2200,
  Twitter: 280,
  LinkedIn: 3000,
};

export default function BuilderPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Social post state
  const [socialPlatform, setSocialPlatform] = useState("Instagram");
  const [socialCaption, setSocialCaption] = useState("");
  const [socialHashtags, setSocialHashtags] = useState("");

  // Email state
  const [emailSubject, setEmailSubject] = useState("");
  const [emailPreview, setEmailPreview] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailCta, setEmailCta] = useState("");

  // Ad state
  const [adHeadline, setAdHeadline] = useState("");
  const [adDescription, setAdDescription] = useState("");
  const [adCta, setAdCta] = useState("");
  const [adUrl, setAdUrl] = useState("");

  // Landing state
  const [landingHeadline, setLandingHeadline] = useState("");
  const [landingSubheading, setLandingSubheading] = useState("");
  const [landingBody, setLandingBody] = useState("");
  const [landingCta, setLandingCta] = useState("");
  const [landingFormFields, setLandingFormFields] = useState("");

  useEffect(() => {
    async function loadDrafts() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/context?category=marketing_draft", { headers });
        const data = await res.json();
        setDrafts(data.entries || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    loadDrafts();
  }, []);

  function getContentForSave(): { title: string; content: Record<string, unknown> } {
    switch (selectedTemplate) {
      case "social":
        return {
          title: `Social Post - ${socialPlatform}`,
          content: { platform: socialPlatform, caption: socialCaption, hashtags: socialHashtags },
        };
      case "email":
        return {
          title: `Email - ${emailSubject || "Untitled"}`,
          content: { subject: emailSubject, previewText: emailPreview, body: emailBody, cta: emailCta },
        };
      case "ad":
        return {
          title: `Ad - ${adHeadline || "Untitled"}`,
          content: { headline: adHeadline, description: adDescription, cta: adCta, displayUrl: adUrl },
        };
      case "landing":
        return {
          title: `Landing - ${landingHeadline || "Untitled"}`,
          content: { headline: landingHeadline, subheading: landingSubheading, body: landingBody, cta: landingCta, formFields: landingFormFields },
        };
      default:
        return { title: "Untitled", content: {} };
    }
  }

  async function handleSave(status: "DRAFT" | "SCHEDULED") {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const { title, content } = getContentForSave();
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "ENTITY",
          category: "marketing_draft",
          key: `${title}-${Date.now()}`,
          value: { templateType: selectedTemplate, status, content, createdAt: new Date().toISOString() },
        }),
      });
      const res = await fetch("/api/v1/context?category=marketing_draft", { headers });
      const data = await res.json();
      setDrafts(data.entries || []);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  function handleGenerateAI() {
    console.log("Generate with AI triggered for template:", selectedTemplate);
    console.log("Current content:", getContentForSave());
  }

  const charLimit = CHAR_LIMITS[socialPlatform] || 2200;

  return (
    <ModuleLayoutShell moduleType="CONTENT_STUDIO">
      <div className="p-6">
        <MarketingNav />
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">Content Builder</h1>
          <p className="text-sm text-gray-500">Create marketing content from templates.</p>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-6">
          {TEMPLATES.map((t) => (
            <button
              key={t.type}
              onClick={() => setSelectedTemplate(t.type)}
              className={cn(
                "bg-white border rounded-xl p-4 text-left transition-all",
                selectedTemplate === t.type ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
              )}
            >
              <h3 className="text-sm font-medium text-gray-900">{t.label}</h3>
              <p className="text-xs text-gray-500 mt-1">{t.description}</p>
            </button>
          ))}
        </div>

        {selectedTemplate && (
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
            <h2 className="text-sm font-medium text-gray-900 mb-4">
              {TEMPLATES.find((t) => t.type === selectedTemplate)?.label} Editor
            </h2>

            {selectedTemplate === "social" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Platform</label>
                  <div className="flex gap-2">
                    {Object.keys(CHAR_LIMITS).map((p) => (
                      <button
                        key={p}
                        onClick={() => setSocialPlatform(p)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-sm border",
                          socialPlatform === p ? "bg-indigo-50 text-indigo-700 border-indigo-300" : "text-gray-600 border-gray-300"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Caption ({socialCaption.length}/{charLimit})
                  </label>
                  <textarea
                    value={socialCaption}
                    onChange={(e) => setSocialCaption(e.target.value.slice(0, charLimit))}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Write your caption..."
                  />
                  {socialCaption.length > charLimit * 0.9 && (
                    <p className="text-xs text-orange-500 mt-1">Approaching character limit</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Hashtag Suggestions</label>
                  <input
                    value={socialHashtags}
                    onChange={(e) => setSocialHashtags(e.target.value)}
                    placeholder="#marketing #brand #growth"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {selectedTemplate === "email" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subject Line</label>
                  <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Preview Text</label>
                  <input value={emailPreview} onChange={(e) => setEmailPreview(e.target.value)} placeholder="Preview text shown in inbox..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Body</label>
                  <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} placeholder="Email body content..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CTA Button Text</label>
                  <input value={emailCta} onChange={(e) => setEmailCta(e.target.value)} placeholder="Shop Now" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {selectedTemplate === "ad" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Headline ({adHeadline.length}/30)</label>
                  <input value={adHeadline} onChange={(e) => setAdHeadline(e.target.value.slice(0, 30))} placeholder="Ad headline..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Description ({adDescription.length}/90)</label>
                  <textarea value={adDescription} onChange={(e) => setAdDescription(e.target.value.slice(0, 90))} rows={3} placeholder="Ad description..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CTA</label>
                  <input value={adCta} onChange={(e) => setAdCta(e.target.value)} placeholder="Learn More" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Display URL</label>
                  <input value={adUrl} onChange={(e) => setAdUrl(e.target.value)} placeholder="www.example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            {selectedTemplate === "landing" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Headline</label>
                  <input value={landingHeadline} onChange={(e) => setLandingHeadline(e.target.value)} placeholder="Landing page headline..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Subheading</label>
                  <input value={landingSubheading} onChange={(e) => setLandingSubheading(e.target.value)} placeholder="Supporting subheading..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Body</label>
                  <textarea value={landingBody} onChange={(e) => setLandingBody(e.target.value)} rows={6} placeholder="Main content..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">CTA</label>
                  <input value={landingCta} onChange={(e) => setLandingCta(e.target.value)} placeholder="Get Started" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Form Fields (comma-separated)</label>
                  <input value={landingFormFields} onChange={(e) => setLandingFormFields(e.target.value)} placeholder="Name, Email, Phone" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={handleGenerateAI}
                className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100"
              >
                Generate with AI
              </button>
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                onClick={() => handleSave("SCHEDULED")}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Schedule
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-sm font-medium text-gray-900 mb-4">Recent Drafts</h2>
          {loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
          ) : drafts.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No drafts yet. Select a template above to start creating.</p>
          ) : (
            <div className="space-y-2">
              {drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{draft.key}</p>
                    <p className="text-xs text-gray-500 capitalize">{draft.value?.templateType} - {draft.value?.status}</p>
                  </div>
                  <p className="text-xs text-gray-400">
                    {draft.value?.createdAt ? new Date(draft.value.createdAt).toLocaleDateString() : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
