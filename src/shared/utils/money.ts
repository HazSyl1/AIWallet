// Money utility functions
// All amounts stored as paise (minor units) to avoid floating point issues

/**
 * Convert rupees to paise
 * @param rupees - Amount in rupees (e.g., 450.50)
 * @returns Amount in paise (e.g., 45050)
 */
export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

/**
 * Convert paise to rupees
 * @param paise - Amount in paise (e.g., 45050)
 * @returns Amount in rupees (e.g., 450.50)
 */
export const paiseToRupees = (paise: number): number => {
  return paise / 100;
};

/**
 * Format paise as display string with rupee symbol
 * @param paise - Amount in paise
 * @param options - Formatting options
 * @returns Formatted string (e.g., "₹450.50")
 */
export const formatMoney = (
  paise: number,
  options: {
    showSymbol?: boolean;
    showDecimals?: boolean;
  } = {}
): string => {
  const { showSymbol = true, showDecimals = true } = options;

  const rupees = paiseToRupees(paise);
  const symbol = showSymbol ? '₹' : '';

  if (showDecimals) {
    // Indian number formatting with 2 decimal places
    return `${symbol}${rupees.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // No decimals
  return `${symbol}${Math.round(rupees).toLocaleString('en-IN')}`;
};

/**
 * Parse a string amount to paise
 * Handles various Indian formats:
 * - "450.50" -> 45050
 * - "₹450.50" -> 45050
 * - "Rs. 450.50" -> 45050
 * - "4,50,000" -> 45000000
 * - "450" -> 45000
 */
export const parseAmountToPaise = (input: string): number | null => {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove currency symbols and whitespace
  let cleaned = input
    .replace(/[₹Rs.INR\s]/gi, '')
    .replace(/,/g, '')
    .trim();

  // Handle empty string
  if (!cleaned) {
    return null;
  }

  // Parse as float
  const rupees = parseFloat(cleaned);

  if (isNaN(rupees)) {
    return null;
  }

  return rupeesToPaise(rupees);
};

/**
 * Validate that amount is a valid paise value
 * Per spec: "positive integer; no floating point"
 */
export const isValidPaiseAmount = (paise: number): boolean => {
  return (
    typeof paise === 'number' &&
    Number.isInteger(paise) &&
    paise > 0 &&
    paise <= Number.MAX_SAFE_INTEGER
  );
};

/**
 * Format amount for input field (without symbol)
 */
export const formatForInput = (paise: number): string => {
  if (paise === 0) return '';
  return paiseToRupees(paise).toFixed(2);
};
