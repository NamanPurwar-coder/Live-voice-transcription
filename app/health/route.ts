import { connection, NextResponse } from "next/server";

export async function GET() {
  await connection();

  return NextResponse.json(
    {
      status: "ok",
      time: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
