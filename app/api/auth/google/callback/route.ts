import { google } from "@/lib/oauth";
import { cookies } from "next/headers";
import { lucia } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateId } from "lucia";
import { decodeIdToken, type OAuth2Tokens } from "arctic";

export async function GET(request: Request): Promise<Response> {

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const cookieStore = await cookies();
    const storedState = cookieStore.get("google_oauth_state")?.value ?? null;
    const codeVerifier = cookieStore.get("google_code_verifier")?.value ?? null;

    if (
      code === null ||
      state === null ||
      storedState === null ||
      codeVerifier === null
    ) {
      return new Response("Please restart the process.", {
        status: 400,
      });
    }

    if (state !== storedState) {
      return new Response("Please restart the process.", {
        status: 400,
      });
    }

    let tokens: OAuth2Tokens;
    try {
      tokens = await google.validateAuthorizationCode(code, codeVerifier);
    } catch {
      return new Response("Please restart the process.", {
        status: 400,
      });
    }

    const claims = decodeIdToken(tokens.idToken()) as any;

    const googleId = claims.sub as string;
    const name = claims.name as string;
    const picture = claims.picture as string;
    const email = claims.email as string;

    // Validate required fields
    if (!googleId || !email) {
      return new Response("Invalid Google account information.", {
        status: 400,
      });
    }

    // Check if user exists with this Google ID
    const existingUser = await prisma.user.findUnique({
      where: { googleId },
    });

    let userId: string;

    if (existingUser) {
      userId = existingUser.id;
    } else {
      // Check if user exists with this email
      const existingEmailUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmailUser) {
        // Link Google account to existing email user
        await prisma.user.update({
          where: { id: existingEmailUser.id },
          data: {
            googleId,
            name: name || existingEmailUser.name,
            picture: picture || existingEmailUser.picture
          },
        });
        userId = existingEmailUser.id;
      } else {
        // Create new user
        const newUser = await prisma.user.create({
          data: {
            id: generateId(15),
            googleId,
            email,
            name,
            picture,
            hashedPassword: "", // Google users don't need a password
          },
        });
        userId = newUser.id;
      }
    }

    // Create Lucia session
    const session = await lucia.createSession(userId, {});
    const sessionCookie = lucia.createSessionCookie(session.id);

    // Clear OAuth cookies
    const response = new Response(null, {
      status: 302,
      headers: {
        Location: "/",
      },
    });

    response.headers.append("Set-Cookie", sessionCookie.serialize());
    response.headers.append(
      "Set-Cookie",
      "google_oauth_state=; Max-Age=0; Path=/; HttpOnly; SameSite=lax"
    );
    response.headers.append(
      "Set-Cookie",
      "google_code_verifier=; Max-Age=0; Path=/; HttpOnly; SameSite=lax"
    );

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return new Response("Authentication failed. Please try again.", {
      status: 500,
    });
  }
}
