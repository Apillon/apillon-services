DEV_CONSOLE_API_DIR="./modules/dev-console-api/"
AT_LIB_DIR="./packages/at-lib"

db-upgrade:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-upgrade; cd -;

db-downgrade:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-downgrade; cd -;

build:
	cd ${AT_LIB_DIR} && npm run build && \
	cd - && npm run build;
