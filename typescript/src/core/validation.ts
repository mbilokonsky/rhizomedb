/**
 * Delta validation utilities
 * Based on RhizomeDB Specification §2.1.1
 */

import { Delta, Pointer, DomainNodeReference } from './types';

/**
 * Validation error thrown when a delta or pointer is invalid
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Check if a value is a DomainNodeReference
 */
export function isDomainNodeReference(value: any): value is DomainNodeReference {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.id === 'string' &&
    value.id.length > 0
  );
}

/**
 * Check if a value is a valid Primitive
 */
export function isPrimitive(value: any): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

/**
 * Validate a single pointer
 *
 * @throws ValidationError if pointer is invalid
 */
export function validatePointer(pointer: Pointer): void {
  // Non-empty localContext
  if (!pointer.localContext || typeof pointer.localContext !== 'string') {
    throw new ValidationError('Pointer must have non-empty localContext string');
  }

  // Valid target (either DomainNodeReference or Primitive)
  if (!isDomainNodeReference(pointer.target) && !isPrimitive(pointer.target)) {
    throw new ValidationError('Pointer target must be DomainNodeReference or Primitive');
  }

  // If targetContext is present, must be non-empty string
  if (
    pointer.targetContext !== undefined &&
    (typeof pointer.targetContext !== 'string' || pointer.targetContext.length === 0)
  ) {
    throw new ValidationError('Pointer targetContext, if present, must be non-empty string');
  }
}

/**
 * Validate a delta
 *
 * A valid delta MUST satisfy (per §2.1.1):
 * 1. Non-empty ID
 * 2. Valid timestamp (positive number)
 * 3. Non-empty author
 * 4. Non-empty system
 * 5. Valid pointers array (can be empty)
 * 6. Each pointer must be valid
 *
 * @throws ValidationError if delta is invalid
 */
export function validateDelta(delta: Delta): void {
  // 1. Non-empty ID
  if (!delta.id || typeof delta.id !== 'string') {
    throw new ValidationError('Delta must have non-empty id string');
  }

  // 2. Valid timestamp
  if (typeof delta.timestamp !== 'number' || delta.timestamp <= 0) {
    throw new ValidationError('Delta timestamp must be a positive number');
  }

  // 3. Non-empty author
  if (!delta.author || typeof delta.author !== 'string') {
    throw new ValidationError('Delta must have non-empty author string');
  }

  // 4. Non-empty system
  if (!delta.system || typeof delta.system !== 'string') {
    throw new ValidationError('Delta must have non-empty system string');
  }

  // 5. Valid pointers array
  if (!Array.isArray(delta.pointers)) {
    throw new ValidationError('Delta pointers must be an array');
  }

  // 6. Validate each pointer
  for (let i = 0; i < delta.pointers.length; i++) {
    try {
      validatePointer(delta.pointers[i]);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Invalid pointer at index ${i}: ${error.message}`);
      }
      throw error;
    }
  }
}

/**
 * Check if a delta is valid without throwing
 *
 * @returns true if delta is valid, false otherwise
 */
export function isValidDelta(delta: Delta): boolean {
  try {
    validateDelta(delta);
    return true;
  } catch {
    return false;
  }
}
