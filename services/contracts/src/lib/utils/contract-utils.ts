import {
  BlockchainMicroservice,
  ChainType,
  Context,
  EvmChain,
  HttpException,
  LogType,
  ServiceName,
} from '@apillon/lib';
import { EVMContractClient } from '../../modules/clients/evm-contract.client';
import { errors, utils } from 'ethers';
import {
  ContractsCodeException,
  ContractsValidationException,
} from '../exceptions';

export async function getEvmContractClient(
  context: Context,
  chain: EvmChain,
  contractAbi: unknown[],
  contractAddress?: string,
) {
  const rpcEndpoint = (
    await new BlockchainMicroservice(context).getChainEndpoint(
      chain,
      ChainType.EVM,
    )
  ).data?.url;

  return EVMContractClient.getInstance(
    rpcEndpoint,
    contractAbi,
    contractAddress,
  );
}

// TODO: move?
export async function handleEthersException(
  error: unknown,
  abi: unknown[],
  property: string,
  project_uuid: string,
  user_uuid: string,
): Promise<void> {
  // if (
  //   typeof e === 'object' &&
  //   'reason' in e &&
  //   typeof e.reason === 'string'
  // ) {
  //   throw new Error(e.reason);
  //   //throw new Error(`${e.code}: value ${e.value} is not valid for argument ${e.argument}`);
  // } else if (typeof e === 'object' && 'data' in e) {
  //   let error: any;
  //   try {
  //     const iface = new utils.Interface(contract.abi);
  //     const decodedError = iface.parseError(e.data as any);
  //     error = decodedError.name;
  //   } catch (decodeError) {
  //     error = `Failed to decode error: ${decodeError}`;
  //   }
  //   throw new Error(error);
  // } else {
  //   throw e;
  // }
  console.error('Error calling contract function:', error);
  if (typeof error !== 'object') {
    throw new ContractsCodeException({
      // TODO: code=0
      code: 0,
      status: 500,
      errorMessage: `${error}`,
    });
  }

  // Handle RPC errors
  if ('code' in error && 'message' in error) {
    switch (error.code) {
      case errors.INVALID_ARGUMENT:
      case errors.MISSING_ARGUMENT:
      case errors.UNEXPECTED_ARGUMENT: {
        throw new ContractsValidationException({
          code: `${error.code}`,
          property:
            'argument' in error ? `${property}.${error.argument}` : property,
          message: `${error.message}`,
        });
      }
      default: {
        throw new ContractsCodeException({
          code: error.code,
          status: 500,
          // context?: ,
          errorMessage: `${error.message}`,
        });
      }
    }
  }

  // Decode error data if available
  if ('data' in error) {
    let errorMessage: string;
    try {
      const iface = new utils.Interface(abi);
      const decodedError = iface.parseError(error.data as any);
      errorMessage = `${decodedError}`;
    } catch (decodeError) {
      errorMessage = `${decodeError}`;
    }
    throw new ContractsCodeException({
      // TODO: code=0
      code: 0,
      status: 500,
      errorMessage: `${errorMessage}`,
    });
  }

  const exception = new ContractsCodeException({
    // TODO: code=0
    code: 0,
    status: 500,
    errorMessage: `${error}`,
  });
  await exception.writeToMonitor({
    logType: LogType.ERROR,
    service: ServiceName.CONTRACTS,
    project_uuid,
    user_uuid,
    data: {
      exception,
    },
    sendAdminAlert: true,
  });

  throw error;
}
