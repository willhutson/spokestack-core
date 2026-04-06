"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { LmsNav } from "../LmsNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";

interface Enrollment {
  id: string;
  key: string;
  value: {
    courseId: string;
    courseName: string;
    learnerName: string;
    status: string;
    progress: number;
    score: number | null;
    enrolledAt: string;
    completedAt: string | null;
    lastAccessed?: string;
    estimatedRemaining?: string;
  };
}

export default function MyLearningPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch("/api/v1/lms/enrollments", { headers });
        const data = await res.json();
        setEnrollments(data.entries || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const inProgress = enrollments.filter((e) => e.value?.status === "IN_PROGRESS");
  const completed = enrollments.filter((e) => e.value?.status === "COMPLETED");

  const totalCompleted = completed.length;
  const totalHours = enrollments.length * 2; // placeholder estimate
  const streak = Math.min(totalCompleted, 7); // placeholder

  const recommended = [
    { title: "Leadership Fundamentals", level: "INTERMEDIATE", duration: "4h", reason: "Based on your role" },
    { title: "Effective Communication", level: "BEGINNER", duration: "2h", reason: "Popular in your department" },
    { title: "Data-Driven Decision Making", level: "ADVANCED", duration: "6h", reason: "Trending this month" },
  ];

  return (
    <ModuleLayoutShell moduleType="LMS">
      <div className="p-6">
        <LmsNav />
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900">My Learning</h1>
          <p className="text-sm text-gray-500">Track your learning progress and achievements.</p>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Courses Completed</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalCompleted}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">In Progress</p>
            <p className="text-2xl font-bold text-indigo-600 mt-1">{inProgress.length}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Hours Logged</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{totalHours}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm text-gray-500">Current Streak</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{streak} days</p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">In Progress</h2>
              {inProgress.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No courses in progress. Browse the course catalog to get started.</p>
              ) : (
                <div className="space-y-4">
                  {inProgress.map((enrollment) => {
                    const v = enrollment.value;
                    return (
                      <div key={enrollment.id} className="border border-gray-100 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-gray-900">{v.courseName || enrollment.key}</h3>
                          <span className="text-xs text-gray-500">{v.progress || 0}% complete</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className="bg-indigo-500 h-2 rounded-full transition-all"
                            style={{ width: `${v.progress || 0}%` }}
                          />
                        </div>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>Last accessed: {v.lastAccessed ? new Date(v.lastAccessed).toLocaleDateString() : "N/A"}</span>
                          <span>Est. remaining: {v.estimatedRemaining || "N/A"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Completed</h2>
              {completed.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No completed courses yet.</p>
              ) : (
                <div className="space-y-3">
                  {completed.map((enrollment) => {
                    const v = enrollment.value;
                    return (
                      <div key={enrollment.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{v.courseName || enrollment.key}</h3>
                          <p className="text-xs text-gray-500">
                            Completed {v.completedAt ? new Date(v.completedAt).toLocaleDateString() : "N/A"}
                            {v.score !== null && ` | Score: ${v.score}%`}
                          </p>
                        </div>
                        <button className="text-xs text-indigo-600 hover:text-indigo-700">
                          View Certificate
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Recommended for You</h2>
              <div className="grid grid-cols-3 gap-4">
                {recommended.map((course) => (
                  <div key={course.title} className="border border-gray-100 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-900">{course.title}</h3>
                    <div className="flex gap-2 mt-2">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-medium",
                        course.level === "BEGINNER" ? "bg-green-100 text-green-700" :
                        course.level === "INTERMEDIATE" ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      )}>
                        {course.level}
                      </span>
                      <span className="text-xs text-gray-500">{course.duration}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{course.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
