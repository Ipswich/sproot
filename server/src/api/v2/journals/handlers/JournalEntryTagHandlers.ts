import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import JournalService from "../../../../journals/JournalService";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";

/**
 * Possible statusCodes: 200, 503
 */
export async function getAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get("journalService") as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const results = await journalService.entryTagManager.getTags();
    response = {
      statusCode: 200,
      content: { data: results },
      ...res.locals["defaultProperties"],
    };
  } catch (error: any) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to retrieve journal entry tags: ${error.message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/**
 * Possible statusCodes: 201, 400, 503
 */
export async function addAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get("journalService") as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const name = req.body["name"] as string | undefined;
    const color = req.body["color"] as string | null | undefined;
    if (name == null || name === "") {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Tag name is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const newId = await journalService.entryTagManager.createTag(name, color ?? null);
    response = {
      statusCode: 201,
      content: { data: { id: newId, name, color: color ?? null } },
      ...res.locals["defaultProperties"],
    };
  } catch (error: any) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to create journal entry tag: ${error.message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/**
 * Possible statusCodes: 200, 400, 404, 503
 * NOTE: this endpoint expects the updated tag object in the request body.
 */
export async function updateAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get("journalService") as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    // Accept either id in body or full tag object
    const tag = req.body as Partial<SDBJournalEntryTag>;
    if (tag == null || typeof tag.id !== "number" || tag.id <= 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Tag object with valid numeric id is required in request body."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const existing = (await journalService.entryTagManager.getTags()).find((t) => t.id === tag.id);
    if (!existing) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal entry tag with ID ${tag.id} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const updated: SDBJournalEntryTag = {
      id: tag.id,
      name: tag.name ?? existing.name,
      color: tag.color === undefined ? existing.color : tag.color,
    };

    await journalService.entryTagManager.updateTag(updated);
    response = {
      statusCode: 200,
      content: { data: updated },
      ...res.locals["defaultProperties"],
    };
  } catch (error: any) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to update journal entry tag: ${error.message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/**
 * Possible statusCodes: 200, 400, 404, 503
 * NOTE: this endpoint expects a JSON body like { id: number }
 */
export async function deleteAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get("journalService") as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const id = req.body?.id as number | undefined;
    if (typeof id !== "number" || isNaN(id) || id <= 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Request body must include numeric id of tag to delete."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const existing = (await journalService.entryTagManager.getTags()).find((t) => t.id === id);
    if (!existing) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal entry tag with ID ${id} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    await journalService.entryTagManager.deleteTag(id);
    response = {
      statusCode: 200,
      content: { data: `Journal entry tag with ID ${id} deleted.` },
      ...res.locals["defaultProperties"],
    };
  } catch (error: any) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to delete journal entry tag: ${error.message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
