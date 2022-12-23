BRED='\033[1;31m'         # Red
BGreen='\033[1;32m'     # Green
NC='\033[0m' # No Color

DEV_CONSOLE_API_DIR="./modules/dev-console-api/"
AUTH_API_DIR="./modules/authentication-api"
AT_LIB_DIR="./packages/at-lib"
DOCKER_COMPOSE="docker-compose.yml"

MODULES = apillon-api authentication-api dev-console-api
PACKAGES = lib modules-lib tests-lib workers-lib

####### BASIC COMMANDS #######
run-dev:
	npm run dev;

build:
	npm run build;

install:
	npm install

reinstall: clean install

clean:
	echo ${NC}Removing root${BGreen}node_modules${NC} ; \
	rm -rf node_modules; \

	for file in $(MODULES); do \
		echo ${NC}Removing${BGreen}node_modules${NC}in${BRED}$${file}${NC} ; \
		rm -rf modules/$${file}/node_modules; \
	done;
	for file in $(PACKAGES); do \
		echo ${NC}Removing${BGreen}node_modules${NC}in${BRED}$${file}${NC} ; \
		rm -rf packages/$${file}/node_modules; \
	done;

.SILENT: clean reinstall


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
