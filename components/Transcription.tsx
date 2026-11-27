"use client";

import { useRef, useState } from "react";
import { GoogleGenAI, Modality } from "@google/genai";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { AudioStreamer } from "@/lib/audio";

type TranscriptionUser = {
  name: string | null;
  email: string | null;
  isGuest: boolean;
};

type SavedConversation = {
  id: string;
  content: string;
  createdAt: string;
};

type SaveState = "idle" | "saving" | "saved" | "error";

type TranscriptLanguage = "original" | "english" | "hindi";

function languageButtonClass(active: boolean) {
  return `rounded-md px-2.5 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
    active
      ? "bg-emerald-500/20 text-emerald-300"
      : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
  }`;
}

function formatDate(value: string) {
  return `${new Date(value).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export default function Transcription({
  user,
  conversations,
}: {
  user: TranscriptionUser;
  conversations: SavedConversation[];
}) {
  const router = useRouter();

  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState("");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [viewLanguage, setViewLanguage] =
    useState<TranscriptLanguage>("original");
  const [translation, setTranslation] = useState("");
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState("");

  const sessionRef = useRef<{ close: () => void } | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const translationRequestRef = useRef(0);

  function showOriginal() {
    translationRequestRef.current += 1;
    setViewLanguage("original");
    setTranslation("");
    setTranslationError("");
    setIsTranslating(false);
  }

  async function translateTranscript(
    target: Exclude<TranscriptLanguage, "original">
  ) {
    const text = `${transcript}${interimText}`.trim();

    if (!text) {
      return;
    }

    const requestId = translationRequestRef.current + 1;
    translationRequestRef.current = requestId;

    setViewLanguage(target);
    setTranslation("");
    setTranslationError("");
    setIsTranslating(true);

    try {
      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, target }),
      });

      if (response.status === 401) {
        await signOut({ callbackUrl: "/login" });
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not translate the transcript.");
      }

      if (translationRequestRef.current !== requestId) {
        return;
      }

      if (typeof data?.translation !== "string" || !data.translation.trim()) {
        throw new Error("Could not translate the transcript.");
      }

      setTranslation(data.translation);
    } catch (err) {
      if (translationRequestRef.current !== requestId) {
        return;
      }

      setViewLanguage("original");
      setTranslationError(
        err instanceof Error
          ? err.message
          : "Could not translate the transcript."
      );
    } finally {
      if (translationRequestRef.current === requestId) {
        setIsTranslating(false);
      }
    }
  }

  // Translations are view-only. This always saves the original microphone text.
  async function saveTranscript(text: string) {
    setSaveState("saving");
    setSaveMessage("Saving to your account...");

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (response.status === 401) {
        await signOut({ callbackUrl: "/login" });
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not save the transcript.");
      }

      setSaveState("saved");
      setSaveMessage("Saved to your account.");
      router.refresh();
    } catch (err) {
      setSaveState("error");
      setSaveMessage(
        err instanceof Error ? err.message : "Could not save the transcript."
      );
    }
  }

  async function deleteConversation(id: string) {
    setDeletingId(id);
    setDeleteError("");

    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        await signOut({ callbackUrl: "/login" });
        return;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? "Could not delete the transcript.");
      }

      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Could not delete the transcript."
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function startRecording() {
    try {
      setIsStarting(true);
      setError("");
      setStatus("Getting token...");
      setTranscript("");
      setInterimText("");
      setSaveState("idle");
      setSaveMessage("");
      showOriginal();

      // 1. Get ephemeral token from our backend
      const tokenResponse = await fetch("/api/gemini-token", {
        method: "POST",
      });

      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        throw new Error(
          typeof tokenData.error === "string"
            ? tokenData.error
            : JSON.stringify(tokenData.error)
        );
      }

      // 2. Connect using v1alpha
      const ai = new GoogleGenAI({
        apiKey: tokenData.token,
        httpOptions: {
          apiVersion: "v1alpha",
        },
      });

      setStatus("Connecting to Gemini...");

      const session = await ai.live.connect({
        model: "gemini-3.5-transcribe-live",
        config: {
          responseModalities: [Modality.TEXT],
          inputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message) => {
            const content = message.serverContent;

            // Final transcription
            if (content?.inputTranscription?.text) {
              const text = content.inputTranscription.text;

              setTranscript((prev) => prev + text);
              setInterimText("");
            }

            // Temporary transcription
            if (content?.interimInputTranscription?.text) {
              setInterimText(content.interimInputTranscription.text);
            }
          },

          onerror: (event) => {
            console.error("Gemini Live error:", event);
            setError("Gemini connection error");
            setStatus("Error");
          },

          onclose: (event) => {
            console.log("Gemini connection closed:", event);
            setStatus("Disconnected");
            setIsRecording(false);
          },
        },
      });

      sessionRef.current = session;

      // 3. Start microphone
      setStatus("Starting microphone...");

      const streamer = new AudioStreamer();
      streamerRef.current = streamer;

      await streamer.start((base64Audio) => {
        session.sendRealtimeInput({
          audio: {
            data: base64Audio,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      });

      setIsRecording(true);
      setStatus("Listening...");
    } catch (err) {
      console.error("Start recording error:", err);

      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );

      setStatus("Error");

      await streamerRef.current?.stop();
      streamerRef.current = null;

      sessionRef.current?.close();
      sessionRef.current = null;

      setIsRecording(false);
    } finally {
      setIsStarting(false);
    }
  }

  async function stopRecording() {
    setStatus("Stopping...");

    await streamerRef.current?.stop();
    streamerRef.current = null;

    sessionRef.current?.close();
    sessionRef.current = null;

    const text = `${transcript}${interimText}`.trim();

    setIsRecording(false);
    setInterimText("");
    setStatus("Stopped");

    if (text) {
      await saveTranscript(text);
    }
  }

  async function handleSignOut() {
    await streamerRef.current?.stop();
    streamerRef.current = null;

    sessionRef.current?.close();
    sessionRef.current = null;

    await signOut({ callbackUrl: "/login" });
  }

  const savedText = `${transcript}${interimText}`.trim();

  return (
    <div className="flex min-h-screen flex-col items-center gap-8 bg-[#0b1020] px-4 py-8 text-slate-100">
      <header className="flex w-full max-w-2xl items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            {user.isGuest ? "Guest account" : "Signed in as"}
          </p>
          <p className="truncate font-semibold text-white">
            {user.name ?? user.email}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {user.isGuest && (
            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              Guest
            </span>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-300 transition hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Recording button */}
      <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isStarting}
        className={`flex items-center gap-2 rounded-full px-8 py-4 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
          isRecording
            ? "bg-red-600 hover:bg-red-700"
            : "bg-emerald-600 hover:bg-emerald-500"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full bg-white ${
            isRecording ? "animate-pulse" : ""
          }`}
        />
        {isStarting
          ? "Starting..."
          : isRecording
            ? "Stop Recording"
            : "Start Recording"}
      </button>

      {/* Status */}
      <p className="text-sm text-slate-400">{status}</p>

      {/* Transcription */}
      <div className="min-h-64 w-full max-w-2xl rounded-xl border border-white/10 bg-white/[0.03] p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Live Transcription</h2>
            {isRecording && (
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-red-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                Recording
              </span>
            )}
          </div>

          <div
            role="group"
            aria-label="Transcript language"
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1"
          >
            <button
              type="button"
              onClick={showOriginal}
              aria-pressed={viewLanguage === "original"}
              className={languageButtonClass(viewLanguage === "original")}
            >
              Original
            </button>
            <button
              type="button"
              onClick={() => translateTranscript("english")}
              disabled={!savedText}
              aria-pressed={viewLanguage === "english"}
              className={languageButtonClass(viewLanguage === "english")}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => translateTranscript("hindi")}
              disabled={!savedText}
              aria-pressed={viewLanguage === "hindi"}
              className={languageButtonClass(viewLanguage === "hindi")}
            >
              Hindi
            </button>
          </div>
        </div>

        {viewLanguage !== "original" ? (
          isTranslating ? (
            <p className="text-slate-500">Translating...</p>
          ) : (
            <p className="whitespace-pre-wrap leading-7">{translation}</p>
          )
        ) : (
          <>
            <p className="whitespace-pre-wrap leading-7">
              {transcript}
              <span className="text-slate-500">{interimText}</span>
            </p>

            {!transcript && !interimText && (
              <p className="text-slate-500">
                Your speech will appear here...
              </p>
            )}
          </>
        )}

        {viewLanguage !== "original" && !isTranslating && translation && (
          <p className="mt-3 text-xs text-slate-500">
            Translation is view-only. Your saved transcript keeps the original
            words.
          </p>
        )}

        {translationError && (
          <p className="mt-3 text-sm text-red-400">{translationError}</p>
        )}

        {saveMessage && (
          <p
            className={`mt-4 text-sm ${
              saveState === "error" ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {saveMessage}
          </p>
        )}

        {saveState === "error" && savedText && (
          <button
            type="button"
            onClick={() => saveTranscript(savedText)}
            className="mt-2 rounded-lg border border-white/15 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-white/5"
          >
            Retry save
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-red-400">{error}</p>}

      {/* Saved transcripts */}
      {conversations.length > 0 && (
        <section className="w-full max-w-2xl">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Saved transcripts
          </h2>

          <ul className="flex flex-col gap-3">
            {conversations.map((conversation) => (
              <li
                key={conversation.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">
                    {formatDate(conversation.createdAt)}
                  </p>
                  <button
                    type="button"
                    onClick={() => deleteConversation(conversation.id)}
                    disabled={deletingId === conversation.id}
                    className="rounded-md border border-red-400/20 px-2.5 py-1 text-xs font-medium text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deletingId === conversation.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
                  {conversation.content}
                </p>
              </li>
            ))}
          </ul>

          {deleteError && (
            <p className="mt-3 text-sm text-red-400">{deleteError}</p>
          )}
        </section>
      )}
    </div>
  );
}
