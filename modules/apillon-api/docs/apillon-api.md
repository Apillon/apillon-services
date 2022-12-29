# Apillon API

Apillon API is set of RESTful API endpoints, intended for developers to integrate Apillon modules into their applications.

## Requests

The server speaks [JSON](https://en.wikipedia.org/wiki/JSON). It's recommended that every call to the server includes a `Content-Type` header set to `application/json;`.

## Authentication and authorization

API routes restrict public access and require authentication. \
Requests must include a basic auth (https://en.wikipedia.org/wiki/Basic_access_authentication) HTTP header field in the form of `Authorization: Basic <credentials>`, where credentials is the Base64 encoding of Api key and api key secret joined by a single colon `:` \
Api keys could be generated in developer console (https://app.apillon.io/dashboard/api-keys), under project settings.

### Authentication errors

Every request goes through authentication middleware where following errors can occour: \
| Status | Message | Description
|-|-|-
|400|Missing Authorization header|Request is missing Authorization header
|400|Malformed Authorization header|Authorization header field has invalid form
|401|Invalid API key or API key secret|Authorization header is valid, but credentials in it are not.

### Authorization errors

Each endpoint requires certain role or permission from API key. \
Basically there are three types of permission, that could be assigned to API key:

| Code | Name        | Description                                    |
| ---- | ----------- | ---------------------------------------------- |
| 50   | KEY_EXECUTE | Permission to execute certain actions          |
| 51   | KEY_WRITE   | Permission to create, modify or delete records |
| 52   | KEY_READ    | Permission to read record                      |

Those permission could be assigned to API key for every attached service (storage (CRUST), authentication(KILT), ...)

If request is made with API key, which lacks permission for called endpoint, following error can occour: \
| Status | Message | Description
|-|-|-
|403|Insufficient permissins - missing `permission name` permission|API key lacks required permission for called service
|403|Insufficient permissions to access this record|Api key has required permissions for endpoint, however, he does not have the right to access addressed record (record belongs to another project, ...)

## Responses

Every response has a unique ID which helps identifying potential problems. It also includes a status code that can help identifying the cause of a potential problem.

Query requests through `GET` method can return status codes `200`, `400`, `401`, `403` or `500`. Mutations through `POST`, `PUT` and `DELETE` can return also codes `201` and `422`. Invalid routes return status code `404`.

- **200**: Success.
- **201**: Successfully created.
- **400**: Bad request.
- **401**: Unauthenticated access.
- **403**: Unauthorized access.
- **404**: Path not found.
- **422**: Data validation failed.
- **500**: System error.

Successful request include a `data` key, which hold a valid response object.

```js
{
  "id": ...,
  "status": ...,
  "data": { ... },
}
```

## Error handling

Request fails, if response code is not 200 or 201. Apillon API returns two types of error:

### Code exception

This is general error with below fields:
| Field | Description
|-|-
| id | Request unique ID
| code | Apillon API internal error code, to make iz easier to find the cause of the error
| message | Message, describing the error
| path | Endpoint, which threw the error
| timestamp | The date when error occurred

```js
{
    "id": "c46821e7-a6c3-4377-bc32-0001e348ceb4",
    "code": 40406005,
    "message": "FILE_DOES_NOT_EXISTS",
    "path": "/storage/cee9f151-a371-495b-acd2-4362fbb87780/file/xxx/detail",
    "timestamp": "2022-12-29T11:54:47.555Z"
}
```

### Validation exception

Unprocessable entity `422 Error status ` includes a `errors` key, which holds a list of error objects.\
Mostly this error occures, when request body is not valid (invalid or missing keys).

Fields in validation exception:
| Field | Description
|-|-
| id | Request unique ID
| model | Apillon API model that was used to validate request payload
| errors | Array of errors
| path | Endpoint, which threw the error
| timestamp | The date when error occurred

Errors include a unique code number, property which caused the error and an error message. The code number helps identifying potential problems and points to the exact position in the system.

```js
{
  ...
  "errors": [
    {
        "code": 42200008,
        "property": "fileName",
        "message": "FILE_NAME_NOT_PRESENT"
    },
  ]
}
```
