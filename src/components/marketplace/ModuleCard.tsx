"use client";

export interface ModuleCardProps {
  moduleType: string;
  name: string;
  description: string;
  category: string;
  minTier: string;
  price: number | null;
  agentName: string;
  installed: boolean;
  installing?: boolean;
  onInstall: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  core: "bg-indigo-100 text-indigo-700",
  marketing: "bg-green-100 text-green-700",
  ops: "bg-amber-100 text-amber-700",
  analytics: "bg-blue-100 text-blue-700",
};

export default function ModuleCard({
  name,
  description,
  category,
  minTier,
  price,
  agentName,
  installed,
  installing,
  onInstall,
}: ModuleCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{agentName}</p>
        </div>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] ?? "bg-gray-100 text-gray-600"}`}
        >
          {category}
        </span>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-4 flex-1">
        {description}
      </p>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {price ? (
            <span className="text-gray-900 font-medium">
              ${(price / 100).toFixed(0)}/mo
            </span>
          ) : (
            <span className="text-indigo-600 font-medium">
              Included in {minTier}
            </span>
          )}
        </div>

        {installed ? (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-lg">
            Installed
          </span>
        ) : (
          <button
            onClick={onInstall}
            disabled={installing}
            className="text-xs font-medium text-white bg-indigo-600 px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {installing ? "Installing..." : "Install"}
          </button>
        )}
      </div>
    </div>
  );
}
