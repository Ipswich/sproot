import express, { Request, Response } from "express";

const router = express.Router();

router.get("/ping", async (_req: Request, res: Response) => {
  res.status(200).json({
    message: "pong",
    statusCode: 200,
    timestamp: new Date().toISOString(),
  });
});

export default router;
