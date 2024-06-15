import { Success } from "@sproot/api/v2/Responses";
import express, { Request, Response } from "express";

const router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
  let response: Success = {
    statusCode: 200,
    content: {
      data: "pong",
    },
    ...res.locals["defaultProperties"],
  };

  res.status(200).json(response);
});

export default router;
