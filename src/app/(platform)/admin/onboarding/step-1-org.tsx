"use client";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

const ORG_TYPES = ["Agency", "In-house Team", "Freelancer", "Enterprise", "Startup", "Non-profit"];
const INDUSTRIES = ["Marketing", "Technology", "Healthcare", "Finance", "Education", "E-commerce", "Media", "Legal", "Real Estate", "Other"];
const SIZES = ["1-5", "6-20", "21-50", "51-200", "200+"];

export function Step1Org({ data, updateData }: StepProps) {
  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">Organization Setup</h2>
      <p className="mb-6 text-sm text-gray-500">Tell us about your organization.</p>

      <div className="space-y-5">
        {/* Org name */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Organization Name
          </label>
          <input
            type="text"
            value={(data.orgName as string) ?? ""}
            onChange={(e) => updateData({ orgName: e.target.value })}
            placeholder="Acme Corp"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Domain (pre-filled) */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Website Domain
          </label>
          <input
            type="text"
            value={(data.domain as string) ?? ""}
            onChange={(e) => updateData({ domain: e.target.value })}
            placeholder="example.com"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Org type */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Organization Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ORG_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => updateData({ orgType: type })}
                className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                  data.orgType === type
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Industry */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Industry
          </label>
          <select
            value={(data.industry as string) ?? ""}
            onChange={(e) => updateData({ industry: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">Select an industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </select>
        </div>

        {/* Team size */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Team Size
          </label>
          <div className="flex gap-2">
            {SIZES.map((size) => (
              <button
                key={size}
                onClick={() => updateData({ size })}
                className={`flex-1 rounded-lg border px-3 py-2 text-sm transition-colors ${
                  data.size === size
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
