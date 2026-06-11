type ApiResponseBase = {
  statusCode: number;
  timestamp: string;
  requestId: string;
};

type SuccessResponse = ApiResponseBase & {
  content?: {
    data: any;
    nextCursor?: string;
  };
};

type ErrorResponse = ApiResponseBase & {
  error: {
    name: string;
    url: string;
    details: string[];
  };
};

export type { SuccessResponse, ErrorResponse };
