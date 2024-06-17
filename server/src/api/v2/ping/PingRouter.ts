import { SuccessResponse } from "@sproot/api/v2/Responses";
import express, { Request, Response } from "express";

const router = express.Router();

router.get("/", async (_req: Request, res: Response) => {
  let response: SuccessResponse = {
    statusCode: 200,
    content: {
      data: "pong",
    },
    ...res.locals["defaultProperties"],
  };

  res.status(200).json(response);
});

export default router;
