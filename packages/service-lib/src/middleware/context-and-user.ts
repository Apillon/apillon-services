import { ServiceContext } from '../context';

/**
 * Context middleware
 * @returns Service context object with received  user object
 */
export function InitializeContextAndFillUser() {
  const before = async (request) => {
    //Event contains data, which is sent from API to microservice.
    //APIs should add user, that is making request, to the params.
    //This middleware fills context user
    const { context } = request;

    const serviceContext: ServiceContext = new ServiceContext();
    serviceContext.user = request.event.user;
    serviceContext.apiKey = request.event.apiKey;
    serviceContext.apiName = request.event.apiName;
    serviceContext.requestId = request.event.requestId || context.requestId;

    context.serviceContext = serviceContext;
  };

  return { before };
}
