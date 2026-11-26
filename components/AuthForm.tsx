"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<"form" | "guest" | null>(null);

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading("form");

    try {
      if (mode === "signup") {
        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });

        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(data?.error ?? "Could not create your account.");
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result || result.error) {
        throw new Error(
          mode === "signup"
            ? "Account created, but sign in failed. Try logging in."
            : "Invalid email or password."
        );
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  async function handleGuestLogin() {
    setError("");
    setLoading("guest");

    try {
      const result = await signIn("guest", { redirect: false });

      if (!result || result.error) {
        throw new Error("Could not start a guest session. Please try again.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(null);
    }
  }

  const isBusy = loading !== null;

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          {mode === "login"
            ? "Sign in to use live transcription."
            : "Sign up to start transcribing with your voice."}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-900/80 p-1">
        <button
          type="button"
          onClick={() => switchMode("login")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            mode === "login"
              ? "bg-white text-slate-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Log in
        </button>
        <button
          type="button"
          onClick={() => switchMode("signup")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition ${
            mode === "signup"
              ? "bg-white text-slate-900"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Sign up
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {mode === "signup" && (
          <label className="flex flex-col gap-1.5 text-sm text-slate-300">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={50}
              autoComplete="name"
              placeholder="Your name"
              className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
            />
          </label>
        )}

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            maxLength={128}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder={
              mode === "signup" ? "At least 8 characters" : "Your password"
            }
            className="rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2.5 text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
          />
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isBusy}
          className="mt-2 rounded-lg bg-indigo-500 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading === "form"
            ? "Please wait..."
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500">
        <span className="h-px flex-1 bg-white/10" />
        or
        <span className="h-px flex-1 bg-white/10" />
      </div>

      <button
        type="button"
        onClick={handleGuestLogin}
        disabled={isBusy}
        className="w-full rounded-lg border border-white/15 px-4 py-2.5 font-medium text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading === "guest" ? "Starting guest session..." : "Continue as guest"}
      </button>

      <p className="mt-4 text-center text-xs leading-5 text-slate-500">
        Guest transcripts are saved to your guest account. Sign up to keep your
        data on a permanent account.
      </p>
    </div>
  );
}
