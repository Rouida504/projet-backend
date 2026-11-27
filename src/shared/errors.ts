// Centralise les erreurs métier avec leur statut et leur code HTTP.
export class AppError extends Error {
  // Construit une erreur métier avec statut HTTP, code stable et détails optionnels.
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

// Crée une erreur 404 pour une ressource absente.
export const notFound = (message = "Ressource introuvable") => new AppError(404, "NOT_FOUND", message);
// Crée une erreur 403 quand l'utilisateur n'a pas les droits requis.
export const forbidden = (message = "Accès interdit") => new AppError(403, "FORBIDDEN", message);
// Crée une erreur 409 pour un conflit avec l'état actuel des données.
export const conflict = (message: string, details?: unknown) => new AppError(409, "CONFLICT", message, details);
// Crée une erreur 400 contenant les détails de validation.
export const validation = (details: unknown) => new AppError(400, "VALIDATION_ERROR", "Données invalides", details);