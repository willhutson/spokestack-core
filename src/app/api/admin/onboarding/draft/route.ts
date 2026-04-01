import { NextResponse } from "next/server";

// Drafts are managed client-side via localStorage.
// These endpoints exist for API completeness but just return success.

export async function GET() {
  return NextResponse.json({ draft: null, message: "Drafts are stored client-side" });
}

export async function POST() {
  return NextResponse.json({ success: true, message: "Draft saved client-side" });
}

export async function DELETE() {
  return NextResponse.json({ success: true, message: "Draft cleared client-side" });
}
