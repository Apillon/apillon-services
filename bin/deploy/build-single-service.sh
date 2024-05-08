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
npm -v
npm install -g npm@latest
npm -v
npm cache clean --force
echo "Building libraries..."
cd packages/lib/
echo "Building @apillon/lib"
npm cache verify
npm install --omit=dev
npm run build
npm link
cd ../../

if [ "$MODULES_LIB" == "true" ]
then
  echo "Building @apillon/modules-lib"
  cd packages/modules-lib/
  npm cache verify
  npm install --omit=dev
  npm run build
  npm link
  cd ../../
else
  echo "Building @apillon/service-lib"
  cd packages/service-lib/
  npm cache verify
  npm install --omit=dev
  npm run build
  npm link
  cd ../../
fi

if [ "$WORKERS_LIB" == "true" ]
then
  echo "Building @apillon/workers-lib"
  cd packages/workers-lib/
  npm cache verify
  npm install --omit=dev
  npm run build
  npm link
  cd ../../
fi

echo "Building service:"
echo $SERVICE_PATH
cd ${SERVICE_PATH}
npm cache verify
npm link @apillon/lib --omit=dev
if [ "$MODULES_LIB" == "true" ]
then
  echo "Linking modules-lib"
  npm link @apillon/modules-lib --omit=dev
else
  echo "Linking service-lib"
  npm link @apillon/service-lib --omit=dev
fi
if [ "$WORKERS_LIB" == "true" ]
then
  echo "Linking workers-lib"
  npm link @apillon/workers-lib --omit=dev
fi

echo "Installing build dependencies"
npm i serverless-webpack copy-webpack-plugin webpack webpack-node-externals ts-loader

echo "Installation of dependencies complete"
npm ls

if [ "$DB_MIGRATIONS" == "true" ]
then
  # requires VPC access to DB and configuration from secret manager
  echo "Running migrations"
  npm run db-upgrade:ci
fi

echo "Deploying to $ENV..."
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
echo "Deploy complete!"
