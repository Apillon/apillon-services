#!/bin/bash

echo "Starting build script..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP

echo "Building for environment:"
echo $ENV

echo "Reading ENV from:"
echo $S3_CONFIG
aws s3 cp ${S3_CONFIG} ./bin/deploy/env/env.yml
cat ./bin/deploy/env/env.yml

# prepare the environemnt
cd packages/at-lib/
npm i
npm run build
cd ../../modules/dev-console-api/
npm link at-lib ../../packages/at-lib
cd ../../services/access/
npm link at-lib ../../packages/at-lib
cd ../../services/monitoring/
npm link at-lib ../../packages/at-lib
cd ../..

if [ "$ENV" == "staging" ]
then

  npm run deploy:staging

elif [ "$ENV" == "development" ]
then

  npm run deploy:dev

elif [ "$ENV" == "production" ]
then

  npm run deploy:prod

fi
