#!/bin/bash

echo "Starting TEST script..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP

echo "Reading ENV from:"
echo $S3_CONFIG
aws s3 cp ${S3_CONFIG} ./.env
cat ./.env

APP_ENV="test"


# test turbo
# npm run build

# npm run test
# npx turbo run test --continue --concurrency=1 ${RUN_PARAMS}

${RUN_COMMAND}