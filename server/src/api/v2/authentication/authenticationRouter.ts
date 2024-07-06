import express, { Request, Response } from "express";
import { getTokenAsync } from "./handlers/TokenHandlers";

export default function initializeAuthenticationRoutes(
  isAuthEnabled: string,
  jwtExpiration: number,
  jwtSecret: string,
): express.Router {
  const router = express.Router();

  /**
   * Possible statusCodes: 200, 400, 401, 501, 503
   * @param request
   * @param response
   * @returns
   */
  router.post("/token", async (req: Request, res: Response) => {
    const response = await getTokenAsync(req, res, isAuthEnabled, jwtExpiration, jwtSecret, false);

    res.status(response.statusCode).json(response);
  });

  /**
   * Possible statusCodes: 200, 400, 401, 501, 503
   * @param request
   * @param response
   * @returns
   */
  router.post("/login", async (req: Request, res: Response) => {
    const response = await getTokenAsync(req, res, isAuthEnabled, jwtExpiration, jwtSecret, true);
    if (response.statusCode === 200 && "content" in response) {
      const token = response.content?.data?.token;
      // Remove the token from the response, as it shouldn't be made visible to the client
      delete response.content.data.token;

      res
        .cookie("jwt_token", token, {
          maxAge: jwtExpiration,
          httpOnly: true,
          sameSite: "strict",
        })
        .status(response.statusCode)
        .json(response);
      return;
    }

    res.status(response.statusCode).json(response);
  });

  return router;
}
