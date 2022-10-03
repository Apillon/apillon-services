DEV_CONSOLE_API_DIR="./modules/dev-console-api/"

db-upgrade:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-upgrade; cd -;

db-downgrade:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-downgrade; cd -;
