# DB migrations & seeds

Migration functions (upgradeDatabase, downgrade...) are located in at-lib and are common for all services in this repository.
However scripts, that calls migration functions and actual migration scripts are specific for each service and must be implemented directly in service.
For example, look at dev-consol-api.

## Add migrations to service

Implement or copy (from dev-console-api) required db-scripts for upgrade, downgrade, seed & unseed.
In db-scripts change db connection variables (MYSQL_HOST, ...).

Add commands to package.json

```JSON
{
    ...
    "db-upgrade": "node -r ts-node/register ./src/scripts/db/upgrade-db",
    "db-downgrade": "node -r ts-node/register ./src/scripts/db/downgrade-db",
    "db-seed": "node -r ts-node/register ./src/scripts/db/seed-db",
    "db-unseed": "node -r ts-node/register ./src/scripts/db/unseed-db"
    ...
}
```

Implement actual migrations sql scripts (upgrade & downgrade functions) in directory: src/migration-scripts/migrations or in src/migration-scripts/seeds for seeds

## Execute migrations

Migrations are execute inside service directory, so .env with DB variables must be present in service root directory.

Then run:

```
npm run db-upgrade
```
