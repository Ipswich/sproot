import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import JournalService from "../../../../journals/JournalService";
import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";

/**
 * Possible statusCodes 200, 400, 404, 503
 */
export async function getByJournalIdAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  let journalId: number | undefined = undefined;
  journalId = parseInt(req.params["journalId"] ?? "", 10);
  if (isNaN(journalId)) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: ["Valid Journal ID is required."],
      },
      ...res.locals["defaultProperties"],
    };
  }

  try {
    let results: (SDBJournalEntry & {
      tags?: SDBJournalEntryTag[];
    })[] = [];
    const doesJournalExist = await journalService.journalManager.getJournalsAsync(journalId);
    if (!doesJournalExist || doesJournalExist.length === 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal with ID ${journalId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
    } else {
      results = await journalService.entryManager.getAsync(journalId);
      response = {
        statusCode: 200,
        content: {
          data: results,
        },
        ...res.locals["defaultProperties"],
      };
    }
    return response;
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to retrieve journal entries: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/**
 * Possible statusCodes 200, 400, 404, 503
 */
export async function getByEntryIdAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  let entryId: number | undefined = undefined;

  if (req.params["entryId"]) {
    entryId = parseInt(req.params["entryId"] ?? "", 10);
    if (isNaN(entryId)) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Valid Journal Entry ID is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }
  }

  try {
    let results: (SDBJournalEntry & {
      tags?: SDBJournalEntryTag[];
    })[] = [];
    results = await journalService.entryManager.getAsync(undefined, entryId);
    if (results.length == 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [
            `Journal Entry with ID ${entryId} not found.`,
          ],
        },
        ...res.locals["defaultProperties"],
      };
    } else {
      response = {
        statusCode: 200,
        content: {
          data: results,
        },
        ...res.locals["defaultProperties"],
      };
    }
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to retrieve journal entries: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

export async function addAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  const journalId = parseInt(req.params["journalId"] ?? "", 10);
  const content = req.body["content"] as string | undefined;
  const title = req.body["title"] as string | undefined;

  try {
    const badRequests: string[] = [];

    if (isNaN(journalId)) {
      badRequests.push("Valid Journal ID is required.");
    }
    const doesJournalExist = await journalService.journalManager.getJournalsAsync(journalId);
    if (!doesJournalExist || doesJournalExist.length === 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal with ID ${journalId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    if (content == null || content === "") {
      badRequests.push("Journal Entry content is required.");
    }

    if (badRequests.length > 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: badRequests,
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const createdAt = new Date();
    const newId = await journalService.entryManager.createAsync(
      journalId!,
      content!,
      title,
      createdAt,
    );

    response = {
      statusCode: 201,
      content: {
        data: {
          id: newId,
          journalId: journalId!,
          title,
          content,
          createdAt: createdAt.toISOString(),
          editedAt: createdAt.toISOString(),
        } as SDBJournalEntry,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to create Journal: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function updateAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;

  const entryId = parseInt(req.params["entryId"] ?? "", 10);

  const badRequests: string[] = [];
  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (req.body["text"] === null) {
    badRequests.push("Journal Entry text cannot be null.");
  }

  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  const existingEntry = await journalService.entryManager.getAsync(undefined, entryId);
  if (!existingEntry || existingEntry.length === 0) {
    response = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: req.originalUrl,
        details: [`Journal Entry with ID ${entryId} not found.`],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  const content: string =
    req.body["text"] == undefined ? existingEntry[0]!.content : String(req.body["content"]);

  const title: string | null =
    req.body["title"] === undefined
      ? existingEntry[0]!.title
      : req.body["title"] === null
        ? null
        : String(req.body["title"]);

  const editedAt = new Date();

  try {
    await journalService.entryManager.updateAsync({
      id: entryId,
      journalId: existingEntry[0]!.journalId,
      content,
      title,
      createdAt: existingEntry[0]!.createdAt.slice(0, 19).replace("T", " "),
      editedAt: editedAt.toISOString().slice(0, 19).replace("T", " "),
    } as SDBJournalEntry);

    response = {
      statusCode: 200,
      content: {
        data: {
          id: entryId,
          journalId: existingEntry[0]!.journalId,
          content,
          title,
          createdAt: existingEntry[0]!.createdAt,
          editedAt: editedAt.toISOString()
        },
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to update Journal Entry: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/** Possible statusCodes: 204, 400, 404, 503 */
export async function deleteAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;

  const entryId = parseInt(req.params["entryId"] ?? "", 10);

  if (isNaN(entryId)) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: ["Valid Journal Entry ID is required."],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  const existingEntry = await journalService.entryManager.getAsync(undefined, entryId);
  if (!existingEntry || existingEntry.length === 0) {
    response = {
      statusCode: 404,
      error: {
        name: "Not Found",
        url: req.originalUrl,
        details: [`Journal Entry with ID ${entryId} not found.`],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    await journalService.entryManager.deleteAsync(entryId);
    response = {
      statusCode: 200,
      content: {
        data: `Journal Entry with ID ${entryId} successfully deleted.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to delete Journal Entry with ID ${entryId}: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function addTagAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;

  const entryId = parseInt(req.params["entryId"] ?? "", 10);
  const tagId = parseInt(req.body["tagId"] ?? "", 10);

  const badRequests: string[] = [];
  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (isNaN(tagId)) {
    badRequests.push("Valid Tag ID is required.");
  }

  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    const existingEntry = await journalService.entryManager.getAsync(undefined, entryId);
    if (!existingEntry || existingEntry.length === 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal Entry with ID ${entryId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    if (existingEntry[0]!.tags.some((t) => t.id === tagId)) {
      response = {
        statusCode: 200,
        content: {
          data: `Journal Entry with ID ${entryId} already has tag with ID ${tagId}.`,
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const existingTag = await journalService.journalTagManager.getTags();
    if (!existingTag.find((t) => t.id === tagId)) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal Tag with ID ${tagId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    await journalService.entryManager.addTagAsync(entryId, tagId);
    response = {
      statusCode: 200,
      content: {
        data: `Tag with ID ${tagId} successfully added to Journal Entry with ID ${entryId}.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to add tag with ID ${tagId} to Journal Entry with ID ${entryId}: ${(error as Error).message
          }`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/** Possible statusCodes: 200, 400, 404, 503 */
export async function removeTagAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;

  const entryId = parseInt(req.params["entryId"] ?? "", 10);
  const tagId = parseInt(req.params["tagId"] ?? "", 10);

  const badRequests: string[] = [];
  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (isNaN(tagId)) {
    badRequests.push("Valid Tag ID is required.");
  }

  if (badRequests.length > 0) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: badRequests,
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  try {
    const existingEntry = await journalService.entryManager.getAsync(undefined, entryId);
    if (!existingEntry || existingEntry.length === 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal Entry with ID ${entryId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    if (!existingEntry[0]!.tags.some((t) => t.id === tagId)) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [
            `Journal Entry with ID ${entryId} does not have tag with ID ${tagId} and cannot be removed.`,
          ],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    await journalService.entryManager.removeTagAsync(entryId, tagId);
    response = {
      statusCode: 200,
      content: {
        data: `Tag with ID ${tagId} successfully removed from Journal Entry with ID ${entryId}.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [
          `Failed to remove tag with ID ${tagId} from Journal Entry with ID ${entryId}: ${(error as Error).message
          }`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
