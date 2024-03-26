# DB migrations & seeds

Migration functions (upgradeDatabase, downgrade...) and Seed funcions (seed, unseed) and `Migrator` class are located in `@apillon/lib`. They and are common for all services and APIs in this repository.
However scripts, that calls Migrator's functions and actual migration scripts are slightly specific for each service and must be implemented directly in service.
For example, look at `dev-console-api`.

## Add migrations to service

Implement or copy (from dev-console-api) required db-scripts for upgrade, downgrade, seed & unseed.
In db-scripts change db connection variables (MYSQL_HOST, ...).

Add commands to package.json

```JSON
{
    "scripts": {
        ...
        "db-upgrade": "node -r ts-node/register ./src/scripts/db/upgrade-db",
        "db-downgrade": "node -r ts-node/register ./src/scripts/db/downgrade-db",
        "db-seed": "node -r ts-node/register ./src/scripts/db/seed-db",
        "db-unseed": "node -r ts-node/register ./src/scripts/db/unseed-db"
        ...
    }
    ...
}
```

Implement actual migrations sql scripts (upgrade & downgrade functions) in directory: src/migration-scripts/migrations or in src/migration-scripts/seeds for seeds
Note that migrations are ordered by a sequence number specified at the beginning of the file name of the migration, for example `1-users.ts`, `2-projects.ts` etc.

## Execute migrations

Migrations are executed inside service directory, so .env with DB variables must be present in service root directory.

Then run:

```sh
npm run db-upgrade
```

## Automatic migration and seed before build

Migrations and seeds can be executed automatically before building for specific environment on AWS Codebuild. To achieve that there must be following script added to the `package.json`

```JSON
{
    "scripts" : {
        ...
        "db-upgrade:ci": "node -r ts-node/register ./src/scripts/db/upgrade-db --F && node -r ts-node/register ./src/scripts/db/seed-db --F "
        ...
    }
    ...
}
```
