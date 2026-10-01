import bcrypt from "bcrypt";
import { Request, Response } from "express";

import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { getAuthenticationStateAsync } from "../../../../auth/AuthenticationState";
import { ISprootDB } from "../../../../database/ISprootDB";
import { SETTINGS } from "../../../../database/settings/SettingsSchema";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { createSignedToken } from "./TokenHandlers";

type UserSetupRequestBody = {
  username?: string;
  password?: string;
  enableAuthentication?: boolean;
};

function buildError(
  request: Request,
  response: Response,
  statusCode: number,
  name: string,
  details: string[],
): ErrorResponse {
  return {
    statusCode,
    error: {
      name,
      url: request.originalUrl,
      details,
    },
    ...response.locals["defaultProperties"],
  };
}

function validateSetupPayload(body: UserSetupRequestBody): string[] {
  const details: string[] = [];

  if (!body.username?.trim()) {
    details.push("Missing username");
  } else if (body.username.trim().length > 32) {
    details.push("Username must be 32 characters or fewer.");
  }

  if (!body.password) {
    details.push("Missing password");
  }

  return details;
}

export async function getAuthenticationStateResponseAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;

  try {
    const authenticationState = await getAuthenticationStateAsync(sprootDB.settings, sprootDB.users);
    return {
      statusCode: 200,
      content: {
        data: authenticationState,
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return buildError(request, response, 503, "Service Unavailable", [
      `Failed to retrieve authentication state: ${(error as Error).message}`,
    ]);
  }
}

export async function createFirstUserAsync(
  request: Request,
  response: Response,
  jwtExpiration: number,
  jwtSecret: string,
): Promise<SuccessResponse | ErrorResponse> {
  const body = (request.body ?? {}) as UserSetupRequestBody;
  const validationErrors = validateSetupPayload(body);
  if (validationErrors.length > 0) {
    return buildError(request, response, 400, "Bad Request", validationErrors);
  }

  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;

  try {
    const authenticationState = await getAuthenticationStateAsync(sprootDB.settings, sprootDB.users);
    if (authenticationState.userCount > 0) {
      return buildError(request, response, 409, "Conflict", [
        "Users already exist. First-time setup is no longer available.",
      ]);
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(body.password!.trim(), salt);
    await sprootDB.users.addAsync({
      username: body.username!.trim(),
      hash,
    });

    const shouldEnableAuthentication =
      authenticationState.authenticationEnabled || body.enableAuthentication === true;

    if (body.enableAuthentication === true && !authenticationState.authenticationEnabled) {
      await sprootDB.settings.setAsync(SETTINGS.system.authentication_enabled, true);
    }

    const session = shouldEnableAuthentication
      ? createSignedToken(body.username!.trim(), jwtSecret, jwtExpiration, true, 0)
      : undefined;

    return {
      statusCode: 201,
      content: {
        data: {
          authenticationEnabled: shouldEnableAuthentication,
          userCount: 1,
          requiresSetup: false,
          token: session?.token,
          "csrf-token": session?.csrfToken,
        },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return buildError(request, response, 503, "Service Unavailable", [
      `Failed to create the first user: ${(error as Error).message}`,
    ]);
  }
}

export async function changePasswordAsync(
  request: Request,
  response: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const newPassword = request.body?.newPassword;
  if (!newPassword) {
    return buildError(request, response, 400, "Bad Request", ["Missing newPassword"]);
  }

  const sprootDB = request.app.get(DI_KEYS.SprootDB) as ISprootDB;

  try {
    const authenticationState = await getAuthenticationStateAsync(sprootDB.settings, sprootDB.users);
    const users = await sprootDB.users.getAllAsync();
    if (users.length < 1) {
      return buildError(request, response, 404, "Not Found", ["No users exist."]);
    }

    if (users.length > 1) {
      return buildError(request, response, 409, "Conflict", [
        "Changing passwords through this endpoint is only supported for single-user setups.",
      ]);
    }

    const user = users[0]!;
    if (authenticationState.authenticationEnabled) {
      if (!request.body?.currentPassword) {
        return buildError(request, response, 400, "Bad Request", ["Missing currentPassword"]);
      }

      const username = response.locals["username"];
      if (username !== user.username) {
        return buildError(request, response, 403, "Forbidden", [
          "You can only change the password for the authenticated user.",
        ]);
      }

      const passwordMatches = await bcrypt.compare(request.body.currentPassword, user.hash);
      if (!passwordMatches) {
        return buildError(request, response, 401, "Unauthorized", ["Current password is invalid."]);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);
    await sprootDB.users.updatePasswordAsync(user.username, hash);
    await sprootDB.users.incrementTokenVersionAsync(user.username);

    return {
      statusCode: 200,
      content: {
        data: {
          username: user.username,
        },
      },
      ...response.locals["defaultProperties"],
    };
  } catch (error) {
    return buildError(request, response, 503, "Service Unavailable", [
      `Failed to update password: ${(error as Error).message}`,
    ]);
  }
}