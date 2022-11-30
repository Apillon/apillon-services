DEV_CONSOLE_API_DIR="./modules/dev-console-api/"
AUTH_API_DIR="./modules/authorization-api"
AT_LIB_DIR="./packages/at-lib"
DOCKER_COMPOSE="docker-compose.yml"

####### BASIC COMMANDS #######
run:
	npm run dev;

build:
	npm run build

####### DB COMMANDS #######
db-upgrade-dev-console:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-upgrade; cd -;

db-downgrade-dev-console:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-downgrade; cd -;

db-upgrade-auth-api:
	cd ${AUTH_API_DIR} && npm run db-upgrade; cd -;

db-downgrade-auth-api:
	cd ${AUTH_API_DIR} && npm run db-downgrade; cd -;


####### MISC #######
run-s3:
	docker-compose -f ${DOCKER_COMPOSE} up --force-recreate
