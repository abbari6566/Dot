import type { NextFunction, Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: "Not found." });
}

// Registered last, after all routers — catches anything a controller didn't
// handle itself (thrown errors outside try/catch, malformed JSON bodies, etc.)
// so clients always get the app's JSON error shape instead of Express's default
// HTML/stack-trace page.
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;

  console.error(err);

  const status = typeof (err as { status?: unknown })?.status === "number" ? (err as { status: number }).status : 500;
  const isProd = process.env.NODE_ENV === "production";
  const message = !isProd && err instanceof Error ? err.message : "Something went wrong. Please try again.";

  res.status(status).json({ message });
}
