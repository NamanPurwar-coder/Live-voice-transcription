import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";

const MAX_TEXT_LENGTH = 50_000;

const TARGET_LANGUAGES = {
  english: {
    name: "English",
    instruction:
      "Translate the transcript into natural, fluent English. Keep any parts that are already in English.",
  },
  hindi: {
    name: "Hindi",
    instruction:
      "Translate the transcript into natural, fluent Hindi written in Devanagari script. Keep any parts that are already in Hindi.",
  },
} as const;

type TargetLanguage = keyof typeof TARGET_LANGUAGES;

function isTargetLanguage(value: unknown): value is TargetLanguage {
  return value === "english" || value === "hindi";
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is missing." },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const target = body.target;

    if (!text) {
      return NextResponse.json(
        { error: "There is no transcript to translate." },
        { status: 400 }
      );
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: "Transcript is too long to translate." },
        { status: 400 }
      );
    }

    if (!isTargetLanguage(target)) {
      return NextResponse.json(
        { error: "Unsupported translation language." },
        { status: 400 }
      );
    }

    const language = TARGET_LANGUAGES[target];

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "v1beta",
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: text,
      config: {
        temperature: 0.1,
        systemInstruction: [
          `You are a professional translator. ${language.instruction}`,
          "Preserve names, numbers, meaning, and line breaks.",
          `Return only the ${language.name} translation as plain text.`,
          "Do not add explanations, labels, notes, or quotation marks.",
        ].join(" "),
      },
    });

    const translation = response.text?.trim();

    if (!translation) {
      throw new Error("Gemini returned an empty translation.");
    }

    return NextResponse.json({ translation });
  } catch (error) {
    console.error("Translate transcript error:", error);

    return NextResponse.json(
      { error: "Could not translate the transcript." },
      { status: 500 }
    );
  }
}
