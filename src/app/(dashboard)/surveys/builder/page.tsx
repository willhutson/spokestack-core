"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { cn } from "@/lib/utils";

type QuestionType = "MULTIPLE_CHOICE" | "SHORT_TEXT" | "LONG_TEXT" | "RATING" | "NPS" | "DROPDOWN";

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  placeholder?: string;
  options?: QuestionOption[];
  scale?: 5 | 10;
  followUp?: string;
}

const QUESTION_TYPES: { type: QuestionType; label: string; icon: string }[] = [
  { type: "MULTIPLE_CHOICE", label: "Multiple Choice", icon: "M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" },
  { type: "SHORT_TEXT", label: "Short Text", icon: "M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" },
  { type: "LONG_TEXT", label: "Long Text", icon: "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" },
  { type: "RATING", label: "Rating", icon: "M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" },
  { type: "NPS", label: "NPS", icon: "M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" },
  { type: "DROPDOWN", label: "Dropdown", icon: "M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" },
];

function makeId() {
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function defaultQuestion(type: QuestionType): Question {
  const base = { id: makeId(), type, text: "", required: false };
  switch (type) {
    case "MULTIPLE_CHOICE":
      return { ...base, options: [{ id: makeId(), text: "Option 1" }, { id: makeId(), text: "Option 2" }] };
    case "SHORT_TEXT":
    case "LONG_TEXT":
      return { ...base, placeholder: "" };
    case "RATING":
      return { ...base, scale: 5 };
    case "NPS":
      return { ...base, followUp: "" };
    case "DROPDOWN":
      return { ...base, options: [{ id: makeId(), text: "Option 1" }, { id: makeId(), text: "Option 2" }] };
  }
}

export default function SurveyBuilderPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const editId = searchParams.get("id");

  const [title, setTitle] = useState("Untitled Survey");
  const [questions, setQuestions] = useState<Question[]>([defaultQuestion("SHORT_TEXT")]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!editId);

  // Load existing survey if editing
  useEffect(() => {
    if (!editId) return;
    (async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`/api/v1/context?category=survey&key=${editId}`, { headers });
        if (res.ok) {
          const d = await res.json();
          const entry = (d.entries ?? []).find((e: { key: string }) => e.key === editId);
          if (entry) {
            const v = JSON.parse(entry.value);
            setTitle(v.title ?? "Untitled Survey");
            if (v.questions && v.questions.length > 0) {
              setQuestions(v.questions.map((q: Record<string, unknown>, i: number) => ({
                id: makeId(),
                type: (q.type as string)?.toUpperCase().replace("-", "_") ?? "SHORT_TEXT",
                text: (q.text as string) ?? "",
                required: (q.required as boolean) ?? false,
                options: Array.isArray(q.options) ? (q.options as string[]).map((o) => ({ id: makeId(), text: o })) : undefined,
                placeholder: (q.placeholder as string) ?? "",
                scale: (q.scale as 5 | 10) ?? 5,
                followUp: (q.followUp as string) ?? "",
              })));
            }
          }
        }
      } catch {
        // ignore
      } finally {
        setLoaded(true);
      }
    })();
  }, [editId]);

  const selected = questions[selectedIdx] ?? questions[0];

  const updateQuestion = (idx: number, patch: Partial<Question>) => {
    setQuestions(questions.map((q, i) => i === idx ? { ...q, ...patch } : q));
  };

  const addQuestion = (type: QuestionType) => {
    const q = defaultQuestion(type);
    setQuestions([...questions, q]);
    setSelectedIdx(questions.length);
    setShowTypePicker(false);
  };

  const removeQuestion = (idx: number) => {
    if (questions.length <= 1) return;
    const updated = questions.filter((_, i) => i !== idx);
    setQuestions(updated);
    setSelectedIdx(Math.min(selectedIdx, updated.length - 1));
  };

  const moveQuestion = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= questions.length) return;
    const updated = [...questions];
    [updated[idx], updated[target]] = [updated[target], updated[idx]];
    setQuestions(updated);
    setSelectedIdx(target);
  };

  const addOption = (qIdx: number) => {
    const q = questions[qIdx];
    if (!q.options) return;
    updateQuestion(qIdx, { options: [...q.options, { id: makeId(), text: `Option ${q.options.length + 1}` }] });
  };

  const removeOption = (qIdx: number, optIdx: number) => {
    const q = questions[qIdx];
    if (!q.options || q.options.length <= 1) return;
    updateQuestion(qIdx, { options: q.options.filter((_, i) => i !== optIdx) });
  };

  const updateOption = (qIdx: number, optIdx: number, text: string) => {
    const q = questions[qIdx];
    if (!q.options) return;
    updateQuestion(qIdx, { options: q.options.map((o, i) => i === optIdx ? { ...o, text } : o) });
  };

  const save = async () => {
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      const key = editId ?? `survey_${Date.now()}`;
      const value = {
        title,
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type,
          required: q.required,
          ...(q.options ? { options: q.options.map((o) => o.text) } : {}),
          ...(q.placeholder ? { placeholder: q.placeholder } : {}),
          ...(q.scale ? { scale: q.scale } : {}),
          ...(q.followUp ? { followUp: q.followUp } : {}),
        })),
        status: "Draft",
        responseCount: 0,
      };
      await fetch("/api/v1/context", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ entryType: "STRUCTURED", category: "survey", key, value }),
      });
      router.push("/surveys");
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <ModuleLayoutShell moduleType="SURVEYS">
        <div className="p-6 bg-[var(--bg-base)] min-h-full">
          <div className="text-center py-12 text-sm text-[var(--text-tertiary)]">Loading...</div>
        </div>
      </ModuleLayoutShell>
    );
  }

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="flex flex-col h-full bg-[var(--bg-base)]">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/surveys")} className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
            </button>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold text-[var(--text-primary)] border-none outline-none bg-transparent focus:ring-0 w-64"
              placeholder="Survey title"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
              Preview
            </button>
            <button onClick={save} disabled={saving}
              className="px-4 py-1.5 text-sm font-medium text-[var(--primary-foreground)] bg-[var(--accent)] rounded-lg hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </div>

        {/* Two-Panel Layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left Panel - Question List */}
          <div className="w-80 border-r border-[var(--border)] flex flex-col">
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {questions.map((q, i) => {
                const typeInfo = QUESTION_TYPES.find((t) => t.type === q.type);
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedIdx(i)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors",
                      selectedIdx === i ? "border-[var(--accent)] bg-[var(--accent-subtle)]" : "border-[var(--border)] hover:border-[var(--border-strong)]"
                    )}
                  >
                    {/* Move buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button onClick={(e) => { e.stopPropagation(); moveQuestion(i, -1); }}
                        disabled={i === 0}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-30">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); moveQuestion(i, 1); }}
                        disabled={i === questions.length - 1}
                        className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] disabled:opacity-30">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                      </button>
                    </div>
                    <svg className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={typeInfo?.icon ?? QUESTION_TYPES[0].icon} />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--text-tertiary)]">Q{i + 1} - {typeInfo?.label ?? q.type}</p>
                      <p className="text-sm text-[var(--text-primary)] truncate">{q.text || "Untitled question"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add Question */}
            <div className="p-4 border-t border-[var(--border)]">
              {showTypePicker ? (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-[var(--text-secondary)] mb-2">Select question type</p>
                  {QUESTION_TYPES.map((t) => (
                    <button key={t.type} onClick={() => addQuestion(t.type)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-hover)] transition-colors">
                      <svg className="w-4 h-4 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                      </svg>
                      {t.label}
                    </button>
                  ))}
                  <button onClick={() => setShowTypePicker(false)} className="w-full text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] mt-1 py-1">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setShowTypePicker(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-[var(--accent)] bg-[var(--accent-subtle)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                  Add Question
                </button>
              )}
            </div>
          </div>

          {/* Right Panel - Question Editor */}
          <div className="flex-1 p-6 overflow-y-auto">
            {selected && (
              <div className="max-w-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Question {selectedIdx + 1}</h3>
                  {questions.length > 1 && (
                    <button onClick={() => removeQuestion(selectedIdx)}
                      className="text-xs text-red-500 hover:text-red-700">Remove</button>
                  )}
                </div>

                {/* Question Text */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Question Text</label>
                  <input
                    value={selected.text}
                    onChange={(e) => updateQuestion(selectedIdx, { text: e.target.value })}
                    placeholder="Enter your question..."
                    className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  />
                </div>

                {/* Type-specific fields */}
                {(selected.type === "MULTIPLE_CHOICE" || selected.type === "DROPDOWN") && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Options</label>
                    <div className="space-y-2">
                      {(selected.options ?? []).map((opt, i) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            value={opt.text}
                            onChange={(e) => updateOption(selectedIdx, i, e.target.value)}
                            className="flex-1 border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                          />
                          {(selected.options?.length ?? 0) > 1 && (
                            <button onClick={() => removeOption(selectedIdx, i)} className="text-red-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addOption(selectedIdx)}
                        className="text-xs text-[var(--accent)] hover:text-[var(--accent)] font-medium">+ Add Option</button>
                    </div>
                  </div>
                )}

                {(selected.type === "SHORT_TEXT" || selected.type === "LONG_TEXT") && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Placeholder</label>
                    <input
                      value={selected.placeholder ?? ""}
                      onChange={(e) => updateQuestion(selectedIdx, { placeholder: e.target.value })}
                      placeholder="Placeholder text..."
                      className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                )}

                {selected.type === "RATING" && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Scale</label>
                    <div className="flex gap-2">
                      {([5, 10] as const).map((s) => (
                        <button key={s} onClick={() => updateQuestion(selectedIdx, { scale: s })}
                          className={cn("px-4 py-2 text-sm rounded-lg border transition-colors",
                            selected.scale === s ? "border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                          )}>
                          1-{s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selected.type === "NPS" && (
                  <div className="mb-4">
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Follow-up Question</label>
                    <input
                      value={selected.followUp ?? ""}
                      onChange={(e) => updateQuestion(selectedIdx, { followUp: e.target.value })}
                      placeholder="e.g. What is the primary reason for your score?"
                      className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                    />
                  </div>
                )}

                {/* Required Toggle */}
                {(selected.type === "MULTIPLE_CHOICE" || selected.type === "SHORT_TEXT" || selected.type === "LONG_TEXT") && (
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => updateQuestion(selectedIdx, { required: !selected.required })}
                      className={cn("w-9 h-5 rounded-full transition-colors relative",
                        selected.required ? "bg-[var(--accent)]" : "bg-[var(--border-strong)]"
                      )}>
                      <span className={cn("absolute top-0.5 w-4 h-4 bg-[var(--bg-base)] rounded-full transition-transform shadow-sm",
                        selected.required ? "left-[18px]" : "left-0.5"
                      )} />
                    </button>
                    <span className="text-xs text-[var(--text-secondary)]">Required</span>
                  </div>
                )}

                {/* Preview */}
                <div className="mt-8 p-4 bg-[var(--bg-base)] rounded-lg border border-[var(--border)]">
                  <p className="text-xs font-medium text-[var(--text-tertiary)] mb-2">Preview</p>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-2">
                    {selected.text || "Your question text"}{selected.required && <span className="text-red-500 ml-0.5">*</span>}
                  </p>
                  {selected.type === "SHORT_TEXT" && (
                    <input disabled placeholder={selected.placeholder || "Short answer"} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-base)]" />
                  )}
                  {selected.type === "LONG_TEXT" && (
                    <textarea disabled placeholder={selected.placeholder || "Long answer"} rows={3} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-base)] resize-none" />
                  )}
                  {(selected.type === "MULTIPLE_CHOICE") && (
                    <div className="space-y-1.5">
                      {(selected.options ?? []).map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                          <span className="w-4 h-4 border border-[var(--border-strong)] rounded-full" />
                          {opt.text}
                        </label>
                      ))}
                    </div>
                  )}
                  {selected.type === "DROPDOWN" && (
                    <select disabled className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-base)] text-[var(--text-tertiary)]">
                      <option>Select an option...</option>
                      {(selected.options ?? []).map((opt) => <option key={opt.id}>{opt.text}</option>)}
                    </select>
                  )}
                  {selected.type === "RATING" && (
                    <div className="flex gap-1">
                      {Array.from({ length: selected.scale ?? 5 }, (_, i) => (
                        <span key={i} className="w-8 h-8 border border-[var(--border-strong)] rounded-lg flex items-center justify-center text-xs text-[var(--text-tertiary)]">{i + 1}</span>
                      ))}
                    </div>
                  )}
                  {selected.type === "NPS" && (
                    <div>
                      <div className="flex gap-1 mb-2">
                        {Array.from({ length: 11 }, (_, i) => (
                          <span key={i} className="w-7 h-7 border border-[var(--border-strong)] rounded flex items-center justify-center text-[10px] text-[var(--text-tertiary)]">{i}</span>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] px-1">
                        <span>Not likely</span>
                        <span>Very likely</span>
                      </div>
                      {selected.followUp && (
                        <div className="mt-3">
                          <p className="text-xs text-[var(--text-secondary)] mb-1">{selected.followUp}</p>
                          <textarea disabled rows={2} className="w-full border border-[var(--border-strong)] rounded-lg px-3 py-2 text-sm bg-[var(--bg-base)] resize-none" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModuleLayoutShell>
  );
}
