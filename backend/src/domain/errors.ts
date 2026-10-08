/**
 * Typed domain errors. The HTTP layer maps each class to a status code, and the
 * `code` travels to the client so the UI can react without parsing messages.
 */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string, code = 'VALIDATION_ERROR', details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Recurso no encontrado', code = 'NOT_FOUND') {
    super(code, message);
  }
}

export class ConflictError extends DomainError {
  constructor(message: string, code = 'CONFLICT', details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'No autorizado', code = 'UNAUTHORIZED') {
    super(code, message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Acceso denegado', code = 'FORBIDDEN') {
    super(code, message);
  }
}

/** A request that is well-formed but breaks a business rule (e.g. not enough balance). */
export class BusinessRuleError extends DomainError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

/**
 * The action needs the Premium plan (code PREMIUM_REQUIRED) or exceeds a limit of
 * the free plan (code PLAN_LIMIT). Mapped to HTTP 402 so the UI can show the paywall.
 */
export class PaymentRequiredError extends DomainError {
  constructor(
    code: 'PREMIUM_REQUIRED' | 'PLAN_LIMIT',
    message: string,
    details?: Record<string, unknown>
  ) {
    super(code, message, details);
  }
}
