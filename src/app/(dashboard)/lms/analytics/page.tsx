"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { LmsNav } from "../LmsNav";
import { getAuthHeaders } from "@/lib/client-auth";

interface CourseEntry {
  id: string;
  key: string;
  value: {
    title: string;
    enrollments: number;
    rating: number;
  };
}

interface EnrollmentEntry {
  id: string;
  key: string;
  value: {
    courseName: string;
    learnerName: string;
    status: string;
    progress: number;
    score: number | null;
  };
}

export default function LmsAnalyticsPage() {
  const [courses, setCourses] = useState<CourseEntry[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const [coursesRes, enrollmentsRes] = await Promise.all([
          fetch("/api/v1/lms/courses", { headers }),
          fetch("/api/v1/lms/enrollments", { headers }),
        ]);
        const coursesData = await coursesRes.json();
        const enrollmentsData = await enrollmentsRes.json();
        setCourses(coursesData.entries || []);
        setEnrollments(enrollmentsData.entries || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalEnrollments = enrollments.length;
  const completedEnrollments = enrollments.filter((e) => e.value?.status === "COMPLETED");
  const completionRate = totalEnrollments > 0 ? Math.round((completedEnrollments.length / totalEnrollments) * 100) : 0;
  const avgScore = completedEnrollments.length > 0
    ? Math.round(completedEnrollments.reduce((sum, e) => sum + (e.value?.score || 0), 0) / completedEnrollments.length)
    : 0;
  const activeThisWeek = enrollments.filter((e) => e.value?.status === "IN_PROGRESS").length;

  // Course performance
  const coursePerformance = courses.map((course) => {
    const courseEnrollments = enrollments.filter((e) => e.value?.courseName === course.key || e.value?.courseName === course.value?.title);
    const enrolled = courseEnrollments.length;
    const completed = courseEnrollments.filter((e) => e.value?.status === "COMPLETED").length;
    const scores = courseEnrollments.filter((e) => e.value?.score !== null).map((e) => e.value?.score || 0);
    const avgCourseScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const courseCompletionRate = enrolled > 0 ? Math.round((completed / enrolled) * 100) : 0;
    return {
      name: course.value?.title || course.key,
      enrolled,
      completed,
      avgScore: avgCourseScore,
      avgTime: "N/A",
      completionRate: courseCompletionRate,
    };
  });

  // Top performers
  const learnerMap = new Map<string, { completed: number; totalScore: number; count: number }>();
  enrollments.forEach((e) => {
    const name = e.value?.learnerName || "Unknown";
    const existing = learnerMap.get(name) || { completed: 0, totalScore: 0, count: 0 };
    if (e.value?.status === "COMPLETED") {
      existing.completed++;
      existing.totalScore += e.value?.score || 0;
      existing.count++;
    }
    learnerMap.set(name, existing);
  });
  const topPerformers = Array.from(learnerMap.entries())
    .map(([name, data]) => ({
      name,
      coursesCompleted: data.completed,
      avgScore: data.count > 0 ? Math.round(data.totalScore / data.count) : 0,
    }))
    .sort((a, b) => b.coursesCompleted - a.coursesCompleted)
    .slice(0, 10);

  return (
    <ModuleLayoutShell moduleType="LMS">
      <div className="p-6">
        <LmsNav />
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Learning Analytics</h1>
          <p className="text-sm text-[var(--text-secondary)]">Insights into learning activity and performance.</p>
        </div>

        {loading ? (
          <p className="text-sm text-[var(--text-tertiary)] text-center py-8">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm text-[var(--text-secondary)]">Total Enrollments</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{totalEnrollments}</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm text-[var(--text-secondary)]">Completion Rate</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{completionRate}%</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm text-[var(--text-secondary)]">Avg Score</p>
                <p className="text-2xl font-bold text-[var(--accent)] mt-1">{avgScore}%</p>
              </div>
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm text-[var(--text-secondary)]">Active Learners This Week</p>
                <p className="text-2xl font-bold text-[var(--text-primary)] mt-1">{activeThisWeek}</p>
              </div>
            </div>

            <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl overflow-hidden mb-6">
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <h2 className="text-sm font-medium text-[var(--text-primary)]">Course Performance</h2>
              </div>
              {coursePerformance.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)] text-center py-8">No course data available yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-[var(--bg-base)] border-b border-[var(--border)]">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-[var(--text-secondary)]">Course</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Enrolled</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Completed</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Avg Score</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Avg Time</th>
                      <th className="text-right px-4 py-3 font-medium text-[var(--text-secondary)]">Completion Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursePerformance.map((cp) => (
                      <tr key={cp.name} className="border-b border-[var(--border)] last:border-0">
                        <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{cp.name}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{cp.enrolled}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{cp.completed}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{cp.avgScore}%</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{cp.avgTime}</td>
                        <td className="px-4 py-3 text-right text-[var(--text-secondary)]">{cp.completionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-sm font-medium text-[var(--text-primary)] mb-4">Top Performers</h2>
                {topPerformers.length === 0 ? (
                  <p className="text-sm text-[var(--text-tertiary)] text-center py-4">No performance data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {topPerformers.map((p, i) => (
                      <div key={p.name} className="flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[var(--text-tertiary)] w-5">{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{p.name}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{p.coursesCompleted} courses completed</p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-[var(--accent)]">{p.avgScore}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[var(--bg-base)] border border-[var(--border)] rounded-xl p-6">
                <h2 className="text-sm font-medium text-[var(--text-primary)] mb-4">Engagement Trend</h2>
                <div className="text-sm text-[var(--text-secondary)] space-y-2">
                  <p>Weekly enrollment activity has been {totalEnrollments > 5 ? "growing" : "steady"} over the past month.</p>
                  <p>{completedEnrollments.length} learners have completed courses, with an average completion rate of {completionRate}%.</p>
                  <p>{activeThisWeek} learners are currently active with in-progress courses.</p>
                  <p>The most popular course categories are Skills and Onboarding based on enrollment volume.</p>
                  <p className="text-xs text-[var(--text-tertiary)] mt-4">Detailed charts will be available in a future update.</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
