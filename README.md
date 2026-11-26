# 🎙️ Live Speech Transcription

> Real-time speech transcription in the browser using **Next.js**, **TypeScript**, and the **Gemini Live API**.

Speak into your microphone and watch your words appear as the application receives live transcription updates.

---

## ✨ Features

- 🎤 **Live microphone capture** — capture audio directly from your browser.
- ⚡ **Real-time transcription** — display speech as it is transcribed.
- 🔄 **Interim and final text** — show temporary transcription updates and finalized text.
- 🔐 **Ephemeral API tokens** — create short-lived connection tokens through a server-side API route instead of exposing your main API key in the browser.
- 🛑 **Recording controls** — start and stop recording with a simple button.
- 🧩 **Simple project structure** — keep audio capture, UI, and token generation separate.

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| [Next.js](https://nextjs.org/) | Application framework |
| [React](https://react.dev/) | User interface |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Google Gemini Live API](https://ai.google.dev/) | Live audio transcription |
| [`@google/genai`](https://www.npmjs.com/package/@google/genai) | Gemini SDK |
| [Tailwind CSS](https://tailwindcss.com/) | UI styling |

---

## 🧠 How It Works

1. Click **Start Recording** and grant microphone access.
2. The app requests an ephemeral Gemini token from its Next.js backend.
3. The browser connects to Gemini Live using the token.
4. Microphone audio is captured and converted into audio chunks.
5. Audio chunks are sent through the live connection.
6. Transcription updates are displayed in the interface.
7. Click **Stop Recording** to stop audio capture and close the session.

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/NamanPurwar-coder/Live-voice-transcription
cd live-voice-transcription
```

### 2. Install dependencies

```bash
npm install
```

Install the Gemini SDK if it isn't already installed:

```bash
npm install @google/genai
```

### 3. Configure your API key

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

> ⚠️ Never commit your `.env.local` file or expose your API key in client-side code.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔒 Security

This project uses a server-side endpoint to generate ephemeral tokens for the Live API connection. The primary Gemini API key should remain on the server and must never be exposed to the browser.

- Keep `.env.local` private.
- Do not commit API keys.
- Use ephemeral tokens for browser connections where supported.
- Review token expiry and usage restrictions before deploying.

---

## 🗺️ Roadmap

- [ ] Improve audio processing and chunk handling.
- [ ] Add a cleaner, responsive transcription UI.
- [ ] Add transcript copy and export options.
- [ ] Add transcription history.
- [ ] Add language selection, where supported.
- [ ] Improve connection and microphone error handling.

---

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome!

1. Fork the repository.
2. Create a branch for your change.
3. Commit your changes.
4. Open a pull request.

---



---


  Built with ❤️ using Next.js and Gemini Live

