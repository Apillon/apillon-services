import { ServiceContext } from '../context';

export function InitializeContextAndFillUser() {
  const before = async (request) => {
    //Event contains data, which is sent from API to microservice.
    //APIs should add user, that is making request, to the params.
    //This middleware fills context user

    const newContext: ServiceContext = new ServiceContext();
    newContext.user = request.user;

    request.serviceContext = newContext;
  };

  return { before };
}
