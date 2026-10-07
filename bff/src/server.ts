import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { createSession, getSession, updateAccessToken, deleteSession } from "./sessionStore";

dotenv.config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 4001;
const BACKEND_URL = process.env.BACKEND_URL || "http://backend:4000";
const SESSION_COOKIE = "session_id";

app.use(express.json());
app.use(cookieParser());

app.post("/bff/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  const loginRes = await fetch(`${BACKEND_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!loginRes.ok) {
    const body = await loginRes.json().catch(() => ({}));
    return res.status(loginRes.status).json(body);
  }

  const { accessToken, refreshToken } = await loginRes.json();
  const sessionId = createSession(accessToken, refreshToken);

 
  res.cookie(SESSION_COOKIE, sessionId, { httpOnly: true, sameSite: "lax" });
  res.status(204).end();
});

app.post("/bff/logout", (req: Request, res: Response) => {
  const sessionId = req.cookies[SESSION_COOKIE];
  if (sessionId) {
    deleteSession(sessionId);
  }
  res.clearCookie(SESSION_COOKIE);
  res.status(204).end();
});

app.all("/bff/api/*", async (req: Request, res: Response) => {
  const sessionId = req.cookies[SESSION_COOKIE];
  const session = sessionId ? getSession(sessionId) : undefined;

  if (!session) {
    return res.status(401).json({ error: "not logged in" });
  }

  // /bff/api/names -> /api/names: same path, just without the /bff prefix.
  const backendPath = req.originalUrl.replace(/^\/bff/, "");
  const hasBody = !["GET", "HEAD"].includes(req.method);

  const forward = (accessToken: string) =>
    fetch(`${BACKEND_URL}${backendPath}`, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: hasBody ? JSON.stringify(req.body) : undefined,
    });

  let backendRes = await forward(session.accessToken);

  if (backendRes.status === 401) {
    console.log(`[bff] access token expired for session ${sessionId}, refreshing...`);
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });

    if (!refreshRes.ok) {
      console.log(`[bff] refresh failed for session ${sessionId}, logging out`);
      deleteSession(sessionId);
      res.clearCookie(SESSION_COOKIE);
      return res.status(401).json({ error: "session expired, please log in again" });
    }

    const { accessToken } = await refreshRes.json();
    updateAccessToken(sessionId, accessToken);
    console.log(`[bff] refreshed access token for session ${sessionId}, retrying`);
    backendRes = await forward(accessToken);
  }

  const body = await backendRes.json().catch(() => null);
  res.status(backendRes.status).json(body);
});

app.listen(PORT, () => {
  console.log(`BFF running on http://localhost:${PORT}`);
});
