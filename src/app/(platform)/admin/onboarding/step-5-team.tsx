"use client";

import { useState } from "react";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

interface TeamMember {
  name: string;
  email: string;
  role?: string;
}

interface Role {
  title: string;
}

export function Step5Team({ data, updateData }: StepProps) {
  const team = (data.team as TeamMember[]) ?? [];
  const roles = (data.roles as Role[]) ?? [];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");

  const addMember = () => {
    if (!name.trim() || !email.trim()) return;
    if (team.some((m) => m.email === email)) return;
    updateData({ team: [...team, { name: name.trim(), email: email.trim(), role: role || undefined }] });
    setName("");
    setEmail("");
    setRole("");
  };

  const removeMember = (index: number) => {
    updateData({ team: team.filter((_, i) => i !== index) });
  };

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-[var(--text-primary)]">Team Members</h2>
      <p className="mb-6 text-sm text-[var(--text-secondary)]">
        Add team members to invite. They will receive an email invitation.
      </p>

      {/* Add member form */}
      <div className="mb-6 grid grid-cols-[1fr_1fr_auto_auto] gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Full name"
          className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)]"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addMember()}
          placeholder="Email address"
          className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none focus:border-[var(--accent)]"
        />
        {roles.length > 0 && (
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-[var(--border-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          >
            <option value="">Role</option>
            {roles.map((r) => (
              <option key={r.title} value={r.title}>{r.title}</option>
            ))}
          </select>
        )}
        <button
          onClick={addMember}
          disabled={!name.trim() || !email.trim()}
          className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] hover:bg-[var(--accent)] disabled:opacity-40"
        >
          Add
        </button>
      </div>

      {/* Team list */}
      {team.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border-strong)] py-8 text-center">
          <p className="text-sm text-[var(--text-secondary)]">No team members added yet.</p>
          <p className="text-xs text-[var(--text-tertiary)] mt-1">You can always invite people later.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {team.map((member, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-base)] px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-subtle)] text-sm font-medium text-[var(--accent)]">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{member.name}</p>
                <p className="text-xs text-[var(--text-secondary)] truncate">{member.email}{member.role ? ` · ${member.role}` : ""}</p>
              </div>
              <button
                onClick={() => removeMember(i)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <p className="text-xs text-[var(--text-tertiary)] mt-2">{team.length} member{team.length !== 1 ? "s" : ""} added</p>
        </div>
      )}
    </div>
  );
}
