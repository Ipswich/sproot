import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { JournalService } from "../../../../journals/JournalService";
import { SDBJournalEntry } from "@sproot/sproot-common/dist/database/SDBJournalEntry";
import { SDBJournalEntryTag } from "@sproot/sproot-common/dist/database/SDBJournalEntryTag";
import type { ContractOperationQueryParams } from "@sproot/sproot-common/dist/api/contracts/operation-types";
import type { ContractOperationPathParams } from "@sproot/sproot-common/dist/api/contracts/operation-types";
import type { operations as JournalContractOperations } from "@sproot/sproot-common/dist/api/generated/journals/types";
import { toDbDate, isoToDb } from "../../../../utils/dateUtils";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type ListJournalEntriesQuery = ContractOperationQueryParams<"listJournalEntries">;
type GetJournalEntryByIdQuery = ContractOperationQueryParams<"getJournalEntryById">;
type CreateJournalEntryRequestBody =
  JournalContractOperations["createJournalEntry"]["requestBody"]["content"]["application/json"];
type UpdateJournalEntryRequestBody =
  JournalContractOperations["updateJournalEntry"]["requestBody"]["content"]["application/json"];
type AttachTagToJournalEntryRequestBody =
  JournalContractOperations["attachTagToJournalEntry"]["requestBody"]["content"]["application/json"];
type ListJournalEntriesPathParams = ContractOperationPathParams<"listJournalEntries">;
type GetJournalEntryByIdPathParams = ContractOperationPathParams<"getJournalEntryById">;
type CreateJournalEntryPathParams = ContractOperationPathParams<"createJournalEntry">;
type UpdateJournalEntryPathParams = ContractOperationPathParams<"updateJournalEntry">;
type DeleteJournalEntryPathParams = ContractOperationPathParams<"deleteJournalEntry">;
type AttachTagToJournalEntryPathParams = ContractOperationPathParams<"attachTagToJournalEntry">;
type DetachTagFromJournalEntryPathParams = ContractOperationPathParams<"detachTagFromJournalEntry">;

/**
 * Possible statusCodes 200, 400, 404, 503
 */
export async function getByJournalIdAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let journalId: number | undefined = undefined;
  const pathParams = (getValidatedContractRequestData<"listJournalEntries">(res).params ??
    req.params) as ListJournalEntriesPathParams;
  const query = (getValidatedContractRequestData<"listJournalEntries">(res).query ??
    {}) as ListJournalEntriesQuery;
  const withContent = query["withContent"] ?? true;

  journalId = parseInt(pathParams["journalId"] ?? "", 10);
  const badRequests: string[] = [];
  if (isNaN(journalId) || journalId <= 0) {
    badRequests.push("Valid Journal ID is required.");
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
    let results: { entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }[] = [];
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
      results = await journalService.entryManager.getAsync(journalId, undefined, withContent);
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let entryId: number | undefined = undefined;
  const pathParams = (getValidatedContractRequestData<"getJournalEntryById">(res).params ??
    req.params) as GetJournalEntryByIdPathParams;
  const query = (getValidatedContractRequestData<"getJournalEntryById">(res).query ??
    {}) as GetJournalEntryByIdQuery;
  const withContent = query["withContent"] ?? true;
  const badRequests: string[] = [];

  if (pathParams["entryId"]) {
    entryId = parseInt(pathParams["entryId"] ?? "", 10);
    if (isNaN(entryId) || entryId <= 0) {
      badRequests.push("Valid Journal Entry ID is required.");
    }
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
    let results: { entry: SDBJournalEntry; tags: SDBJournalEntryTag[] }[] = [];
    results = await journalService.entryManager.getAsync(undefined, entryId, withContent);
    if (results.length == 0) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal Entry with ID ${entryId} not found.`],
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const pathParams = (getValidatedContractRequestData<"createJournalEntry">(res).params ??
    req.params) as CreateJournalEntryPathParams;
  const journalId = parseInt(pathParams["journalId"] ?? "", 10);
  const requestBody = getValidatedContractRequestData<"createJournalEntry">(res)
    .body as unknown as CreateJournalEntryRequestBody;
  const { content, title } = requestBody;

  const badRequests: string[] = [];

  if (isNaN(journalId) || journalId <= 0) {
    badRequests.push("Valid Journal ID is required.");
  }

  if (content === "") {
    badRequests.push("Journal Entry content is required.");
  }

  if (title !== undefined && title !== null && title.length > 64) {
    badRequests.push("Journal Entry title cannot exceed 64 characters.");
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

    const createdAt = new Date();
    const entryContent = content as string;
    const newId = await journalService.entryManager.createAsync(
      journalId!,
      entryContent,
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
          content: entryContent,
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
        details: [`Failed to create Journal Entry: ${(error as Error).message}`],
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const pathParams = (getValidatedContractRequestData<"updateJournalEntry">(res).params ??
    req.params) as UpdateJournalEntryPathParams;
  const requestBody = (getValidatedContractRequestData<"updateJournalEntry">(res).body ??
    {}) as UpdateJournalEntryRequestBody;

  const entryId = parseInt(pathParams["entryId"] ?? "", 10);

  const badRequests: string[] = [];
  if (isNaN(entryId)) {
    badRequests.push("Valid Journal Entry ID is required.");
  }
  if (requestBody.title && requestBody.title.length > 64) {
    badRequests.push("Journal Entry title cannot exceed 64 characters.");
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

    const content: string =
      requestBody.content == undefined ? existingEntry[0]!.entry.content! : requestBody.content;

    const title: string | null =
      requestBody.title === undefined
        ? existingEntry[0]!.entry.title
        : requestBody.title === null
          ? null
          : requestBody.title;

    const editedAt = new Date();
    await journalService.entryManager.updateAsync({
      id: entryId,
      journalId: existingEntry[0]!.entry.journalId,
      content,
      title,
      createdAt: isoToDb(existingEntry[0]!.entry.createdAt)!,
      editedAt: toDbDate(editedAt),
    } as SDBJournalEntry);

    response = {
      statusCode: 200,
      content: {
        data: {
          id: entryId,
          journalId: existingEntry[0]!.entry.journalId,
          content,
          title,
          createdAt: existingEntry[0]!.entry.createdAt,
          editedAt: editedAt.toISOString(),
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

/** Possible statusCodes: 200, 400, 404, 503 */
export async function deleteAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const pathParams = (getValidatedContractRequestData<"deleteJournalEntry">(res).params ??
    req.params) as DeleteJournalEntryPathParams;

  const entryId = parseInt(pathParams["entryId"] ?? "", 10);

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

  try {
    const existingEntry = await journalService.entryManager.getAsync(undefined, entryId, false);
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const pathParams = (getValidatedContractRequestData<"attachTagToJournalEntry">(res).params ??
    req.params) as AttachTagToJournalEntryPathParams;

  const entryId = parseInt(pathParams["entryId"] ?? "", 10);
  const requestBody = getValidatedContractRequestData<"attachTagToJournalEntry">(res)
    .body as unknown as AttachTagToJournalEntryRequestBody;
  const tagId = parseInt(requestBody.tagId ?? "", 10);

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
    const existingEntry = await journalService.entryManager.getAsync(undefined, entryId, false);
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

    const existingTag = await journalService.entryTagManager.getTagsAsync();
    if (!existingTag.find((t) => t.id === tagId)) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Journal Entry Tag with ID ${tagId} not found.`],
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
          `Failed to add tag with ID ${tagId} to Journal Entry with ID ${entryId}: ${
            (error as Error).message
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const pathParams = (getValidatedContractRequestData<"detachTagFromJournalEntry">(res).params ??
    req.params) as DetachTagFromJournalEntryPathParams;

  const entryId = parseInt(pathParams["entryId"] ?? "", 10);
  const tagId = parseInt(pathParams["tagId"] ?? "", 10);

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
    const existingEntry = await journalService.entryManager.getAsync(undefined, entryId, false);
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
          `Failed to remove tag with ID ${tagId} from Journal Entry with ID ${entryId}: ${
            (error as Error).message
          }`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
