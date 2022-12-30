#!/bin/bash

echo "Starting TEST script..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP

echo "Reading ENV from:"
echo $S3_CONFIG
aws s3 cp ${S3_CONFIG} ./.env
cat ./.env

APP_ENV="testing"


# test turbo
npm run build

npm run test