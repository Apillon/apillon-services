import { formatUnits } from 'ethers/lib/utils';
import { ethers } from 'ethers';

export function formatTokenWithDecimals(
  amount: string, // string rep of big number
  decimals: number,
): string {
  return formatUnits(ethers.BigNumber.from(amount), decimals);
}
