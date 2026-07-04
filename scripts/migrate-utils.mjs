/**
 * Convert ISO 8601 timestamp to MySQL DATETIME format
 * @param {string} isoTimestamp - ISO 8601 timestamp (e.g., "2026-04-01T00:00:00.000Z")
 * @returns {string|null} - MySQL DATETIME format or null if invalid
 */
export function convertTimestamp(isoTimestamp) {
  if (!isoTimestamp) {
    return null;
  }
  
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) {
      return null;
    }
    
    // Format: YYYY-MM-DD HH:MM:SS.mmm
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    const ms = String(date.getUTCMilliseconds()).padStart(3, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
  } catch (error) {
    return null;
  }
}

/**
 * Convert value to NULL if undefined, else return value
 * @param {any} value - Value to check
 * @returns {any|null}
 */
export function nullIfUndefined(value) {
  return value === undefined ? null : value;
}

/**
 * Truncate string to max length
 * @param {string} str - String to truncate
 * @param {number} maxLength - Max length
 * @returns {string|null}
 */
export function truncate(str, maxLength) {
  if (!str) return null;
  if (str.length > maxLength) {
    return str.substring(0, maxLength);
  }
  return str;
}
