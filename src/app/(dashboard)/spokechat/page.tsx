"use client";

import { useState } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";

interface Channel {
  id: string;
  name: string;
  memberCount: number;
  lastMessage?: string;
}

export default function SpokeChatPage() {
  const [channels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);

  return (
    <ModuleLayoutShell moduleType="SPOKECHAT">
      <div className="p-6 bg-white min-h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SpokeChat</h1>
          <p className="text-sm text-gray-500 mt-0.5">Enterprise internal team messaging.</p>
        </div>
      </div>

      {/* Layout: sidebar + message area */}
      <div className="flex gap-6 min-h-[480px]">
        {/* Channel list */}
        <div className="w-72 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Channels</h2>
          {channels.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p className="text-xs text-gray-500 mb-3">No channels yet</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setSelectedChannel(ch.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selectedChannel === ch.id ? "bg-indigo-50" : ""}`}
                >
                  <p className="text-sm font-medium text-gray-900"># {ch.name}</p>
                  <p className="text-xs text-gray-400 truncate">{ch.lastMessage ?? "No messages"}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message preview area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-xl flex flex-col">
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Coming soon</h3>
              <p className="text-sm text-gray-500 max-w-sm">Internal team messaging is on its way. Create channels, share updates, and collaborate in real time.</p>
            </div>
          </div>
          {/* Input placeholder */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                disabled
                placeholder="Message will be available soon..."
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
              />
              <button disabled className="px-4 py-2 text-sm font-medium text-white bg-indigo-400 rounded-lg cursor-not-allowed opacity-50">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </ModuleLayoutShell>
  );
}
