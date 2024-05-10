#!/bin/bash

#fail on first error
set -e

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
yarn -v
echo "Building libraries..."
cd packages/lib/
echo "Building @apillon/lib"
yarn install --production=true
yarn run build
yarn link
cd ../../

if [ "$MODULES_LIB" == "true" ]
then
  echo "Building @apillon/modules-lib"
  cd packages/modules-lib/
  yarn install --production=true
  yarn run build
  yarn link
  cd ../../
else
  echo "Building @apillon/service-lib"
  cd packages/service-lib/
  yarn install --production=true
  yarn run build
  yarn link
  cd ../../
fi

if [ "$WORKERS_LIB" == "true" ]
then
  echo "Building @apillon/workers-lib"
  cd packages/workers-lib/
  yarn install --production=true
  yarn run build
  yarn link
  cd ../../
fi

echo "Building service:"
echo $SERVICE_PATH
cd ${SERVICE_PATH}
yarn link @apillon/lib --omit=dev
if [ "$MODULES_LIB" == "true" ]
then
  echo "Linking modules-lib"
  yarn link @apillon/modules-lib --omit=dev
else
  echo "Linking service-lib"
  yarn link @apillon/service-lib --omit=dev
fi
if [ "$WORKERS_LIB" == "true" ]
then
  echo "Linking workers-lib"
  yarn link @apillon/workers-lib --omit=dev
fi

echo "Installing build dependencies"
yarn add serverless-webpack copy-webpack-plugin webpack webpack-node-externals ts-loader

echo "Installation of dependencies complete"
yarn list

if [ "$DB_MIGRATIONS" == "true" ]
then
  # requires VPC access to DB and configuration from secret manager
  echo "Running migrations"
  yarn run db-upgrade:ci
fi

echo "Deploying to $ENV..."
if [ "$ENV" == "staging" ]
then
  yarn run deploy:staging
elif [ "$ENV" == "development" ]
then
  yarn run deploy:dev
elif [ "$ENV" == "production" ]
then
  yarn run deploy:prod
elif [ "$ENV" == "test" ]
then
  yarn run deploy:test
fi
echo "Deploy complete!"
