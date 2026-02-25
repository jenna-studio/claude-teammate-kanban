/**
 * Validation utilities for input validation
 */

import { ValidationError } from '../types/index.js';

/**
 * Validates that a string is not empty
 * @param value - The string to validate
 * @param fieldName - The name of the field being validated
 * @throws {ValidationError} If the string is empty or only whitespace
 */
export function validateNonEmptyString(value: string | null | undefined, fieldName: string): void {
  if (!value || value.trim().length === 0) {
    throw new ValidationError(`${fieldName} cannot be empty`, fieldName);
  }
}

/**
 * Validates that a value is a valid UUID
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @throws {ValidationError} If the value is not a valid UUID
 */
export function validateUUID(value: string | null | undefined, fieldName: string): void {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!value || !uuidRegex.test(value)) {
    throw new ValidationError(`${fieldName} must be a valid UUID`, fieldName);
  }
}

/**
 * Validates that a number is within a range
 * @param value - The number to validate
 * @param fieldName - The name of the field being validated
 * @param min - Minimum allowed value (inclusive)
 * @param max - Maximum allowed value (inclusive)
 * @throws {ValidationError} If the number is out of range
 */
export function validateNumberRange(
  value: number | null | undefined,
  fieldName: string,
  min: number,
  max: number
): void {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName);
  }
  if (value < min || value > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`,
      fieldName
    );
  }
}

/**
 * Validates that a value is one of the allowed values
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated
 * @param allowedValues - Array of allowed values
 * @throws {ValidationError} If the value is not in the allowed values
 */
export function validateEnum<T>(
  value: T | null | undefined,
  fieldName: string,
  allowedValues: readonly T[]
): void {
  if (!value || !allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`,
      fieldName
    );
  }
}

/**
 * Safely parses JSON, returning null if parsing fails
 * @param json - The JSON string to parse
 * @returns The parsed object or null if parsing fails
 */
export function safeJsonParse<T>(json: string | null | undefined): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

/**
 * Safely stringifies an object to JSON
 * @param obj - The object to stringify
 * @returns The JSON string or null if the object is null/undefined
 */
export function safeJsonStringify(obj: any): string | null {
  if (obj === null || obj === undefined) return null;
  try {
    return JSON.stringify(obj);
  } catch {
    return null;
  }
}
