#!/bin/bash

echo "Starting TEST script..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP

APP_ENV="test"

npm run test:ci