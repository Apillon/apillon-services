#!/bin/bash

echo "Cleaning environmentr..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP


# clean the environemnt
rm node_modules -r
cd packages/lib/
rm node_modules -r
cd ../../modules/dev-console-api/
rm node_modules -r
cd ../../modules/apillon-api/
rm node_modules -r
cd ../../modules/authentication-api/
rm node_modules -r
cd ../../services/access/
rm node_modules -r
cd ../../services/monitoring/
rm node_modules -r
cd ../../services/storage/
rm node_modules -r
cd ../../services/mailing/
rm node_modules -r
cd ../../services/config/
rm node_modules -r
cd ../..

