import express, { Request, RequestHandler, Response } from "express";
import { getTokenAsync } from "./handlers/TokenHandlers";
import {
  changePasswordAsync,
  createFirstUserAsync,
  getAuthenticationStateResponseAsync,
} from "./handlers/UserSetupHandlers";
import {
  clearAuthenticationCookie,
  setAuthenticationCookie,
} from "../../../auth/AuthenticationCookies";
import { rejectInsecureRequestIfRequiredAsync } from "../../../auth/TransportSecurity";
import { ISprootDB } from "../../../database/ISprootDB";
import { DI_KEYS } from "../../../utils/DependencyInjectionConstants";

export default function initializeAuthenticationRoutes(
  jwtExpiration: number,
  jwtSecret: string,
  authenticateMiddleware: RequestHandler,
): express.Router {
  const router = express.Router();

  router.use(async (req: Request, res: Response, next) => {
    if (await rejectInsecureRequestIfRequiredAsync(req, res)) {
      return;
    }

    next();
  });

  router.get("/state", async (req: Request, res: Response) => {
    const response = await getAuthenticationStateResponseAsync(req, res);
    res.status(response.statusCode).json(response);
  });

  router.post("/setup", async (req: Request, res: Response) => {
    const response = await createFirstUserAsync(req, res, jwtExpiration, jwtSecret);

    if (response.statusCode === 201 && "content" in response && response.content?.data?.token) {
      const token = response.content.data.token;
      delete response.content.data.token;
      setAuthenticationCookie(req, res, token, jwtExpiration);
    }

    res.status(response.statusCode).json(response);
  });

  router.post("/logout", authenticateMiddleware, async (req: Request, res: Response) => {
    const username = res.locals["username"] as string | undefined;

    if (username) {
      try {
        const sprootDB = req.app.get(DI_KEYS.SprootDB) as ISprootDB;
        await sprootDB.users.incrementTokenVersionAsync(username);
      } catch {
        res.status(503).json({
          statusCode: 503,
          error: {
            name: "Service Unavailable",
            url: req.originalUrl,
            details: ["Failed to revoke the active session."],
          },
          ...res.locals["defaultProperties"],
        });
        return;
      }
    }

    clearAuthenticationCookie(req, res);
    res.status(200).json({ statusCode: 200, content: { data: { success: true } } });
  });

  router.post("/password", authenticateMiddleware, async (req: Request, res: Response) => {
    const response = await changePasswordAsync(req, res);
    res.status(response.statusCode).json(response);
  });

  /**
   * Possible statusCodes: 200, 400, 401, 501, 503
   * @param request
   * @param response
   * @returns
   */
  router.post("/token", async (req: Request, res: Response) => {
    const response = await getTokenAsync(req, res, jwtExpiration, jwtSecret, false);

    res.status(response.statusCode).json(response);
  });

  /**
   * Possible statusCodes: 200, 400, 401, 501, 503
   * @param request
   * @param response
   * @returns
   */
  router.post("/login", async (req: Request, res: Response) => {
    const response = await getTokenAsync(req, res, jwtExpiration, jwtSecret, true);
    if (response.statusCode === 200 && "content" in response) {
      const token = response.content?.data?.token;
      // Remove the token from the response, as it shouldn't be made visible to the client
      delete response.content.data.token;

      setAuthenticationCookie(req, res, token, jwtExpiration);
      res.status(response.statusCode).json(response);
      return;
    }

    res.status(response.statusCode).json(response);
  });

  return router;
}
