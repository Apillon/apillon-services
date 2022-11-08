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
cd ../../

echo "Building service:"
echo $SERVICE_PATH
cd ${SERVICE_PATH}
npm link ../../packages/lib --omit=dev
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
fi
