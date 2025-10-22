import { logEvent } from './audit';

/**
 * PUBLIC_INTERFACE
 * AppError provides typed application-level errors with user-friendly messages.
 */
export class AppError extends Error {
  /**
   * @param {string} type - error type slug
   * @param {string} message - user-facing message
   * @param {object} [meta] - optional metadata
   */
  constructor(type, message, meta = undefined) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.meta = meta;
  }
}

/**
 * PUBLIC_INTERFACE
 * Wrap a critical action with try/catch. On unexpected error, log technical details
 * to audit and either return undefined or throw an AppError with a friendly message.
 *
 * @template T
 * @param {() => T} fn - function to execute safely
 * @param {string} friendlyMessage - message to surface to the user
 * @returns {T | undefined}
 */
export function safeGuard(fn, friendlyMessage = 'Something went wrong') {
  try {
    return fn();
  } catch (err) {
    // Log technical detail to audit but avoid leaking to user
    logEvent({
      action: 'ERROR',
      before: null,
      after: null,
      reason: 'Unhandled exception',
      userId: 'anonymous',
      metadata: {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
      },
    });
    // Throwing AppError allows upper layers to present user-friendly messages if desired.
    throw new AppError('unexpected', friendlyMessage);
  }
}
