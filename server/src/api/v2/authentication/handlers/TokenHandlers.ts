import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { SDBUser } from "@sproot/database/SDBUser";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { randomUUID } from "crypto";

export async function getTokenAsync(
  request: Request,
  response: Response,
  isAuthEnabled: string,
  jwtExpiration: number,
  jwtSecret: string,
  withCsrfToken: boolean,
): Promise<SuccessResponse | ErrorResponse> {
  let authenticationResponse: SuccessResponse | ErrorResponse;
  if (isAuthEnabled.toLowerCase() != "true") {
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

  let details: string[] = [];
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
  const sprootDB = request.app.get("sprootDB") as ISprootDB;
  let user: SDBUser[];
  try {
    user = await sprootDB.getUserAsync(request.body.username);
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
    let token: string;
    let data = {};
    if (withCsrfToken) {
      const csrf = randomUUID();
      token = jwt.sign({ username: request.body.username, csrf }, jwtSecret, {
        expiresIn: jwtExpiration,
      });

      data = {
        token,
        "csrf-token": csrf,
      };
    } else {
      token = jwt.sign({ username: request.body.username }, jwtSecret, {
        expiresIn: jwtExpiration,
      });

      data = {
        token,
      };
    }
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
