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
echo "Building libraries..."
cd packages/lib/
npm install --omit=dev
npm run build
npm link
cd ../../

if [ "$MODULES_LIB" == "true" ]
then
  cd packages/modules-lib/
  npm install --omit=dev
  npm run build
  npm link
  cd ../../
fi

if [ "$WORKERS_LIB" == "true" ]
then
  cd packages/workers-lib/
  npm install --omit=dev
  npm run build
  npm link
  cd ../../
fi

echo "Building service:"
echo $SERVICE_PATH
cd ${SERVICE_PATH}
npm link @apillon/lib --omit=dev
if [ "$MODULES_LIB" == "true" ]
then
  npm link @apillon/modules-lib --omit=dev
if [ "$WORKERS_LIB" == "true" ]
then
  npm link @apillon/workers-lib --omit=dev

npm i serverless-webpack copy-webpack-plugin webpack webpack-node-externals ts-loader

if [ "$ENV" == "staging" ]
then
  npm run deploy:staging
elif [ "$ENV" == "development" ]
then
  npm run deploy:dev
elif [ "$ENV" == "production" ]
then
  npm run deploy:prod
elif [ "$ENV" == "test" ]
then
  npm run deploy:test
fi
