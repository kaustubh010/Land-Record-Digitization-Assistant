import { NextRequest, NextResponse } from "next/server";
import { lucia } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies(); // ⬅️ await it!
    const sessionCookie = cookieStore.get(lucia.sessionCookieName);

    if (!sessionCookie) return NextResponse.json({ success: true });

    await lucia.invalidateSession(sessionCookie.value);

    const response = NextResponse.json({ success: true });
    response.cookies.delete(lucia.sessionCookieName); // Optional: this line doesn't actually delete the cookie on client

    return response;

  } catch (error) {
    console.error("Logout Error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
