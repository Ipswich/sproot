import { Request, Response } from "express";
import { ErrorResponse, SuccessResponse } from "@sproot/api/v2/Responses";
import { DI_KEYS } from "../../../../utils/DependencyInjectionConstants";
import { JournalService } from "../../../../journals/JournalService";
import { SDBJournal } from "@sproot/database/SDBJournal";
import type { ContractOperationPathParams } from "@sproot/sproot-common/dist/api/contracts/operation-types";
import type { operations as JournalContractOperations } from "@sproot/sproot-common/dist/api/generated/journals/types";
import { getValidatedContractRequestData } from "../../../validation/validateRequest";

type CreateJournalRequestBody =
  JournalContractOperations["createJournal"]["requestBody"]["content"]["application/json"];
type UpdateJournalRequestBody =
  JournalContractOperations["updateJournal"]["requestBody"]["content"]["application/json"];
type AttachTagToJournalRequestBody =
  JournalContractOperations["attachTagToJournal"]["requestBody"]["content"]["application/json"];
type GetJournalByIdPathParams = ContractOperationPathParams<"getJournalById">;
type UpdateJournalPathParams = ContractOperationPathParams<"updateJournal">;
type DeleteJournalPathParams = ContractOperationPathParams<"deleteJournal">;
type AttachTagToJournalPathParams = ContractOperationPathParams<"attachTagToJournal">;
type DetachTagFromJournalPathParams = ContractOperationPathParams<"detachTagFromJournal">;

/**
 * Possible statusCodes 200, 400, 404, 503
 */
export async function getAsync(
  req: Request,
  res: Response,
): Promise<SuccessResponse | ErrorResponse> {
  let response: SuccessResponse | ErrorResponse;
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  let journalId: number | undefined = undefined;
  const pathParams = (getValidatedContractRequestData<"getJournalById">(res).params ??
    req.params) as GetJournalByIdPathParams;
  if (pathParams["journalId"]) {
    journalId = parseInt(pathParams["journalId"], 10);
    if (isNaN(journalId) || journalId <= 0) {
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
    const results = await journalService.journalManager.getJournalsAsync(journalId);
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
        name: "Service Unavailable",
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const requestBody = getValidatedContractRequestData<"createJournal">(res)
    .body as unknown as CreateJournalRequestBody;
  const { title, description, icon, color } = requestBody;

  const badRequests: string[] = [];
  if (title === "" || (title != null && title.length > 64)) {
    badRequests.push("Journal name is required and cannot exceed 64 characters.");
  }
  if (icon !== undefined && icon !== null && icon.length > 64) {
    badRequests.push("Journal icon cannot exceed 64 characters.");
  }
  if (color !== undefined && color !== null && color.length > 64) {
    badRequests.push("Journal color cannot exceed 64 characters.");
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

  const startDate = new Date();
  const journalTitle = title as string;
  try {
    const newId = await journalService.journalManager.createJournalAsync(
      journalTitle,
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
          title: journalTitle,
          description: description ?? null,
          icon: icon ?? null,
          color: color ?? null,
          archived: false,
          archivedAt: null,
          createdAt: startDate.toISOString(),
          editedAt: startDate.toISOString(),
        } as SDBJournal,
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
  const journalService = req.app.get(DI_KEYS.JournalService) as JournalService;
  const pathParams = (getValidatedContractRequestData<"updateJournal">(res).params ??
    req.params) as UpdateJournalPathParams;
  const requestBody = (getValidatedContractRequestData<"updateJournal">(res).body ??
    {}) as UpdateJournalRequestBody;

  const journalId = parseInt(pathParams["journalId"] ?? "", 10);
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

  try {
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
      requestBody.archived === undefined
        ? existingJournal[0]!.journal.archived
        : requestBody.archived;

    // If trying to make changes to an already archived journal,
    // or trying to archive a journal that is already archived, return an error
    const title: string =
      requestBody.title === undefined ? existingJournal[0]!.journal.title : requestBody.title;

    const description: string | null =
      requestBody.description === undefined
        ? existingJournal[0]!.journal.description
        : requestBody.description === null || requestBody.description === ""
          ? null
          : requestBody.description;
    const badRequests: string[] = [];
    if (title === "" || title.length > 64) {
      badRequests.push("Journal title cannot be empty or exceed 64 characters.");
    }
    if (description !== null && description.length > 65535) {
      badRequests.push("Journal description cannot exceed 65535 characters.");
    }
    if (archived === true && existingJournal[0]!.journal.archived) {
      badRequests.push("Journal is archived; archive must be false to make changes.");
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

    const icon: string | null =
      requestBody.icon === undefined
        ? existingJournal[0]!.journal.icon
        : requestBody.icon === null || requestBody.icon === ""
          ? null
          : requestBody.icon;

    const color: string | null =
      requestBody.color === undefined
        ? existingJournal[0]!.journal.color
        : requestBody.color === null || requestBody.color === ""
          ? null
          : requestBody.color;

    // existingJournal contains ISO formatted timestamps for responses
    const createdAtIso = existingJournal[0]!.journal.createdAt;
    const editedAtIso = new Date().toISOString();
    const archivedAt =
      archived === true && !existingJournal[0]!.journal.archived
        ? editedAtIso
        : archived === false && existingJournal[0]!.journal.archived
          ? null
          : existingJournal[0]!.journal.archivedAt;

    await journalService.journalManager.updateJournalAsync({
      id: journalId,
      title,
      description,
      icon,
      color,
      archived,
      createdAt: createdAtIso,
      editedAt: editedAtIso,
      archivedAt: archivedAt,
    });

    response = {
      statusCode: 200,
      content: {
        data: {
          id: journalId,
          title,
          description,
          icon,
          color,
          archived,
          createdAt: createdAtIso,
          editedAt: editedAtIso,
          archivedAt,
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
        details: [`Failed to update Journal: ${(error as Error).message}`],
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
  const pathParams = (getValidatedContractRequestData<"deleteJournal">(res).params ??
    req.params) as DeleteJournalPathParams;

  const journalId = parseInt(pathParams["journalId"] ?? "", 10);
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

  try {
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
        name: "Service Unavailable",
        url: req.originalUrl,
        details: [`Failed to delete Journal with ID ${journalId}: ${(error as Error).message}`],
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
  const pathParams = (getValidatedContractRequestData<"attachTagToJournal">(res).params ??
    req.params) as AttachTagToJournalPathParams;
  const journalId = parseInt(pathParams["journalId"] ?? "", 10);
  const requestBody = getValidatedContractRequestData<"attachTagToJournal">(res)
    .body as unknown as AttachTagToJournalRequestBody;
  const tagId = parseInt(requestBody.tagId ?? "", 10);

  const badRequests: string[] = [];
  if (isNaN(journalId)) {
    badRequests.push("Valid Journal ID is required.");
  }
  if (isNaN(tagId)) {
    badRequests.push("Valid tag ID is required.");
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

    if (existingJournal[0]!.tags.some((t) => t.id === tagId)) {
      response = {
        statusCode: 200,
        content: {
          data: `Journal with ID ${journalId} already has tag with ID ${tagId}.`,
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    const tagExists = await journalService.journalTagManager
      .getTagsAsync()
      .then((tags) => tags.some((t) => t.id === tagId));
    if (!tagExists) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [`Tag with ID ${tagId} not found.`],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    await journalService.journalManager.addTagAsync(journalId, tagId);
    response = {
      statusCode: 200,
      content: {
        data: `Tag with ID ${tagId} added to journal with ID ${journalId}.`,
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
          `Failed to add tag with ID ${tagId} to journal with ID ${journalId}: ${
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
  const pathParams = (getValidatedContractRequestData<"detachTagFromJournal">(res).params ??
    req.params) as DetachTagFromJournalPathParams;
  const journalId = parseInt(pathParams["journalId"] ?? "", 10);
  const tagId = parseInt(pathParams["tagId"] ?? "", 10);

  const badRequests: string[] = [];
  if (isNaN(journalId)) {
    badRequests.push("Valid Journal ID is required.");
  }
  if (isNaN(tagId)) {
    badRequests.push("Valid tag ID is required.");
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

    if (!existingJournal[0]!.tags.some((t) => t.id === tagId)) {
      response = {
        statusCode: 404,
        error: {
          name: "Not Found",
          url: req.originalUrl,
          details: [
            `Journal with ID ${journalId} does not have tag with ID ${tagId} and cannot be removed.`,
          ],
        },
        ...res.locals["defaultProperties"],
      };
      return response;
    }

    await journalService.journalManager.removeTagAsync(journalId, tagId);
    response = {
      statusCode: 200,
      content: {
        data: `Tag with ID ${tagId} removed from journal with ID ${journalId}.`,
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
          `Failed to remove tag with ID ${tagId} from journal with ID ${journalId}: ${
            (error as Error).message
          }`,
        ],
      },
      ...res.locals["defaultProperties"],
    };
  }
  return response;
}
