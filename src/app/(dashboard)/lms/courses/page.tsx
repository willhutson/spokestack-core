"use client";

import { useState, useEffect } from "react";
import { ModuleLayoutShell } from "@/components/module/ModuleLayoutShell";
import { LmsNav } from "../LmsNav";
import { getAuthHeaders } from "@/lib/client-auth";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Course {
  id: string;
  key: string;
  value: {
    title: string;
    description: string;
    courseCategory: string;
    level: string;
    duration: string;
    instructor: string;
    modules: unknown[];
    status: string;
    enrollments: number;
    rating: number;
  };
  createdAt: string;
}

const LEVELS = ["BEGINNER", "INTERMEDIATE", "ADVANCED"];
const CATEGORIES = ["Onboarding", "Skills", "Compliance", "Leadership"];

const levelColors: Record<string, string> = {
  BEGINNER: "bg-green-100 text-green-700",
  INTERMEDIATE: "bg-yellow-100 text-yellow-700",
  ADVANCED: "bg-red-100 text-red-700",
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (filterLevel) params.set("level", filterLevel);
        if (filterCategory) params.set("category", filterCategory);
        const res = await fetch(`/api/v1/lms/courses?${params}`, { headers });
        const data = await res.json();
        setCourses(data.entries || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [search, filterLevel, filterCategory]);

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={cn("text-sm", i <= rating ? "text-yellow-400" : "text-gray-300")}>
          ★
        </span>
      );
    }
    return <div className="flex">{stars}</div>;
  };

  return (
    <ModuleLayoutShell moduleType="LMS">
      <div className="p-6">
        <LmsNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Course Catalog</h1>
            <p className="text-sm text-gray-500">Browse and enroll in available courses.</p>
          </div>
          <Link
            href="/lms/create"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            New Course
          </Link>
        </div>

        <div className="flex gap-3 mb-4">
          <input
            placeholder="Search courses..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-64"
          />
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Levels</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>
            ))}
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading...</p>
        ) : courses.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <p className="text-sm text-gray-500">No courses found. Create your first course.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            {courses.map((course) => {
              const v = course.value;
              return (
                <div key={course.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-300 transition-all">
                  <div className="h-32 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <h3 className="text-sm font-medium text-gray-900 flex-1">{v.title}</h3>
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium ml-2 shrink-0", levelColors[v.level] || "bg-gray-100 text-gray-600")}>
                        {v.level}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{v.instructor || "No instructor"}</p>
                    <p className="text-xs text-gray-400 mt-1">{v.description?.slice(0, 80) || "No description"}</p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{v.duration || "N/A"}</span>
                        <span>{(v.modules || []).length} modules</span>
                        <span>{v.enrollments || 0} enrolled</span>
                      </div>
                    </div>
                    <div className="mt-2">{renderStars(v.rating || 0)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </ModuleLayoutShell>
  );
}
