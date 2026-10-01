import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

import { ISprootDB } from "../../../../database/ISprootDB";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SDBUser } from "@sproot/database/SDBUser";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { randomUUID } from "crypto";
import { getAuthenticationStateAsync } from "../../../../auth/AuthenticationState";

export function createSignedToken(
  username: string,
  jwtSecret: string,
  jwtExpirationMs: number,
  withCsrfToken: boolean,
  tokenVersion: number,
): { token: string; csrfToken?: string } {
  const jwtExpirationSeconds = Math.max(1, Math.floor(jwtExpirationMs / 1000));

  if (withCsrfToken) {
    const csrfToken = randomUUID();
    return {
      token: jwt.sign({ username, "csrf-token": csrfToken, "token-version": tokenVersion }, jwtSecret, {
        expiresIn: jwtExpirationSeconds,
      }),
      csrfToken,
    };
  }

  return {
    token: jwt.sign({ username, "token-version": tokenVersion }, jwtSecret, {
      expiresIn: jwtExpirationSeconds,
    }),
  };
}

export async function getTokenAsync(
  request: Request,
  response: Response,
  jwtExpiration: number,
  jwtSecret: string,
  withCsrfToken: boolean,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;

  let authenticationResponse: SuccessResponse | ErrorResponse;
  const authenticationState = await getAuthenticationStateAsync(sprootDB.settings, sprootDB.users);

  if (!authenticationState.authenticationEnabled) {
    authenticationResponse = {
      statusCode: 501,
      error: {
        name: "Not Implemented",
        url: request.originalUrl,
        details: ["Authentication is not enabled."],
      },
      ...response.locals["defaultProperties"],
    };
    return authenticationResponse;
  }

  if (authenticationState.requiresSetup) {
    authenticationResponse = {
      statusCode: 409,
      error: {
        name: "Conflict",
        url: request.originalUrl,
        details: ["Authentication setup is incomplete. Create the first user before logging in."],
      },
      ...response.locals["defaultProperties"],
    };
    return authenticationResponse;
  }

  const details: string[] = [];
  if (!request.body?.username) {
    details.push("Missing username");
  }
  if (!request.body?.password) {
    details.push("Missing password");
  }
  if (details.length > 0) {
    authenticationResponse = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: request.originalUrl,
        details: details,
      },
      ...response.locals["defaultProperties"],
    };
    return authenticationResponse;
  }

  let user: SDBUser[];
  try {
    user = await sprootDB.users.getByIdAsync(request.body.username);
  } catch (error) {
    authenticationResponse = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: request.originalUrl,
        details: ["Database error."],
      },
      ...response.locals["defaultProperties"],
    };
    return authenticationResponse;
  }

  if (user?.length > 0 && (await bcrypt.compare(request.body.password, user[0]!["hash"]))) {
    const token = createSignedToken(
      request.body.username,
      jwtSecret,
      jwtExpiration,
      withCsrfToken,
      user[0]!["tokenVersion"] ?? 0,
    );
    const data = withCsrfToken
      ? {
          token: token.token,
          "csrf-token": token.csrfToken,
        }
      : {
          token: token.token,
        };

    authenticationResponse = {
      statusCode: 200,
      content: {
        data,
      },
      ...response.locals["defaultProperties"],
    };
  } else {
    authenticationResponse = {
      statusCode: 401,
      error: {
        name: "Unauthorized",
        url: request.originalUrl,
        details: ["Invalid username or password."],
      },
      ...response.locals["defaultProperties"],
    };
  }
  return authenticationResponse;
}
