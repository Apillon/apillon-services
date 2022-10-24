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
npm install --omit=dev
npm run build
cd ../../modules/dev-console-api/
npm link ../../packages/at-lib --omit=dev
npm i serverless-webpack webpack-node-externals
cd ../../services/access/
npm link ../../packages/at-lib --omit=dev
npm i serverless-webpack webpack-node-externals
cd ../../services/monitoring/
npm link ../../packages/at-lib --omit=dev
npm i serverless-webpack webpack-node-externals
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
