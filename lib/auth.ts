import { Lucia } from "lucia";
import { PrismaAdapter } from "@lucia-auth/adapter-prisma";
import { prisma } from "./prisma";
import { cookies } from "next/headers";

const adapter = new PrismaAdapter(prisma.session, prisma.user);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
    },
  },
  getUserAttributes: (attributes) => ({
    id: attributes.id,
    googleId: attributes.googleId,
    name: attributes.name,
    email: attributes.email,
    picture: attributes.picture,
    isArtist: attributes.isArtist,
    userName: attributes.userName,
  }),
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      id: string;
      googleId: string | null;
      name: string | null;
      email: string;
      picture: string | null;
      isArtist: boolean;
      userName: string | null;
    };
  }
}

/**
 * Get current session and user from cookies
 * Used in API routes for authentication
 */
export async function getCurrentSession() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(lucia.sessionCookieName);

  if (!sessionCookie) {
    return { user: null, session: null };
  }

  const result = await lucia.validateSession(sessionCookie.value);

  if (!result || !result.session || !result.session.userId) {
    return { user: null, session: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: result.session.userId },
  });

  return { user, session: result.session };
}
