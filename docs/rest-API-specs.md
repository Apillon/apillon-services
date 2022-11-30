# REST API specifications

All REST API services should have same request and response structure. To achieve that, try to write code according to standards.
See dev-console-api project on how to write controllers and service functions.

## Request

Use POST method for inserts and method executions, PATCH method for updating existing db records

## Response

POST methods, which creates new db records, should responded with status and inserted data.

```json
{
  "status": 201,
  "data": {
    "id": 3,
    "status": 5,
    "name": "Projekt 3",
    "shortDescription": "MOj prvi projekt",
    "description": "Tole je pa opis"
  }
}
```

PATCH methods should return status 200 - OK.

## Error handling

Errors should be caught and returned in standard way. If possible, use exception.filter.ts implemented in dev-console-api.
Error response example:

```json
{
  "status": 500,
  "code": 500001,
  "message": "Error: Column 'user_uuid' cannot be null",
  "path": "/user",
  "timestamp": "2022-09-16T08:03:43.592Z"
}
```

Exception classes are defined in at-lib/src/lib/exceptions.

### Validation errors

Errors of type `ValidationException`.

```json
{
  "status": 422,
  "model": "CreateUserDto",
  "errors": [
    {
      "code": 422002,
      "property": "email",
      "message": "CREATE_USER_DTO_EMAIL_NOT_PRESENT"
    }
  ],
  "path": "/user",
  "timestamp": "2022-09-16T08:09:29.137Z"
}
```
