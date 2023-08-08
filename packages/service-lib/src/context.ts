import { Context, SerializeFor } from '@apillon/lib';

export class ServiceContext extends Context {
  // override with custom props for current service if needed
}

/**
 * Get serialization strategy based on service context
 * @param context ServiceContext
 */
export function getSerializerBasedOnContext(
  context: ServiceContext,
): SerializeFor {
  return context.apiKey ? SerializeFor.APILLON_API : SerializeFor.PROFILE;
}
