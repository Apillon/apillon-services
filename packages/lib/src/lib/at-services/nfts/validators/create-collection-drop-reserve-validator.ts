/**
 * Validates that dropReserve is lower or equal to maxSupply
 */
export function dropReserveLowerOrEqualToMaxSupplyValidator() {
  return function (this: any, dropReserve: number): boolean {
    if (!this.drop) {
      return true;
    }

    return dropReserve <= this.maxSupply;
  };
}
