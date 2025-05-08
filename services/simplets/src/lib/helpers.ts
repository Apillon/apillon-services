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
  updates: EnvUpdate[],
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
