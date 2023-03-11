import { ServiceContext } from '../scripts/context';

export function InitializeContextAndFillUser() {
  const before = async (request) => {
    //Event contains data, which is sent from API to microservice.
    //APIs should add user, that is making request, to the params.
    //This middleware fills context user
    const { context } = request;

    const newContext: ServiceContext = new ServiceContext();
    newContext.user = request.event.user;
    newContext.requestId = request.event.requestId || context.requestId;

    context.serviceContext = newContext;
  };

  return { before };
}
