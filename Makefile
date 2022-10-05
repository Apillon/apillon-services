DEV_CONSOLE_API_DIR="./modules/dev-console-api/"
AT_LIB_DIR="./packages/at-lib"
DOCKER_COMPOSE="docker-compose.yml"

####### BASIC COMMANDS #######
run:
	npm run dev;

build:
	cd ${AT_LIB_DIR} && npm run build && \
	cd - && npm run build;

####### DB COMMANDS #######
db-upgrade:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-upgrade; cd -;

db-downgrade:
	cd ${DEV_CONSOLE_API_DIR} && npm run db-downgrade; cd -;


####### MISC #######
run-s3:
	docker-compose -f ${DOCKER_COMPOSE} up --force-recreate
