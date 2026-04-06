"use client";

import { useState, useCallback } from "react";
import { getAuthHeaders } from "@/lib/client-auth";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { FormsNav } from "../FormsNav";
import { cn } from "@/lib/utils";

type FieldType = "TEXT" | "NUMBER" | "EMAIL" | "PHONE" | "DATE" | "SELECT" | "CHECKBOX" | "FILE" | "TEXTAREA" | "SECTION_HEADER";

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  validation?: string;
  min?: number;
  max?: number;
  options?: string[];
  allowMultiple?: boolean;
  rows?: number;
  maxLength?: number;
  title?: string;
  description?: string;
}

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: "TEXT", label: "Text", icon: "Aa" },
  { type: "NUMBER", label: "Number", icon: "#" },
  { type: "EMAIL", label: "Email", icon: "@" },
  { type: "PHONE", label: "Phone", icon: "Ph" },
  { type: "DATE", label: "Date", icon: "D" },
  { type: "SELECT", label: "Select", icon: "v" },
  { type: "CHECKBOX", label: "Checkbox", icon: "x" },
  { type: "FILE", label: "File", icon: "F" },
  { type: "TEXTAREA", label: "Textarea", icon: "T" },
  { type: "SECTION_HEADER", label: "Section", icon: "H" },
];

function generateId(): string {
  return `field_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultField(type: FieldType): FormField {
  const base: FormField = { id: generateId(), type, label: "", required: false };
  switch (type) {
    case "TEXT": return { ...base, label: "Text Field", placeholder: "" };
    case "NUMBER": return { ...base, label: "Number Field", min: 0, max: 100 };
    case "EMAIL": return { ...base, label: "Email Field", placeholder: "email@example.com", validation: "email" };
    case "PHONE": return { ...base, label: "Phone Field", placeholder: "+1 (555) 000-0000" };
    case "DATE": return { ...base, label: "Date Field" };
    case "SELECT": return { ...base, label: "Select Field", options: ["Option 1", "Option 2"], allowMultiple: false };
    case "CHECKBOX": return { ...base, label: "Checkbox Field", options: ["Option 1", "Option 2"] };
    case "FILE": return { ...base, label: "File Upload" };
    case "TEXTAREA": return { ...base, label: "Text Area", rows: 4, maxLength: 500 };
    case "SECTION_HEADER": return { ...base, label: "", title: "Section Title", description: "Section description" };
  }
}

export default function FormBuilderPage() {
  const [formName, setFormName] = useState("Untitled Form");
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [preview, setPreview] = useState(false);

  const selectedField = fields.find((f) => f.id === selectedId) ?? null;

  function addField(type: FieldType) {
    const field = defaultField(type);
    setFields((prev) => [...prev, field]);
    setSelectedId(field.id);
  }

  function updateField(id: string, updates: Partial<FormField>) {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  }

  function removeField(id: string) {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveField(id: string, direction: "up" | "down") {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx === -1) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }

  const saveForm = useCallback(async (status: string) => {
    const setFn = status === "ACTIVE" ? setPublishing : setSaving;
    setFn(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/v1/forms", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName, fields, status }),
      });
    } catch { /* ignore */ } finally { setFn(false); }
  }, [formName, fields]);

  // Option management for SELECT/CHECKBOX
  function addOption(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const opts = [...(field.options ?? []), `Option ${(field.options?.length ?? 0) + 1}`];
    updateField(fieldId, { options: opts });
  }

  function removeOption(fieldId: string, idx: number) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const opts = (field.options ?? []).filter((_, i) => i !== idx);
    updateField(fieldId, { options: opts });
  }

  function updateOption(fieldId: string, idx: number, value: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    const opts = [...(field.options ?? [])];
    opts[idx] = value;
    updateField(fieldId, { options: opts });
  }

  return (
    <ModuleLayoutShell moduleType="SURVEYS">
      <div className="p-6">
        <FormsNav />

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-6">
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="text-2xl font-bold text-[var(--text-primary)] bg-transparent border-none focus:outline-none focus:ring-0 w-auto"
            placeholder="Form Name"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setPreview(!preview)} className={cn("px-3 py-2 text-sm font-medium rounded-lg transition-colors", preview ? "bg-indigo-100 text-indigo-700" : "text-gray-600 bg-gray-100 hover:bg-gray-200")}>
              {preview ? "Edit" : "Preview"}
            </button>
            <button onClick={() => saveForm("DRAFT")} disabled={saving} className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
              {saving ? "Saving..." : "Save"}
            </button>
            <button onClick={() => saveForm("ACTIVE")} disabled={publishing} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {publishing ? "Publishing..." : "Publish"}
            </button>
          </div>
        </div>

        {preview ? (
          /* Preview Mode */
          <div className="max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl p-8">
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-6">{formName}</h2>
            <div className="space-y-5">
              {fields.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No fields added yet.</p>
              ) : (
                fields.map((field) => (
                  <div key={field.id}>
                    {field.type === "SECTION_HEADER" ? (
                      <div className="border-b border-gray-200 pb-2 mb-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{field.title}</h3>
                        {field.description && <p className="text-xs text-gray-500">{field.description}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        {(field.type === "TEXT" || field.type === "EMAIL" || field.type === "PHONE") && (
                          <input type="text" placeholder={field.placeholder} disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400" />
                        )}
                        {field.type === "NUMBER" && (
                          <input type="number" min={field.min} max={field.max} disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400" />
                        )}
                        {field.type === "DATE" && (
                          <input type="date" disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400" />
                        )}
                        {field.type === "SELECT" && (
                          <select disabled className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400">
                            <option>Select...</option>
                            {field.options?.map((o, i) => <option key={i}>{o}</option>)}
                          </select>
                        )}
                        {field.type === "CHECKBOX" && (
                          <div className="space-y-1">{field.options?.map((o, i) => (
                            <label key={i} className="flex items-center gap-2 text-sm text-gray-400"><input type="checkbox" disabled />{o}</label>
                          ))}</div>
                        )}
                        {field.type === "TEXTAREA" && (
                          <textarea rows={field.rows ?? 4} disabled placeholder={field.placeholder} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-400 resize-none" />
                        )}
                        {field.type === "FILE" && (
                          <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">Drop file here or click to upload</div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          /* Builder Mode */
          <div className="grid grid-cols-3 gap-6">
            {/* Left Panel: Field List */}
            <div className="col-span-2">
              <div className="mb-4">
                <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Fields</h2>
                {fields.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
                    <p className="text-sm text-gray-500 mb-2">No fields yet</p>
                    <p className="text-xs text-gray-400">Add fields using the panel on the right.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {fields.map((field, idx) => (
                      <div
                        key={field.id}
                        onClick={() => setSelectedId(field.id)}
                        className={cn(
                          "flex items-center gap-3 bg-white border rounded-xl px-4 py-3 cursor-pointer transition-all",
                          selectedId === field.id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200 hover:shadow-sm"
                        )}
                      >
                        <div className="w-6 text-center text-xs text-gray-400 cursor-grab select-none">::</div>
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-xs font-mono text-gray-500">
                          {FIELD_TYPES.find((t) => t.type === field.type)?.icon ?? "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-[var(--text-primary)] truncate">{field.type === "SECTION_HEADER" ? (field.title ?? "Section") : field.label}</div>
                          <div className="text-xs text-gray-400">{field.type}{field.required ? " (required)" : ""}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); moveField(field.id, "up"); }} disabled={idx === 0} className="p-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">Up</button>
                          <button onClick={(e) => { e.stopPropagation(); moveField(field.id, "down"); }} disabled={idx === fields.length - 1} className="p-1 text-xs text-gray-400 hover:text-gray-600 disabled:opacity-30">Dn</button>
                          <button onClick={(e) => { e.stopPropagation(); removeField(field.id); }} className="p-1 text-xs text-red-400 hover:text-red-600">Del</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Field Buttons */}
              <div>
                <h3 className="text-xs font-medium text-gray-500 mb-2">Add Field</h3>
                <div className="flex flex-wrap gap-1.5">
                  {FIELD_TYPES.map((ft) => (
                    <button key={ft.type} onClick={() => addField(ft.type)} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                      {ft.icon} {ft.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel: Field Editor */}
            <div>
              {selectedField ? (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Edit: {selectedField.type}</h3>
                  <div className="space-y-4">
                    {selectedField.type === "SECTION_HEADER" ? (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                          <input type="text" value={selectedField.title ?? ""} onChange={(e) => updateField(selectedField.id, { title: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                          <input type="text" value={selectedField.description ?? ""} onChange={(e) => updateField(selectedField.id, { description: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                          <input type="text" value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>

                        {(selectedField.type === "TEXT" || selectedField.type === "EMAIL" || selectedField.type === "PHONE" || selectedField.type === "TEXTAREA") && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Placeholder</label>
                            <input type="text" value={selectedField.placeholder ?? ""} onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                        )}

                        {(selectedField.type === "TEXT" || selectedField.type === "EMAIL" || selectedField.type === "PHONE") && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Validation Pattern</label>
                            <input type="text" value={selectedField.validation ?? ""} onChange={(e) => updateField(selectedField.id, { validation: e.target.value })} placeholder="e.g. ^[a-zA-Z]+$" className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          </div>
                        )}

                        {selectedField.type === "NUMBER" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Min</label>
                              <input type="number" value={selectedField.min ?? ""} onChange={(e) => updateField(selectedField.id, { min: Number(e.target.value) })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max</label>
                              <input type="number" value={selectedField.max ?? ""} onChange={(e) => updateField(selectedField.id, { max: Number(e.target.value) })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                          </div>
                        )}

                        {(selectedField.type === "SELECT" || selectedField.type === "CHECKBOX") && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Options</label>
                            <div className="space-y-1.5">
                              {(selectedField.options ?? []).map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <input type="text" value={opt} onChange={(e) => updateOption(selectedField.id, idx, e.target.value)} className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-md bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                  <button onClick={() => removeOption(selectedField.id, idx)} className="text-xs text-red-400 hover:text-red-600 px-1">x</button>
                                </div>
                              ))}
                              <button onClick={() => addOption(selectedField.id)} className="text-xs font-medium text-indigo-600 hover:text-indigo-700">+ Add Option</button>
                            </div>
                          </div>
                        )}

                        {selectedField.type === "SELECT" && (
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={selectedField.allowMultiple ?? false} onChange={(e) => updateField(selectedField.id, { allowMultiple: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                            <label className="text-xs text-gray-700">Allow Multiple Selections</label>
                          </div>
                        )}

                        {selectedField.type === "TEXTAREA" && (
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Rows</label>
                              <input type="number" min={1} max={20} value={selectedField.rows ?? 4} onChange={(e) => updateField(selectedField.id, { rows: Number(e.target.value) })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Max Length</label>
                              <input type="number" min={0} value={selectedField.maxLength ?? 500} onChange={(e) => updateField(selectedField.id, { maxLength: Number(e.target.value) })} className="w-full h-9 px-3 text-sm border border-gray-300 rounded-lg bg-white text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={selectedField.required} onChange={(e) => updateField(selectedField.id, { required: e.target.checked })} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                          <label className="text-xs text-gray-700">Required</label>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
                  <p className="text-sm text-gray-500">Select a field to edit its properties.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
