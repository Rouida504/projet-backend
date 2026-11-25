export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (message = "Ressource introuvable") => new AppError(404, "NOT_FOUND", message);
export const forbidden = (message = "Accès interdit") => new AppError(403, "FORBIDDEN", message);
export const conflict = (message: string, details?: unknown) => new AppError(409, "CONFLICT", message, details);
export const validation = (details: unknown) => new AppError(400, "VALIDATION_ERROR", "Données invalides", details);