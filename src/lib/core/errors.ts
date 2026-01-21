/**
 * Base class for domain errors.
 * Extend this for specific error types.
 */
export class DomainError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'DomainError';
	}
}

/**
 * Thrown when an entity is not found.
 */
export class NotFoundError extends DomainError {
	constructor(entity: string, id: string) {
		super(`${entity} not found: ${id}`);
		this.name = 'NotFoundError';
	}
}

/**
 * Thrown when a state transition is invalid.
 * Example: trying to submit scores when tournament is not live.
 */
export class InvalidStateError extends DomainError {
	constructor(message: string) {
		super(message);
		this.name = 'InvalidStateError';
	}
}

/**
 * Thrown when validation fails.
 */
export class ValidationError extends DomainError {
	constructor(message: string) {
		super(message);
		this.name = 'ValidationError';
	}
}

/**
 * Thrown when user lacks permission for an action.
 */
export class UnauthorizedError extends DomainError {
	constructor(message: string = 'Unauthorized') {
		super(message);
		this.name = 'UnauthorizedError';
	}
}

/**
 * Thrown when a business rule is violated.
 * Example: team must have exactly 1 male + 1 female pro.
 */
export class BusinessRuleError extends DomainError {
	constructor(message: string) {
		super(message);
		this.name = 'BusinessRuleError';
	}
}
