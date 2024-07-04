import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

import { ErrorResponse } from "@sproot/api/v2/Responses";

// Validates JWT tokens in either the Authorization header or cookies
export function authenticate(isAuthEnabled: string, jwtSecret: string) {
  return (request: Request, response: Response, next: NextFunction) => {
    let errorResponse: ErrorResponse;
    if (isAuthEnabled.toLowerCase() != "true") {
      next();
      return;
    }
    errorResponse = {
      statusCode: 401,
      error: {
        name: "Unauthorized",
        url: request.originalUrl,
        details: ["Invalid or Missing JWT."],
      },
      ...response.locals["defaultProperties"],
    };

    let token = request.headers["authorization"] ?? request.cookies["jwt_token"] ?? null;

    if (!token) {
      response.status(401).json(errorResponse);
      return;
    }
    try {
      if (token.startsWith("Bearer ")) {
        token = token.slice(7, token.length);
      }
      const decoded = jwt.verify(token, jwtSecret);
      response.locals["username"] = (decoded as JwtPayload)["username"];
      next();
      return;
    } catch (err) {
      response.status(401).json(errorResponse);
      return;
    }
  };
}
