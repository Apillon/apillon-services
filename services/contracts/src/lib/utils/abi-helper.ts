import { utils } from 'ethers';
// import { Abi } from 'abitype/zod';
// import { ZodError } from 'zod';

// TODO: move to evm lib
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

  toHumanReadable() {
    return new utils.Interface(this.abi).format(utils.FormatTypes.full);
  }

  validateCallMethod(methodName: string, methodArguments: unknown[]) {
    const methods = this.findFunctionMethod(methodName);
    if (methods.length <= 0) {
      throw new AbiHelperMissingMethodError('method not found');
    }
    const atLeastOneValidMethod = methods.reduce(
      (accumulator: boolean, method: object & Record<'inputs', unknown>) => {
        return (
          accumulator ||
          (this.areArgumentsValid(method, methodArguments) &&
            this.isMethodCallNonPayable(method))
        );
      },
      false,
    );
    if (!atLeastOneValidMethod) {
      throw new AbiHelperNotAllowedError('cannot call method');
    }
  }

  validateConstructorCall(methodArguments: unknown[]) {
    const methods = this.findConstructorMethods();
    if (methods.length <= 0) {
      throw new AbiHelperMissingMethodError('constructor not found');
    }
    const atLeastOneValidConstructor = methods.reduce(
      (accumulator: boolean, method: object & Record<'inputs', unknown>) => {
        return (
          accumulator ||
          (this.areArgumentsValid(method, methodArguments) &&
            this.isMethodCallNonPayable(method))
        );
      },
      false,
    );
    if (!atLeastOneValidConstructor) {
      throw new AbiHelperNotAllowedError('cannot call constructor');
    }
  }

  /*****************
   * PRIVATE HELPERS
   ******************/

  private findFunctionMethod(methodName: string) {
    return this.abi.filter(
      (method: unknown) =>
        typeof method === 'object' &&
        'name' in method &&
        typeof method.name === 'string' &&
        method.name == methodName &&
        'type' in method &&
        method.type === 'function',
    );
  }

  private findConstructorMethods() {
    return this.abi.filter(
      (method: unknown) =>
        typeof method === 'object' &&
        'type' in method &&
        typeof method.type === 'string' &&
        method.type == 'constructor',
    );
  }

  private areArgumentsValid(
    method: object & Record<'inputs', unknown>,
    methodArguments: unknown[],
  ) {
    return (
      'inputs' in method &&
      Array.isArray(method.inputs) &&
      method.inputs.length === methodArguments.length
    );
  }

  private isMethodCallNonPayable(method: object & Record<'inputs', unknown>) {
    return (
      'stateMutability' in method && method.stateMutability === 'nonpayable'
    );
  }
}
