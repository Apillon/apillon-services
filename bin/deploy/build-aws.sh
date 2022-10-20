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
