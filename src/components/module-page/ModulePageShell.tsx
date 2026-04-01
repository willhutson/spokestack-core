"use client";

interface ModulePageShellProps {
  moduleName: string;
  moduleDescription: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  agentHint?: string;
  onTalkToAgent?: (message: string) => void;
  isEmpty?: boolean;
}

export default function ModulePageShell({
  moduleName,
  moduleDescription,
  icon,
  children,
  agentHint,
  onTalkToAgent,
  isEmpty,
}: ModulePageShellProps) {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            {icon}
          </div>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">
              {moduleName}
            </h1>
            <p className="text-sm text-gray-500">{moduleDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onTalkToAgent && (
            <button
              onClick={() =>
                onTalkToAgent(
                  agentHint ?? `Tell me about ${moduleName} capabilities`
                )
              }
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
                />
              </svg>
              Talk to Agent
            </button>
          )}
        </div>
      </div>

      {/* Empty state or content */}
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-6 text-gray-300">
            {icon}
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Set up {moduleName}
          </h2>
          <p className="text-sm text-gray-500 max-w-md text-center mb-6">
            Get started by talking to your {moduleName} Agent. It can help you
            set things up and import existing data.
          </p>
          {onTalkToAgent && (
            <button
              onClick={() =>
                onTalkToAgent(
                  agentHint ??
                    `Help me set up ${moduleName} for my workspace`
                )
              }
              className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Talk to your {moduleName} Agent
            </button>
          )}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
