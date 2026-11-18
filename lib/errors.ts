export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message?: string, status: number = 400) {
    super(message || code);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

