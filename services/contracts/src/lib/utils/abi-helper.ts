import { utils } from 'ethers';
// import { Abi } from 'abitype/zod';
// import { ZodError } from 'zod';

export class AbiHelperError extends Error {}

export class AbiHelperMissingMethodError extends AbiHelperError {}

export class AbiHelperNotAllowedError extends AbiHelperError {}

export class AbiHelper {
  private abi: unknown[];

  constructor(abi: unknown[]) {
    this.abi = abi;
  }

  // static getAbiAndBytecode(artifact: string): {
  //   abi: unknown[];
  //   bytecode: string;
  // } {
  //   const artifactObject = JSON.parse(artifact);
  //   if (typeof artifactObject !== 'object') {
  //     throw new Error('Artifact is not an object');
  //   }
  //   if (
  //     !('bytecode' in artifactObject) ||
  //     typeof artifactObject.bytecode !== 'string'
  //   ) {
  //     throw new Error('Artifact is missing or has invalid bytecode');
  //   }
  //   if (!('abi' in artifactObject) || !Array.isArray(artifactObject.abi)) {
  //     throw new Error('Artifact is missing or has invalid ABI');
  //   }
  //
  //   return { abi: artifactObject.abi, bytecode: artifactObject.bytecode };
  // }
  //
  // static validateAbi(abi: unknown[]) {
  //   try {
  //     const parsedAbi = Abi.parse(abi);
  //     return null;
  //   } catch (e: unknown) {
  //     if (e instanceof ZodError) {
  //       return e.errors.map((issue) => ({
  //         code: `${issue.code}`,
  //         property: 'artifact',
  //         message: `${issue.message}`,
  //       }));
  //     }
  //     throw e;
  //   }
  // }

  /**
   * Returns ABI with mandatory items
   */
  // getCleanAbi() {
  //   return this.abi.filter(
  //     (item: unknown) =>
  //       typeof item === 'object' &&
  //       'type' in item &&
  //       typeof item.type === 'string' &&
  //       ['constructor', 'function'].includes(item.type),
  //   );
  // }

  toHumanReadable() {
    return new utils.Interface(this.abi).format(utils.FormatTypes.full);
  }

  static validateCallMethod(abi: unknown[], methodName: string) {
    const method = abi.find(
      (method: unknown) =>
        typeof method === 'object' &&
        'name' in method &&
        typeof method.name === 'string' &&
        method.name == methodName,
    );
    if (
      !method ||
      typeof method !== 'object' ||
      !('type' in method) ||
      method.type !== 'function'
    ) {
      throw new AbiHelperMissingMethodError('Missing method in ABI');
    }

    if (
      !('stateMutability' in method) ||
      method.stateMutability !== 'nonpayable'
    ) {
      throw new AbiHelperNotAllowedError('cannot call method');
    }
  }
}
