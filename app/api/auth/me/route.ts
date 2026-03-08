import { NextRequest, NextResponse } from "next/server";
import { lucia } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies(); // Await cookies
    const sessionCookie = cookieStore.get(lucia.sessionCookieName);

    if (!sessionCookie) {
      return NextResponse.json({ user: null });
    }

    const session = await lucia.validateSession(sessionCookie.value);

    if (!session || !session.session || !session.session.userId) {
      console.error("Invalid session or missing userId:", session);
      return NextResponse.json({ user: null });
    }

    const userId = session.session.userId; // Correctly accessing userId

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.error("User not found:", userId);
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({
      user: {
        email: user.email,
        name: user.name,
        picture: user.picture || null,
      },
    });
  } catch (error: any) {
    console.error("Auth Check Error:", error.message, error.stack);
    return NextResponse.json({ user: null });
  }
}
