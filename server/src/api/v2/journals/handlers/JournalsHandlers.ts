import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import JournalService from "../../../../journals/JournalService";
import { SDBJournal } from "@sproot/database/SDBJournal";

/**
 * Possible statusCodes 200, 400, 404, 503
 */
export async function getAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get("journalService") as JournalService;
  let journalId: number | undefined = undefined;
  if (req.params["journalId"]) {
    journalId = parseInt(req.params["journalId"]);
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
      return response;
    }
  }

  try {
    const results = await journalService.journalManager.getJournalsAsync();
    if (journalId && results.length == 0) {
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
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to retrieve journals: ${(error as Error).message}`],
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
  const name = req.body["name"] as string | undefined;
  const description = req.body["description"] as string | undefined;
  const icon = req.body["icon"] as string | undefined;
  const color = req.body["color"] as string | undefined;

  if (name == null || name === "") {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: ["Journal name is required."],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  const startDate = new Date();
  try {
    const newId = await journalService.journalManager.createJournalAsync(
      name!,
      description ?? null,
      icon ?? null,
      color ?? null,
      startDate,
    );

    response = {
      statusCode: 201,
      content: {
        data: {
          id: newId,
          name,
          description: description ?? null,
          icon: icon ?? null,
          color: color ?? null,
          archived: false,
          archivedDate: null,
          startDate: startDate.toISOString(),
          editedDate: startDate.toISOString(),
        } as SDBJournal,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
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

  const journalId = parseInt(req.params["journalId"] ?? "", 10);
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
    return response;
  }

  const existingJournal = await journalService.journalManager.getJournalsAsync(journalId);
  if (!existingJournal || existingJournal.length === 0) {
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

  const archived: boolean =
    req.body["archived"] === undefined
      ? existingJournal[0]!.journal.archived
      : Boolean(req.body["archived"]);

  // If trying to make changes to an already archived journal,
  // or trying to archive a journal that is already archived, return an error
  if (archived === true && existingJournal[0]!.journal.archived) {
    response = {
      statusCode: 400,
      error: {
        name: "Bad Request",
        url: req.originalUrl,
        details: ["Journal is archived; archive must be false to make changes."],
      },
      ...res.locals["defaultProperties"],
    };
    return response;
  }

  const name: string =
    req.body["name"] === undefined ? existingJournal[0]!.journal.name : String(req.body["name"]);

  const description: string | null =
    req.body["description"] === undefined
      ? existingJournal[0]!.journal.description
      : req.body["description"] === null
        ? null
        : String(req.body["description"]);

  const icon: string | null =
    req.body["icon"] === undefined
      ? existingJournal[0]!.journal.icon
      : req.body["icon"] === null
        ? null
        : String(req.body["icon"]);

  const color: string | null =
    req.body["color"] === undefined
      ? existingJournal[0]!.journal.color
      : req.body["color"] === null
        ? null
        : String(req.body["color"]);

  const startDate = existingJournal[0]!.journal.startDate;
  const editedDate = new Date().toISOString();
  const archivedDate =
    archived === true && !existingJournal[0]!.journal.archived
      ? new Date().toISOString()
      : archived === false && existingJournal[0]!.journal.archived
        ? null
        : existingJournal[0]!.journal.archivedDate;

  try {
    await journalService.journalManager.updateJournalAsync({
      id: journalId,
      name,
      description,
      icon,
      color,
      archived,
      startDate,
      editedDate,
      archivedDate,
    });

    response = {
      statusCode: 200,
      content: {
        data: {
          id: journalId,
          name,
          description,
          icon,
          color,
          archived,
          startDate,
          editedDate,
          archivedDate,
        },
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to update Journal: ${(error as Error).message}`],
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

  const journalId = parseInt(req.params["journalId"] ?? "", 10);
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
    return response;
  }

  const existingJournal = await journalService.journalManager.getJournalsAsync(journalId);
  if (!existingJournal || existingJournal.length === 0) {
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

  try {
    await journalService.journalManager.deleteJournalAsync(journalId);
    response = {
      statusCode: 200,
      content: {
        data: `Journal with ID ${journalId} successfully deleted.`,
      },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Internal Server Error",
        url: req.originalUrl,
        details: [`Failed to delete Journal with ID ${journalId}: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
