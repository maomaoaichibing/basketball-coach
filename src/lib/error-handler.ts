// ============================================// 错误处理模块// ============================================

// 错误类型
export enum ErrorType {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
}

// 错误响应接口
export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    type: ErrorType;
    code: string;
    details?: unknown;
  };
  timestamp: string;
}

// 错误类
export class AppError extends Error {
  public type: ErrorType;
  public code: string;
  public details?: unknown;

  constructor(message: string, type: ErrorType, code: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.code = code;
    this.details = details;
  }
}

// 错误处理工具
export const ErrorHandler = {
  // 创建错误响应
  createErrorResponse(error: AppError): ErrorResponse {
    return {
      success: false,
      message: error.message,
      error: {
        type: error.type,
        code: error.code,
        details: error.details,
      },
      timestamp: new Date().toISOString(),
    };
  },

  // 处理API错误
  handleApiError(error: unknown): ErrorResponse {
    if (error instanceof AppError) {
      return this.createErrorResponse(error);
    }

    // 处理其他错误
    const err = error as { message?: string; stack?: string };
    return {
      success: false,
      message: err.message || '服务器内部错误',
      error: {
        type: ErrorType.INTERNAL_SERVER_ERROR,
        code: 'INTERNAL_ERROR',
        details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      },
      timestamp: new Date().toISOString(),
    };
  },

  // 创建常见错误
  badRequest(message: string, code: string = 'BAD_REQUEST', details?: unknown): AppError {
    return new AppError(message, ErrorType.BAD_REQUEST, code, details);
  },

  unauthorized(message: string = '未授权访问', code: string = 'UNAUTHORIZED'): AppError {
    return new AppError(message, ErrorType.UNAUTHORIZED, code);
  },

  forbidden(message: string = '禁止访问', code: string = 'FORBIDDEN'): AppError {
    return new AppError(message, ErrorType.FORBIDDEN, code);
  },

  notFound(message: string = '资源不存在', code: string = 'NOT_FOUND'): AppError {
    return new AppError(message, ErrorType.NOT_FOUND, code);
  },

  internalServerError(
    message: string = '服务器内部错误',
    code: string = 'INTERNAL_ERROR',
    details?: unknown
  ): AppError {
    return new AppError(message, ErrorType.INTERNAL_SERVER_ERROR, code, details);
  },

  validationError(message: string, code: string = 'VALIDATION_ERROR', details?: unknown): AppError {
    return new AppError(message, ErrorType.VALIDATION_ERROR, code, details);
  },

  databaseError(
    message: string = '数据库错误',
    code: string = 'DATABASE_ERROR',
    details?: unknown
  ): AppError {
    return new AppError(message, ErrorType.DATABASE_ERROR, code, details);
  },

  externalApiError(
    message: string = '外部API错误',
    code: string = 'EXTERNAL_API_ERROR',
    details?: unknown
  ): AppError {
    return new AppError(message, ErrorType.EXTERNAL_API_ERROR, code, details);
  },
};
