import { Router, Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "./db";

interface TokenPayload {
  userId: number;
  username: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is required");
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();
const ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || "15m";
const REFRESH_EXPIRY = process.env.JWT_REFRESH_EXPIRY || "7d";

function signAccessToken(userId: number, username: string) {
  const payload: TokenPayload = { userId, username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXPIRY } as jwt.SignOptions);
}

function signRefreshToken(userId: number, username: string) {
  const payload: TokenPayload = { userId, username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_EXPIRY } as jwt.SignOptions);
}

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as unknown as TokenPayload;
}

export const authRouter = Router();

authRouter.post("/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "username and password are required" });
  }

  const { rows } = await pool.query(
    "SELECT id, username, password_hash FROM users WHERE username = $1",
    [username]
  );
  const user = rows[0];

  
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "invalid credentials" });
  }

  res.json({
    accessToken: signAccessToken(user.id, user.username),
    refreshToken: signRefreshToken(user.id, user.username),
  });
});

authRouter.post("/auth/refresh", (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (typeof refreshToken !== "string") {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  try {
    const payload = verifyToken(refreshToken);
    res.json({ accessToken: signAccessToken(payload.userId, payload.username) });
  } catch {
    res.status(401).json({ error: "invalid or expired refresh token" });
  }
});

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    return res.status(401).json({ error: "missing bearer token" });
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "invalid or expired token" });
  }
}
