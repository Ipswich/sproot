import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { JournalService } from "../../../../journals/JournalService";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import type { operations as TagContractOperations } from "@sproot/sproot-common/dist/api/generated/tags/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type CreateJournalEntryTagRequestBody =
  TagContractOperations["createJournalEntryTag"]["requestBody"]["content"]["application/json"];
type UpdateJournalEntryTagRequestBody =
  TagContractOperations["updateJournalEntryTag"]["requestBody"]["content"]["application/json"];

/**
 * Possible statusCodes: 200, 503
 */
export async function getAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const results = await journalService.entryTagManager.getTagsAsync();
    response = {
      statusCode: 200,
      content: { data: results },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to retrieve journal entry tags: ${(error as Error).message}`],
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const requestBody = getValidatedContractRequestData<"createJournalEntryTag">(res)
      .body as unknown as CreateJournalEntryTagRequestBody;
    const name = requestBody.name;
    const color = requestBody.color;

    const badRequestDetails: string[] = [];
    if (name === "" || (name != null && name.length > 32)) {
      badRequestDetails.push("Valid tag name is required.");
    }
    if (color != null && color.length > 32) {
      badRequestDetails.push("Valid tag color is required.");
    }
    if (badRequestDetails.length > 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: badRequestDetails,
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const tagName = name as string;
    const newId = await journalService.entryTagManager.createTagAsync(tagName, color ?? null);
    response = {
      statusCode: 201,
      content: { data: { id: newId, name: tagName, color: color ?? null } },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to create journal entry tag: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/**
 * Possible statusCodes: 200, 400, 404, 503
 */
export async function updateAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const tagId = parseInt(req.params["tagId"] ?? "", 10);
    const tag = (getValidatedContractRequestData<"updateJournalEntryTag">(res).body ??
      {}) as UpdateJournalEntryTagRequestBody;
    if (isNaN(tagId) || tagId <= 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Tag object with valid numeric id is required."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const existing = (await journalService.entryTagManager.getTagsAsync()).find(
      (t) => t.id === tagId,
    );
    if (!existing) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal entry tag with ID ${tagId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const updated: SDBJournalEntryTag = {
      id: tagId,
      name: tag.name ?? existing.name,
      color: tag.color === undefined ? existing.color : tag.color,
    };

    await journalService.entryTagManager.updateTagAsync(updated);
    response = {
      statusCode: 200,
      content: { data: updated },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to update journal entry tag: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}

/**
 * Possible statusCodes: 200, 400, 404, 503
 */
export async function deleteAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let response: SuccessResponse | ErrorResponse;
  try {
    const tagId = parseInt(req.params["tagId"] ?? "", 10);
    if (isNaN(tagId) || tagId <= 0) {
      response = {
        statusCode: 400,
        error: {
          name: "Bad Request",
          url: req.originalUrl,
          details: ["Missing or invalid tagId parameter."],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const existing = (await journalService.entryTagManager.getTagsAsync()).find(
      (t) => t.id === tagId,
    );
    if (!existing) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal entry tag with ID ${tagId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    await journalService.entryTagManager.deleteTagAsync(tagId);
    response = {
      statusCode: 200,
      content: { data: `Journal entry tag with ID ${tagId} deleted.` },
      ...res.locals["defaultProperties"],
    };
  } catch (error) {
    response = {
      statusCode: 503,
      error: {
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to delete journal entry tag: ${(error as Error).message}`],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
