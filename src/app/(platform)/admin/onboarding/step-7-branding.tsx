"use client";

interface StepProps {
  data: Record<string, unknown>;
  updateData: (updates: Record<string, unknown>) => void;
}

const COLOR_PRESETS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#1e293b",
];

export function Step7Branding({ data, updateData }: StepProps) {
  const primaryColor = (data.primaryColor as string) ?? "#6366f1";
  const logoUrl = (data.logoUrl as string) ?? "";
  const tagline = (data.tagline as string) ?? "";

  return (
    <div>
      <h2 className="mb-1 text-xl font-bold text-gray-900">Branding</h2>
      <p className="mb-6 text-sm text-gray-500">
        Customize the look and feel of your workspace.
      </p>

      <div className="space-y-6">
        {/* Primary color */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Primary Color</label>
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateData({ primaryColor: color })}
                  className={`h-8 w-8 rounded-full transition-all ${
                    primaryColor === color ? "ring-2 ring-offset-2 ring-indigo-500" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <input
              type="color"
              value={primaryColor}
              onChange={(e) => updateData({ primaryColor: e.target.value })}
              className="h-8 w-8 cursor-pointer rounded border-0"
            />
          </div>
        </div>

        {/* Logo URL */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Logo URL</label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => updateData({ logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          {logoUrl && (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoUrl} alt="Logo preview" className="h-10 w-10 rounded object-contain" />
              <span className="text-xs text-gray-500">Preview</span>
            </div>
          )}
        </div>

        {/* Tagline */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={(e) => updateData({ tagline: e.target.value })}
            placeholder="Your company tagline"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Preview */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">Brand Preview</label>
          <div
            className="rounded-xl p-6 text-white"
            style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}88)` }}
          >
            <div className="flex items-center gap-3 mb-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="h-10 w-10 rounded-lg object-contain bg-white/20 p-1" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center text-lg font-bold">
                  {((data.orgName as string) ?? "S").charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-bold">{(data.orgName as string) || "Your Organization"}</p>
                {tagline && <p className="text-sm opacity-80">{tagline}</p>}
              </div>
            </div>
            <div className="h-2 w-24 rounded-full bg-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
