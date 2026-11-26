
import { GoogleGenAI, Modality } from "@google/genai";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/current-user";

export async function POST() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Sign in to use the microphone." },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "v1beta",
      },
    });

    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(
          Date.now() + 30 * 60 * 1000
        ).toISOString(),
        liveConnectConstraints: {
          model: "gemini-3.5-transcribe-live",
          config: {
            responseModalities: [Modality.TEXT],
            inputAudioTranscription: {},
          },
        },
      },
    });

    return NextResponse.json({
      token: token.name,
    });
  } catch (error) {
    console.error("Token generation error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create token",
      },
      { status: 500 }
    );
  }
}
