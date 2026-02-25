/**
 * Utility functions for converting between different formats
 */

/**
 * Converts a camelCase string to snake_case
 * @param str - The camelCase string to convert
 * @returns The snake_case string
 * @example
 * camelToSnake('myVariableName') // returns 'my_variable_name'
 */
export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

/**
 * Converts a snake_case string to camelCase
 * @param str - The snake_case string to convert
 * @returns The camelCase string
 * @example
 * snakeToCamel('my_variable_name') // returns 'myVariableName'
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Converts a timestamp (milliseconds since epoch) to a Date object
 * @param timestamp - The timestamp to convert, or null/undefined
 * @returns A Date object or undefined if timestamp is null/undefined
 */
export function timestampToDate(timestamp: number | null | undefined): Date | undefined {
  return timestamp ? new Date(timestamp) : undefined;
}

/**
 * Converts a Date object to a timestamp (milliseconds since epoch)
 * @param date - The Date object to convert, or null/undefined
 * @returns A timestamp or null if date is null/undefined
 */
export function dateToTimestamp(date: Date | null | undefined): number | null {
  return date ? date.getTime() : null;
}
