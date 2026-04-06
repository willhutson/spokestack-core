"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/tasks`,
        },
      });
      if (authError) {
        setError(authError.message);
        setGoogleLoading(false);
      }
    } catch {
      setError("Google sign-in failed. Please try again.");
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      router.push("/tasks");
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div data-theme="obsidian" className="min-h-screen flex" style={{ backgroundColor: "#0a0a0a" }}>
      {/* Left panel — brand */}
      <div className="hidden lg:flex w-[580px] flex-col justify-center px-16 relative overflow-hidden" style={{ backgroundColor: "#0a0a0a" }}>
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(113,112,255,1) 59px, rgba(113,112,255,1) 60px), repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(113,112,255,1) 59px, rgba(113,112,255,1) 60px)",
          }}
        />

        <div className="relative z-10 max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div
              className="w-11 h-11 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: "#7170ff" }}
            >
              <span className="text-white text-lg font-bold" style={{ fontFamily: "'Inter', system-ui" }}>
                S
              </span>
            </div>
            <span
              className="text-2xl font-bold text-white"
              style={{ fontFamily: "'Inter', system-ui", letterSpacing: "-0.03em" }}
            >
              SpokeStack
            </span>
          </div>

          {/* Tagline */}
          <h1
            className="text-4xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'Inter', system-ui", letterSpacing: "-0.04em" }}
          >
            Agent-native business infrastructure
          </h1>
          <p className="text-base leading-relaxed mb-8" style={{ color: "#8a8f98" }}>
            Specialized AI agents that manage your tasks, projects, briefs, and
            orders — learning how your business works and getting smarter every
            week.
          </p>

          {/* Stats */}
          <div className="flex gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold" style={{ color: "#7170ff", fontFamily: "'Inter', system-ui", letterSpacing: "-0.03em" }}>
                4
              </span>
              <span className="text-xs" style={{ color: "#62666d" }}>
                Mode agents
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold" style={{ color: "#7170ff", fontFamily: "'Inter', system-ui", letterSpacing: "-0.03em" }}>
                14+
              </span>
              <span className="text-xs" style={{ color: "#62666d" }}>
                Marketplace modules
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-2xl font-bold" style={{ color: "#7170ff", fontFamily: "'Inter', system-ui", letterSpacing: "-0.03em" }}>
                5
              </span>
              <span className="text-xs" style={{ color: "#62666d" }}>
                Surfaces
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className="flex-1 flex flex-col justify-center items-center px-6 lg:px-16"
        style={{
          backgroundColor: "#0f1011",
          borderLeft: "1px solid rgba(113,112,255,0.08)",
        }}
      >
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: "#7170ff" }}>
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="text-xl font-bold text-white" style={{ letterSpacing: "-0.03em" }}>SpokeStack</span>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h2
                className="text-2xl font-bold text-white"
                style={{ fontFamily: "'Inter', system-ui", letterSpacing: "-0.04em" }}
              >
                Welcome back
              </h2>
              <p className="text-sm mt-1" style={{ color: "#62666d" }}>
                Sign in to your workspace
              </p>
            </div>

            {/* OAuth */}
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "#191a1b",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                {googleLoading ? "Redirecting..." : "Continue with Google"}
              </button>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
              <span className="text-xs" style={{ color: "#62666d" }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "rgba(255,255,255,0.06)" }} />
            </div>

            {/* Email form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-medium" style={{ color: "#8a8f98" }}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="w-full px-3.5 py-2.5 text-sm text-white rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "#191a1b",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between">
                  <label htmlFor="password" className="text-xs font-medium" style={{ color: "#8a8f98" }}>
                    Password
                  </label>
                  <span className="text-xs cursor-pointer" style={{ color: "#7170ff" }}>
                    Forgot?
                  </span>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full px-3.5 py-2.5 text-sm text-white rounded-lg outline-none transition-colors"
                  style={{
                    backgroundColor: "#191a1b",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                />
              </div>

              {error && (
                <p className="text-sm text-red-400 bg-red-950/50 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
                style={{
                  backgroundColor: "#7170ff",
                  color: "#ffffff",
                }}
              >
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-sm" style={{ color: "#62666d" }}>
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="font-medium"
                style={{ color: "#7170ff" }}
              >
                npx spokestack init
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
