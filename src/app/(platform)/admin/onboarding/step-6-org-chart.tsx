"use client";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

interface TeamMember {
  name: string;
  email: string;
  role?: string;
}

interface OrgRelation {
  managerId: string;
  memberId: string;
}

export function Step6OrgChart({ data, updateData }: StepProps) {
  const team = (data.team as TeamMember[]) ?? [];
  const orgChart = (data.orgChart as OrgRelation[]) ?? [];

  const setManager = (memberIdx: number, managerIdx: number | null) => {
    const memberId = String(memberIdx);
    const filtered = orgChart.filter((r) => r.memberId !== memberId);
    if (managerIdx !== null) {
      filtered.push({ managerId: String(managerIdx), memberId });
    }
    updateData({ orgChart: filtered });
  };

  const getManager = (memberIdx: number): string => {
    const rel = orgChart.find((r) => r.memberId === String(memberIdx));
    return rel?.managerId ?? "";
  };

  if (team.length === 0) {
    return (
      <div>
        <h2 className="mb-1 text-xl font-bold text-gray-900">Org Chart</h2>
        <p className="mb-6 text-sm text-gray-500">
          Define reporting relationships between team members.
        </p>
        <div className="rounded-lg border border-dashed border-gray-300 py-8 text-center">
          <p className="text-sm text-gray-500">Add team members first to set up the org chart.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">Org Chart</h2>
      <p className="mb-6 text-sm text-gray-500">
        Select who each team member reports to.
      </p>

      <div className="space-y-3">
        {team.map((member, i) => (
          <div key={i} className="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-medium text-indigo-700">
              {member.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{member.name}</p>
              {member.role && <p className="text-xs text-gray-500">{member.role}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Reports to:</span>
              <select
                value={getManager(i)}
                onChange={(e) => setManager(i, e.target.value ? Number(e.target.value) : null)}
                className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500"
              >
                <option value="">None (top level)</option>
                {team.map((m, j) =>
                  j !== i ? (
                    <option key={j} value={String(j)}>
                      {m.name}
                    </option>
                  ) : null,
                )}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
