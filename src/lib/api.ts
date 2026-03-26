import { NextResponse } from "next/server";

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function unauthorized() {
  return error("Unauthorized", 401);
}

export function forbidden(message = "Forbidden") {
  return error(message, 403);
}
