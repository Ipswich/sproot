import express, { Request, Response } from "express";
import { getTokenAsync } from "./handlers/TokenHandlers";

export default function initializeAuthenticationRoutes(
  isAuthEnabled: string,
  jwtExpiration: string,
  jwtSecret: string,
): express.Router {
  const router = express.Router();

  router.post("/token", async (req: Request, res: Response) => {
    const response = await getTokenAsync(req, res, isAuthEnabled, jwtExpiration, jwtSecret);

    res.status(response.statusCode).json(response);
  });

  // router.post("/login", async (req: Request, res: Response) => {
  //   const response = await getTokenAsync(
  //     req,
  //     res,
  //     isAuthEnabled,
  //     jwtExpiration,
  //     jwtSecret,
  //   );
  //   if (response.statusCode === 200 && "content" in response) {
  //     const token = response.content?.data?.token;
  //     res
  //       .cookie("jwt", token, {
  //         maxAge: parseInt(process.env["JWT_EXPIRATION"]!),
  //         httpOnly: true,
  //         sameSite: "strict",
  //       })
  //       .status(response.statusCode)
  //       .json(response);
  //     return;
  //   }

  //   res.status(response.statusCode).json(response);
  // });

  return router;
}
