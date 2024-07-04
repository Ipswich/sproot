import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

import { ISprootDB } from "@sproot/database/ISprootDB";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";

export async function getTokenAsync(
  request: Request,
  response: Response,
  isAuthEnabled: string,
  jwtExpiration: string,
  jwtSecret: string,
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
  const user = await sprootDB.getUserAsync(request.body.username);
  if (user?.length > 0 && (await bcrypt.compare(request.body.password, user[0]!["hash"]))) {
    const token = jwt.sign({ username: request.body.username }, jwtSecret, {
      expiresIn: jwtExpiration,
    });
    authenticationResponse = {
      statusCode: 200,
      content: {
        data: { token: token },
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
