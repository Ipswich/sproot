import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import { ErrorResponse } from "@sproot/api/v2/Responses";
import { ISprootDB } from "../../../database/ISprootDB";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";
import { getAuthenticationStateAsync } from "../../../auth/AuthenticationState";
import { clearAuthenticationCookie } from "../../../auth/AuthenticationCookies";
import { rejectInsecureRequestIfRequiredAsync } from "../../../auth/TransportSecurity";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Validates JWT tokens in either the Authorization header or cookie
export function authorize(jwtSecret: string) {
  return async (request: Request, response: Response, next: NextFunction) => {
    let errorResponse: ErrorResponse;
    const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
    const usingCookieAuth = !request.headers["authorization"] && Boolean(request.cookies["jwt_token"]);

    if (await rejectInsecureRequestIfRequiredAsync(request, response)) {
      return;
    }

    let authenticationState;
    try {
      authenticationState = await getAuthenticationStateAsync(sprootDB.settings, sprootDB.users);
    } catch {
      response.status(503).json({
        statusCode: 503,
        error: {
          name: "Service Unavailable",
          url: request.originalUrl,
          details: ["Unable to determine authentication state."],
        },
        ...response.locals["defaultProperties"],
      });
      return;
    }

    if (!authenticationState.authenticationEnabled) {
      next();
      return;
    }

    if (authenticationState.requiresSetup) {
      if (usingCookieAuth) {
        clearAuthenticationCookie(request, response);
      }
      response.status(409).json({
        statusCode: 409,
        error: {
          name: "Conflict",
          url: request.originalUrl,
          details: ["Authentication setup is incomplete. Create the first user before continuing."],
        },
        ...response.locals["defaultProperties"],
      });
      return;
    }

    const details: string[] = [];
    errorResponse = {
      statusCode: 401,
      error: {
        name: "Unauthorized",
        url: request.originalUrl,
        details: details,
      },
      ...response.locals["defaultProperties"],
    };

    let token = request.headers["authorization"] ?? request.cookies["jwt_token"] ?? null;

    if (!token) {
      details.push("Missing JWT.");
      if (usingCookieAuth) {
        clearAuthenticationCookie(request, response);
      }
      response.status(401).json(errorResponse);
      return;
    }
    try {
      if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
      }
      const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

      const user = await sprootDB.users.getByIdAsync(decoded["username"] as string);
      if (user.length < 1) {
        details.push("Invalid JWT.");
        if (usingCookieAuth) {
          clearAuthenticationCookie(request, response);
        }
        response.status(401).json(errorResponse);
        return;
      }

      const tokenVersion = decoded["token-version"];
      if (typeof tokenVersion !== "number" || tokenVersion !== (user[0]!["tokenVersion"] ?? 0)) {
        details.push("Invalid JWT.");
        if (usingCookieAuth) {
          clearAuthenticationCookie(request, response);
        }
        response.status(401).json(errorResponse);
        return;
      }

      if (decoded["csrf-token"] && !SAFE_METHODS.has(request.method.toUpperCase())) {
        const csrf = request.headers["x-csrf-token"];
        if (csrf !== decoded["csrf-token"]) {
          details.push("Invalid CSRF token.");
          if (usingCookieAuth) {
            clearAuthenticationCookie(request, response);
          }
          response.status(401).json(errorResponse);
          return;
        }
      }

      response.locals["username"] = decoded["username"];
      next();
      return;
    } catch (err) {
      details.push("Invalid JWT.");
      if (usingCookieAuth) {
        clearAuthenticationCookie(request, response);
      }
      response.status(401).json(errorResponse);
      return;
    }
  };
}
