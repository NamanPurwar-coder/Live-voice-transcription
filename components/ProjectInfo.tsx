const STACK = [
  "Next.js 16 App Router",
  "NextAuth: email/password + guest",
  "Prisma ORM + Neon PostgreSQL",
  "Google Gemini Live API",
  "Web Audio API + Tailwind CSS",
];

const FLOW = ["Voice", "Gemini API", "Live text", "Stop mic", "Save to DB"];

export default function ProjectInfo() {
  return (
    <section className="max-w-xl text-slate-300">
      <span className="inline-flex rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-indigo-300">
        Assignment project
      </span>

      <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        Live voice transcription, saved to your account.
      </h1>

      <p className="mt-4 text-sm leading-6 text-slate-400">
        Speak into the mic and watch your words appear in real time. Every
        completed transcript is stored in PostgreSQL for the signed-in user or
        guest account.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {STACK.map((item) => (
          <span
            key={item}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300"
          >
            {item}
          </span>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Pipeline
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium">
          {FLOW.map((step, index) => (
            <span key={step} className="flex items-center gap-2">
              <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-200">
                {step}
              </span>
              {index < FLOW.length - 1 && (
                <span className="text-slate-600">→</span>
              )}
            </span>
          ))}
        </div>

        <p className="mt-3 text-xs leading-5 text-slate-500">
          Mic audio is streamed as 16 kHz PCM through the Gemini Live API using
          a short-lived token created on the server.
        </p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Gemini model
          </p>
          <p className="mt-2 font-mono text-sm text-white">
            gemini-3.5-transcribe-live
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Google Gen AI SDK · Live API · v1alpha
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Storage
          </p>
          <p className="mt-2 text-sm text-white">Prisma + PostgreSQL</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Users, hashed passwords and transcripts persist in the database.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Planned updates
        </p>
        <ul className="mt-2 flex flex-wrap gap-2 text-xs">
          <li className="rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-300">
            Share transcript
          </li>
          <li className="rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-300">
            Grammar check
          </li>
          <li className="rounded-full bg-indigo-500/10 px-3 py-1 text-indigo-300">
            Transcript search
          </li>
        </ul>
      </div>
    </section>
  );
}
