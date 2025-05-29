import { DeploySecretDto } from './at-services/deploy/dtos/deploy-secret.dto';
import { ValidatorErrorCode } from '../config/types';
import { ValidationException } from './exceptions/exceptions';

interface EnvUpdate {
  key: string;
  value: string;
}

/**
 * Overrides or adds environment variables in the provided list based on the updates provided.
 *
 * @param envVariables - The array of environment variable objects, each containing a `key` and a `value`.
 * @param updates - An array of update objects, each containing a `key` and a `value`.
 * @return The updated array of environment variable objects after applying the updates.
 */
export function overrideEnvironmentVariables(
  envVariables: any[],
  updates: DeploySecretDto[] | EnvUpdate[],
) {
  for (const update of updates) {
    if (update.value) {
      const existingVariable = envVariables?.find((v) => v.key === update.key);
      if (existingVariable) {
        existingVariable.value = update.value;
      } else {
        envVariables.push({
          key: update.key,
          value: update.value,
        });
      }
    }
  }
  return envVariables;
}

/**
 * Validates the presence of required variables in the provided variable list.
 * Throws a ValidationException if any required variables are missing.
 *
 * @param propertyPrefix The prefix to be used for constructing property names in error messages.
 * @param variables The list of variables to be validated.
 * @param requiredVariableKeys The list of keys representing the required variables to validate against.
 * @return Resolves if all required variables are present, otherwise rejects with a validation error.
 */
export async function assertRequiredVariables(
  propertyPrefix: string,
  variables: DeploySecretDto[],
  requiredVariableKeys: string[],
) {
  const errors = requiredVariableKeys.reduce<
    Array<{
      code: ValidatorErrorCode;
      property: string;
      message: string;
    }>
  >((acc, variableKey) => {
    if (!variables.some((v) => v.key === variableKey)) {
      acc.push({
        code: ValidatorErrorCode.DATA_NOT_PRESENT,
        property: `${propertyPrefix}.${variableKey}`,
        message: variableKey,
      });
    }
    return acc;
  }, []);

  if (errors.length > 0) {
    throw new ValidationException(errors);
  }
}
