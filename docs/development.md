# Developmant docs

## Services and service codes

| Code | Short   | Service name                             | Package name             | path                      |
| ---- | ------- | ---------------------------------------- | ------------------------ | ------------------------- |
| 00   | #       | Apillon Web3 Services                    | @apillon                 | /                         |
| 01   | LIB     | Service Code Library                     | @apillon/lib             | /packages/lib/            |
| 02   | AMS     | Access Management Service                | @apillon/access          | /services/access/         |
| 03   | LMAS    | Logging, Monitoring and Alerting Service | @apillon/monitoring      | /services/monitoring/     |
| 04   | DEV-API | Developer Console API                    | @apillon/dev-console-api | /modules/dev-console-api/ |
| 05   | AP-API  | Apillon Service API                      | @apillon/apillon-api     | /modules/apillon-api/     |
| 06   | IPFS    | IPFS Storage Service                     | @apillon/storage         | /services/storage/        |
| 07   | AUTH    | Authentication API                       | @apillon/auth-api        | /modules/auth/            |
| 08   | MAIL    | Mailing Service                          | @apillon/mailing         | /services/mailing/        |
| 09   | MOD-LIB | Module Code Library                      | @apillon/modules-lib     | /packages/modules-lib/    |
| 10   | SCS     | System Configuration Service             | @apillon/config          | /services/config          |
| 11   | BC      | Blockchain service                       | @apillon/blockchain      | /services/blockchain      |

## Error codes

> code format : HTTPCODE | MODULE_CODE | MODULE_INTERNAL_ERROR_CODE

- HTTP CODE = 422 for valdiation, 400 for invalid request, 500 internal error,...
- MODULE CODE: see service codes
- INTERNAL ERROR CODE: 000 - 999
