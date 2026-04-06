"use client";

import { useState } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { LmsNav } from "../LmsNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

type ModuleType = "VIDEO" | "TEXT" | "QUIZ" | "ASSIGNMENT";

interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

interface CourseModule {
  id: string;
  title: string;
  type: ModuleType;
  content: string;
  videoUrl?: string;
  videoDuration?: string;
  questions?: QuizQuestion[];
  instructions?: string;
  dueDate?: string;
  submissionType?: string;
}

const MODULE_TYPES: { value: ModuleType; label: string }[] = [
  { value: "VIDEO", label: "Video" },
  { value: "TEXT", label: "Text" },
  { value: "QUIZ", label: "Quiz" },
  { value: "ASSIGNMENT", label: "Assignment" },
];

const CATEGORIES = ["Onboarding", "Skills", "Compliance", "Leadership"];
const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];

export default function CreateCoursePage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Skills");
  const [level, setLevel] = useState("BEGINNER");
  const [duration, setDuration] = useState("");
  const [modules, setModules] = useState<CourseModule[]>([]);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  function addModule() {
    setModules([
      ...modules,
      {
        id: `mod-${Date.now()}`,
        title: "",
        type: "TEXT",
        content: "",
        questions: [],
      },
    ]);
  }

  function updateModule(index: number, updates: Partial<CourseModule>) {
    setModules(modules.map((m, i) => (i === index ? { ...m, ...updates } : m)));
  }

  function removeModule(index: number) {
    setModules(modules.filter((_, i) => i !== index));
  }

  function moveModule(index: number, direction: "up" | "down") {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === modules.length - 1) return;
    const newModules = [...modules];
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    [newModules[index], newModules[swapIndex]] = [newModules[swapIndex], newModules[index]];
    setModules(newModules);
  }

  function addQuestion(moduleIndex: number) {
    const mod = modules[moduleIndex];
    const questions = [...(mod.questions || []), { question: "", options: ["", "", "", ""], correctIndex: 0 }];
    updateModule(moduleIndex, { questions });
  }

  function updateQuestion(moduleIndex: number, qIndex: number, updates: Partial<QuizQuestion>) {
    const mod = modules[moduleIndex];
    const questions = (mod.questions || []).map((q, i) => (i === qIndex ? { ...q, ...updates } : q));
    updateModule(moduleIndex, { questions });
  }

  function updateQuestionOption(moduleIndex: number, qIndex: number, optIndex: number, value: string) {
    const mod = modules[moduleIndex];
    const questions = (mod.questions || []).map((q, i) => {
      if (i !== qIndex) return q;
      const options = [...q.options];
      options[optIndex] = value;
      return { ...q, options };
    });
    updateModule(moduleIndex, { questions });
  }

  async function handleSave(status: "DRAFT" | "PUBLISHED") {
    if (!title) return;
    setSaving(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/lms/courses", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          courseCategory: category,
          level,
          duration,
          instructor: "",
          modules,
          status,
        }),
      });
      if (status === "PUBLISHED") {
        setTitle("");
        setDescription("");
        setModules([]);
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleLayoutShell moduleType="LMS">
      <div className="p-6">
        <LmsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Create Course</h1>
            <p className="text-sm text-gray-500">Build a new course with modules and assessments.</p>
          </div>
          <button
            onClick={() => setPreview(!preview)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium",
              preview ? "bg-indigo-600 text-white" : "bg-white border border-gray-300 text-gray-700"
            )}
          >
            {preview ? "Edit Mode" : "Preview"}
          </button>
        </div>

        {preview ? (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900">{title || "Untitled Course"}</h2>
            <div className="flex gap-3 mt-2 text-xs">
              <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-full">{category}</span>
              <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{level}</span>
              {duration && <span className="text-gray-500">{duration}</span>}
            </div>
            <p className="text-sm text-gray-600 mt-4">{description || "No description"}</p>
            <div className="mt-6 space-y-4">
              {modules.length === 0 ? (
                <p className="text-sm text-gray-400">No modules added yet.</p>
              ) : (
                modules.map((mod, i) => (
                  <div key={mod.id} className="border border-gray-100 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-400">Module {i + 1}</span>
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{mod.type}</span>
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mt-1">{mod.title || "Untitled"}</h3>
                    {mod.type === "VIDEO" && (
                      <p className="text-xs text-gray-500 mt-1">Video: {mod.videoUrl || "No URL"} ({mod.videoDuration || "N/A"})</p>
                    )}
                    {mod.type === "TEXT" && (
                      <p className="text-xs text-gray-500 mt-1 whitespace-pre-wrap">{mod.content || "No content"}</p>
                    )}
                    {mod.type === "QUIZ" && (
                      <div className="mt-2 space-y-2">
                        {(mod.questions || []).map((q, qi) => (
                          <div key={qi} className="text-xs text-gray-600">
                            <p className="font-medium">Q{qi + 1}: {q.question}</p>
                            {q.options.map((opt, oi) => (
                              <p key={oi} className={cn("ml-4", oi === q.correctIndex && "text-green-600 font-medium")}>
                                {String.fromCharCode(65 + oi)}) {opt}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                    {mod.type === "ASSIGNMENT" && (
                      <div className="mt-1 text-xs text-gray-500">
                        <p>{mod.instructions || "No instructions"}</p>
                        {mod.dueDate && <p>Due: {mod.dueDate}</p>}
                        {mod.submissionType && <p>Submission: {mod.submissionType}</p>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Course Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Title *</label>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-gray-500 mb-1">Description</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Course description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Level</label>
                  <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                    {LEVELS.map((l) => <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estimated Duration</label>
                  <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2h 30m" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-gray-900">Modules ({modules.length})</h2>
                <button onClick={addModule} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                  Add Module
                </button>
              </div>

              {modules.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No modules yet. Click &quot;Add Module&quot; to start building your course.</p>
              ) : (
                <div className="space-y-4">
                  {modules.map((mod, i) => (
                    <div key={mod.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-400">Module {i + 1}</span>
                        <div className="flex gap-1">
                          <button onClick={() => moveModule(i, "up")} disabled={i === 0} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">Up</button>
                          <button onClick={() => moveModule(i, "down")} disabled={i === modules.length - 1} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30">Down</button>
                          <button onClick={() => removeModule(i)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">Remove</button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <input value={mod.title} onChange={(e) => updateModule(i, { title: e.target.value })} placeholder="Module title" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        <select value={mod.type} onChange={(e) => updateModule(i, { type: e.target.value as ModuleType })} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                          {MODULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>

                      {mod.type === "VIDEO" && (
                        <div className="grid grid-cols-2 gap-3">
                          <input value={mod.videoUrl || ""} onChange={(e) => updateModule(i, { videoUrl: e.target.value })} placeholder="Video URL" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                          <input value={mod.videoDuration || ""} onChange={(e) => updateModule(i, { videoDuration: e.target.value })} placeholder="Duration (e.g. 15m)" className="border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                        </div>
                      )}

                      {mod.type === "TEXT" && (
                        <textarea value={mod.content} onChange={(e) => updateModule(i, { content: e.target.value })} rows={5} placeholder="Module content..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                      )}

                      {mod.type === "QUIZ" && (
                        <div className="space-y-3">
                          {(mod.questions || []).map((q, qi) => (
                            <div key={qi} className="border border-gray-100 rounded-lg p-3">
                              <input
                                value={q.question}
                                onChange={(e) => updateQuestion(i, qi, { question: e.target.value })}
                                placeholder={`Question ${qi + 1}`}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
                              />
                              <div className="grid grid-cols-2 gap-2">
                                {q.options.map((opt, oi) => (
                                  <div key={oi} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`q-${mod.id}-${qi}`}
                                      checked={q.correctIndex === oi}
                                      onChange={() => updateQuestion(i, qi, { correctIndex: oi })}
                                      className="text-indigo-600"
                                    />
                                    <input
                                      value={opt}
                                      onChange={(e) => updateQuestionOption(i, qi, oi, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <button onClick={() => addQuestion(i)} className="text-xs text-indigo-600 hover:text-indigo-700">
                            + Add Question
                          </button>
                        </div>
                      )}

                      {mod.type === "ASSIGNMENT" && (
                        <div className="space-y-3">
                          <textarea
                            value={mod.instructions || ""}
                            onChange={(e) => updateModule(i, { instructions: e.target.value })}
                            rows={4}
                            placeholder="Assignment instructions..."
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                              <input type="date" value={mod.dueDate || ""} onChange={(e) => updateModule(i, { dueDate: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Submission Type</label>
                              <select value={mod.submissionType || "file"} onChange={(e) => updateModule(i, { submissionType: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                                <option value="file">File Upload</option>
                                <option value="text">Text Entry</option>
                                <option value="url">URL</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleSave("DRAFT")}
                disabled={saving || !title}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save as Draft"}
              </button>
              <button
                onClick={() => handleSave("PUBLISHED")}
                disabled={saving || !title}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Publish
              </button>
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
