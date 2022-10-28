#!/bin/bash

echo "Cleaning environmentr..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP


# clean the environemnt
rm node_modules -r
cd packages/at-lib/
rm node_modules -r
cd ../../modules/dev-console-api/
rm node_modules -r
cd ../../services/access/
rm node_modules -r
cd ../../services/monitoring/
rm node_modules -r
cd ../../services/storage/
rm node_modules -r
cd ../..

