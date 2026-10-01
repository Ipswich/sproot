import { CookieOptions, Request, Response } from "express";

export function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers["x-forwarded-proto"];
  if (request.secure) {
    return true;
  }

  if (typeof forwardedProto === "string") {
    return forwardedProto
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .includes("https");
  }

  if (Array.isArray(forwardedProto)) {
    return forwardedProto.some((value) => value.toLowerCase() === "https");
  }

  return false;
}

export function buildAuthenticationCookieOptions(
  request: Request,
  maxAge?: number,
): CookieOptions {
  return {
    maxAge,
    httpOnly: true,
    sameSite: "strict",
    secure: isSecureRequest(request),
    path: "/",
  };
}

export function clearAuthenticationCookie(request: Request, response: Response): void {
  response.clearCookie("jwt_token", buildAuthenticationCookieOptions(request));
}

export function setAuthenticationCookie(
  request: Request,
  response: Response,
  token: string,
  maxAge: number,
): void {
  response.cookie("jwt_token", token, buildAuthenticationCookieOptions(request, maxAge));
}