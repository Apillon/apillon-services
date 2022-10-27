export function FillUser() {
  const before = async (request) => {
    //Event contains data, which is sent from API to microservice.
    //APIs should add user, that is making request, to the params.
    //This middleware fills context user
    const { context } = request;
    context.user = request.event.user;
  };

  return { before };
}
