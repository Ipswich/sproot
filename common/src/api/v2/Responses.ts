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
    url: string;
    details: [];
  };
};

export type { Success, Error };
