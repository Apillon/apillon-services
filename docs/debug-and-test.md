# Debuging and testing

## Debuging

The easiest way to debug the whole set of microservices in VS Code is to enable `Debug:Auto Attach` to `smart` or to mannualy attach debugger on runnig services.

### Set up debugger auto attach

Press `F1` and find in menu `Debugger: toggle auto attach` and set it to `smart`. You may need to restart integrated terminal for changes to take effect.

### Run services with debugger

In root folder of the project, type

```ssh
npm run dev
```

This will run NPM dev script in all workspaces.

If you run this command in integrated terminal of VS Code and you have Debugger auto attach enabled, breakpoints in editor should be bind to the processes and you can debug all services at the same time.

If auto attach does not work or it's not enabled, you can attach debbugger with comand F1 -> `Debug: Attach to node process`.

## Writing automated tests

For current needs we will limit our automated tests to end-to-end tests. Default testing framework for this project is [Jest](https://jestjs.io/docs/en/getting-started). Test are written in `tests` directory of each module. (e.g. `./src/modules/user/tests`). File name should end with `.e2e.test.ts` (e.g. `user.e2e.test.ts`).

In module test all possible flows of the module functionality should be tested against all types of users/permissions.

## Running automated tests

For running tests, check if all environment variables with suffix `_TEST` are correctly set. If running locally, variables should be set in your `.env` file in root folder.

```yml
# TEST config

ACCESS_FUNCTION_NAME_TEST: apillon-access-service-test
MONITORING_FUNCTION_NAME_TEST: apillon-monitoring-service-test

MONITORING_MONGO_SRV_TEST: 

ACCESS_MYSQL_HOST_TEST:
ACCESS_MYSQL_PORT_TEST: 3306
ACCESS_MYSQL_DATABASE_TEST:
ACCESS_MYSQL_USER_TEST:
ACCESS_MYSQL_PASSWORD_TEST:

DEV_CONSOLE_API_MYSQL_HOST_TEST: 
DEV_CONSOLE_API_MYSQL_PORT_TEST: 3306
DEV_CONSOLE_API_MYSQL_DATABASE_TEST:
DEV_CONSOLE_API_MYSQL_USER_TEST: 
DEV_CONSOLE_API_MYSQL_PASSWORD_TEST: 
```

### Running test servers

For testing APIs, all the microservices should run their test socket servers (or test lambdas on cloud). To start test servers locally, first run

```ssh
npm run test-server
```

> You can (auto) attach debugger to services to debug the code.

### Running API tests in console

> Make sure, that microservices test servers are running.

Run in root or API folder.

```ssh
npm run test
```

To run single test, go to **API folder** and run

```ssh
npm run test -- <search pattern>
```

> note the blank space after `--`

Search pattern is used to find file with test. You may use filename or part of filename, for example `user.e2e`

> You can (auto) attach debugger to running test to debug the API.

### Running tests inside VS Code

> Make sure, that microservices test servers are running.

Go to debugger tab and find appropriate options from the configuration dropdown menu. Currently available:

* `Jest Test API` - run all e2e tests
* `Jest Test Current File` - will run test only for currently open test file.

> Debugger will be automatically attached.
