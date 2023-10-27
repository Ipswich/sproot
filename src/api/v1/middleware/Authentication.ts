import "dotenv/config";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import express, { Request, Response, NextFunction } from "express";
import { SprootDB } from "../../../database/SprootDB";

const router = express.Router();

router.post("/", async (req: Request, res: Response) => {
  if (!req.body?.username || !req.body?.password) {
    res.status(400).json({
      message: "Missing username or password",
      statusCode: 400,
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const sprootDB = req.app.get("sprootDB") as SprootDB;
  const user = await sprootDB.getUserAsync(req.body.username);
  if (user?.length > 0 && (await bcrypt.compare(req.body.password, user[0]!["hash"]))) {
    const token = jwt.sign({ username: req.body.username }, process.env["JWT_SECRET"]!, {
      expiresIn: process.env["JWT_EXPIRATION"]!,
    });
    res.clearCookie("token");
    res.cookie("token", token, {
      maxAge: parseInt(process.env["JWT_EXPIRATION"]!),
      httpOnly: true,
      secure: process.env["NODE_ENV"]!.toLowerCase() != "production" ? false : true,
      sameSite: "strict",
    });
    res.status(200).json({
      message: "Authentication successful",
      statusCode: 200,
      JWTtoken: token,
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(401).json({
      message: "Invalid credentials",
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
  }
  return;
});

// Validates JWT tokens in either the Authorization header or cookies
async function authenticate(req: Request, res: Response, next: NextFunction) {
  const errorResponse = {
    message: "Invalid or Missing JWT",
    statusCode: 401,
    timestamp: new Date().toISOString(),
    suggestion:
      "Check token validity. Token must be present as either a cookie or in the Authorization header.",
  };
  let token = req.headers["authorization"] ?? req.cookies["token"] ?? null;

  if (!token) {
    res.status(401).json(errorResponse);
    return;
  }
  try {
    if (token.startsWith("Bearer ")) {
      token = token.slice(7, token.length);
    }
    const decoded = jwt.verify(token, process.env["JWT_SECRET"]!);
    res.locals["username"] = (decoded as JwtPayload)["username"];
    next();
  } catch (err) {
    res.status(401).json(errorResponse);
    return;
  }
}

export default router;
export { authenticate };
