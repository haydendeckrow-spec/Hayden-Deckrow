import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE_NAME = "senior_home_session";

const sessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: SESSION_COOKIE_NAME,
  cookieOptions: {
    // Local MVP runs over http, so secure cookies would block login.
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_SECURE_COOKIES === "true",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
};

// Reads/writes the encrypted session cookie for the current request.
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, sessionOptions);
}

export async function createUserSession(userId) {
  const session = await getSession();
  session.userId = userId;
  await session.save();
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}

// Loads the logged-in User record (or null) for use in Server Components
// and Server Actions. Also eagerly loads the linked Client for convenience.
export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: {
      client: { include: { subscriptionTier: true, owner: true } },
      clientLink: { include: { subscriptionTier: true, owner: true } },
    },
  });

  return user;
}

// Returns the Client record a user (client owner or family member) belongs to.
export function clientForUser(user) {
  if (!user) return null;
  return user.client ?? user.clientLink ?? null;
}

// Loads the current user and redirects to /login (or a role-appropriate
// home page) unless their role is in `allowedRoles`. Use at the top of
// Server Components/layouts that need to gate a route by role.
export async function requireUser(allowedRoles) {
  const user = await getCurrentUser();

  if (!user) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect(user.role === "ADMIN" ? "/admin" : "/client");
  }

  return user;
}
