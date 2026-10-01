// import { Request, Response } from "express";

// import { ErrorResponse } from "@sproot/api/v2/Responses";
// import { isSecureRequest } from "./AuthenticationCookies";

// export async function rejectInsecureRequestIfRequiredAsync(
//   request: Request,
//   response: Response,
// ): Promise<boolean> {
//   const forceHttps = request.app.get("forceHttpsEnabled") === true;

//   if (!forceHttps || isSecureRequest(request)) {
//     return false;
//   }

//   const errorResponse: ErrorResponse = {
//     statusCode: 426,
//     error: {
//       name: "Upgrade Required",
//       url: request.originalUrl,
//       details: [
//         "HTTPS is required for this request. Open the app over https:// or disable system.force_https.",
//       ],
//     },
//     ...response.locals["defaultProperties"],
//   };
//   response.status(426).json(errorResponse);
//   return true;
// }