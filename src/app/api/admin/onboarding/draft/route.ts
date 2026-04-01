import { NextRequest } from "next/server";
import { authenticate } from "@/lib/auth";
import { json, unauthorized } from "@/lib/api";

// Drafts are managed client-side via localStorage.
// These endpoints exist for API completeness but just return success.

export async function GET(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  return json({ draft: null, message: "Drafts are stored client-side" });
}

export async function POST(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  return json({ success: true, message: "Draft saved client-side" });
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticate(req);
  if (!auth) return unauthorized();

  return json({ success: true, message: "Draft cleared client-side" });
}
