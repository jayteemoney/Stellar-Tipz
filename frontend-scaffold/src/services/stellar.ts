/**
 * Truncates a Stellar address for display.
 * @param address The full Stellar address (G...)
 * @returns A truncated string (G...ABCD)
 */
export const truncateAddress = (address: string): string => {
  if (!address) return '';
  if (address.length <= 10) return address;
  return `${address.substring(0, 5)}...${address.substring(address.length - 5)}`;
};
