import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Request, Response } from "express";

import { ISprootDB } from "@sproot/sproot-common/dist/database/ISprootDB";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { SDBUser } from "@sproot/database/SDBUser";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { randomUUID } from "crypto";
import type { operations as AuthContractOperations } from "@sproot/sproot-common/dist/api/generated/auth/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type AuthenticateRequestBody =
  AuthContractOperations["authenticateToken"]["requestBody"]["content"]["application/json"];

export async function getTokenAsync(
  request: Request,
  response: Response,
  isAuthEnabled: string,
  jwtExpiration: number,
  jwtSecret: string,
  withCsrfToken: boolean,
): Promise<SuccessResponse | ErrorResponse> {
  const requestBody = (getValidatedContractRequestData<"authenticateToken" | "authenticateLogin">(
    response,
  ).body ?? request.body) as AuthenticateRequestBody;
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

  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;
  let user: SDBUser[];
  try {
    user = await sprootDB.getUserAsync(requestBody.username);
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
  if (user?.length > 0 && (await bcrypt.compare(requestBody.password, user[0]!["hash"]))) {
    let token: string;
    let data = {};
    if (withCsrfToken) {
      const csrf = randomUUID();
      token = jwt.sign({ username: requestBody.username, csrf }, jwtSecret, {
        expiresIn: jwtExpiration,
      });

      data = {
        token,
        "csrf-token": csrf,
      };
    } else {
      token = jwt.sign({ username: requestBody.username }, jwtSecret, {
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
