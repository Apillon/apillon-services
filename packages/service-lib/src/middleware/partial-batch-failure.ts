const defaults = {
  logger: console.error,
};
export function SqsPartialBatchFailure(
  opts: { logger?: (...args: any) => void } = {},
) {
  const { logger } = {
    ...defaults,
    ...opts,
  };
  const sqsPartialBatchFailureMiddlewareAfter = async (request) => {
    const {
      event: { Records },
      response,
    } = request;
    if (Records) {
      const batchItemFailures = [];
      for (const [idx, record] of Object.entries(Records)) {
        const { status, reason } = response[idx];
        if (status === 'fulfilled') {
          continue;
        }
        batchItemFailures.push({
          itemIdentifier: (record as any).messageId,
        });
        if (typeof logger === 'function') {
          logger(reason, record);
        }
      }
      request.response = {
        batchItemFailures,
      };
    }
  };
  return {
    after: sqsPartialBatchFailureMiddlewareAfter,
  };
}
