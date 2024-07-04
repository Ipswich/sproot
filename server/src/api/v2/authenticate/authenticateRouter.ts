import express, { Request, Response } from "express";
import { authenticateAsync } from "./handlers/AuthenticateHandlers";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  const response = await authenticateAsync(req, res);

  res.status(response.statusCode).json(response);
});

export default router;
