"use client";

import { useState } from "react";
import { openChatWithContext } from "@/lib/chat-event";

export default function LMSPage() {
  const [activeTab, setActiveTab] = useState<"courses" | "enrollments">("courses");

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">LMS</h1>
          <p className="text-sm text-gray-500">Courses, training modules, and team skill development.</p>
        </div>
        <button
          onClick={() => openChatWithContext("Help me create a training course for my team")}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
          New Course
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {(["courses", "enrollments"] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? "bg-indigo-50 text-indigo-700" : "text-gray-600 hover:bg-gray-100"}`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Courses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Enrollments</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">—</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        {activeTab === "courses" ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342" /></svg>
            </div>
            <p className="text-sm text-gray-500 mb-3">No courses created yet.</p>
            <button onClick={() => openChatWithContext("Help me design a training course")} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Create your first course with the LMS Agent
            </button>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No enrollments yet. Create a course first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
