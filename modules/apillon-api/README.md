# Dev console API

## Endpoints

List of endpoints the API is available at:

| Environment | URL                                     |
| ----------- | --------------------------------------- |
| Development | https://console-api-dev.apillon.io/     |
| Staging     | https://console-api-staging.apillon.io/ |
| Production  | https://console-api.apillon.io/         |

## Requests

The server speaks [JSON](https://en.wikipedia.org/wiki/JSON). It is recommended that every call to the server includes a `Content-Type` header set to `application/json;`.

## Authentication and authorization

`AuthGuard` middleware performs authentication and authorization checks.

Except for the login and reset routes, API routes restrict public access and require authentication.
Requests must include a [bearer token](https://swagger.io/docs/specification/authentication/bearer-authentication/). This token can be recieved with call to (`/users/login`) endpoint.

Authorization is checked at the endpoint level in controller. Required permissions are defined with `@Permissions` decorator. Example:

```ts
@Permissions(
    { role: DefaultUserRole.PROJECT_OWNER },
    { role: DefaultUserRole.PROJECT_ADMIN },
    { role: DefaultUserRole.PROJECT_USER },
  )
  @UseGuards(AuthGuard)
```
