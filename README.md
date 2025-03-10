# Apillon - A Web3 development platform

In this repository you will find source and documentation for microservices,
APIs and libraries that form Apillon services.

## Table of Contents

1. [Repository](#repository)
2. [Documentation](#documentation)
3. [License](#license)
4. [Authors](#authors)

## Repository

### Index of services

| Code | Short     | Service name                             | Package name                                          | path                      |
|------|-----------|------------------------------------------|-------------------------------------------------------|---------------------------|
| 00   | #         | Source repository root                   | [@apillon](/)                                         | /                         |
| 01   | LIB       | Common Code Library                      | [@apillon/lib](/packages/lib/)                        | /packages/lib/            |
| 02   | AMS       | Access Management Service                | [@apillon/access](/services/access/)                  | /services/access/         |
| 03   | LMAS      | Logging, Monitoring and Alerting Service | [@apillon/monitoring](/services/monitoring/)          | /services/monitoring/     |
| 04   | DEV-API   | Developer Console API                    | [@apillon/dev-console-api](/modules/dev-console-api/) | /modules/dev-console-api/ |
| 05   | AP-API    | Apillon Service API                      | [@apillon/apillon-api](/modules/apillon-api/)         | /modules/apillon-api/     |
| 06   | IPFS      | IPFS Storage Service                     | [@apillon/storage](/services/storage/)                | /services/storage/        |
| 07   | AUTH-API  | Authentication API                       | [@apillon/auth-api](/modules/auth/)                   | /modules/auth/            |
| 08   | MAIL      | Mailing Service                          | [@apillon/mailing](/services/mailing/)                | /services/mailing/        |
| 09   | MOD-LIB   | Module Code Library                      | [@apillon/modules-lib](/packages/modules-lib/)        | /packages/modules-lib/    |
| 10   | SCS       | System Configuration Service             | [@apillon/config](/services/config/)                  | /services/config/         |
| 11   | REF       | Referral program                         | [@apillon/referral](/services/referral/)              | /services/referral/       |
| 12   | NFTS      | NFTS Service                             | [@apillon/nfts](/services/nfts/)                      | /services/nfts/           |
| 13   | AUTH      | Authentication Service                   | [@apillon/auth](/services/authentication/)            | /services/authentication/ |
| 14   | TEST-LIB  | Testing Library                          | [@apillon/tests-lib](/packages/tests-lib/)            | /packages/tests-lib/      |
| 15   | WORK-LIB  | Worker Library                           | [@apillon/worker-lib](/packages/worker-lib/)          | /packages/worker-lib/     |
| 16   | BCS       | Blockchain service                       | [@apillon/blockchain](/services/blockchain/)          | /services/blockchain/     |
| 17   | SRV-LIB   | Service Code Library                     | [@apillon/service-lib](/packages/service-lib/)        | /packages/service-lib/    |
| 18   | CS        | Computing service                        | [@apillon/computing](/services/computing/)            | /services/computing/      |
| 19   | SUBS      | Social service                           | [@apillon/social](/services/social/)                  | /services/social/         |
| 20   | INFRA     | Infrastructure service                   | [@apillon/infrastructure](/services/infrastructure)   | /services/infrastructure/ |
| 21   | CONTRACTS | Contracts service                        | [@apillon/contracts](/services/contracts/)            | /services/contracts/      |
| 21   | HOSTING   | Hosting service                          | [@apillon/hosting](/services/hosting/)                | /services/hosting/        |

## Documentation

| Resource                                        | Description                                              |
|-------------------------------------------------|----------------------------------------------------------|
| [Development](docs/development.md)              | A must read for all first-time contributors to this code |
| [Rest API](docs/rest-API-specs.md)              | Basic information about request, response ...            |
| [DB migrations](docs/db-migrations.md)          | How to handle changes to database                        |
| [Debugging and testing](docs/debug-and-test.md) | How to debug services and how execute e2e tests          |
| [Deployment](docs/deployment.md)                | A service deployment to AWS                              |
| [Infrastructure](docs/infrastructure.md)        | A list of used AWS and other services                    |

## License

Please view [LICENSE.md](LICENSE.md)
