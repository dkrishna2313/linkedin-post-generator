import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "queued",
    message: "Import preview endpoint stubbed for CSV and HTML processing."
  });
}
