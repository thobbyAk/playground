import { randomUUID } from "crypto";

interface Session {
  accessToken: string;
  refreshToken: string;
}

// In-memory on purpose: there's exactly one bff container right now. If this
// ever runs as multiple replicas (e.g. in Kubernetes), this needs to move to
// a shared store like Redis so every replica sees the same sessions.
const sessions = new Map<string, Session>();

export function createSession(accessToken: string, refreshToken: string): string {
  const sessionId = randomUUID();
  sessions.set(sessionId, { accessToken, refreshToken });
  return sessionId;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function updateAccessToken(sessionId: string, accessToken: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.accessToken = accessToken;
  }
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}
