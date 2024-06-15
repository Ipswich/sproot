type ApiResponseBase = {
  statusCode: number;
  timestamp: string;
  requestId: string;
};

type Success = ApiResponseBase & {
  content?: {
    data: object;
    moreDataAvailable?: boolean;
  };
};

type Error = ApiResponseBase & {
  error: {
    name: string;
    fullPath: string;
    details: string [];
  };
};

export type { Success, Error }