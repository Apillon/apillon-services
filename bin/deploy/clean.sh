#!/bin/bash

echo "Cleaning environment..."
TIMESTAMP="$(date +%s)"
echo $TIMESTAMP


# clean the environemnt
rm node_modules .turbo dist -rf
cd packages/lib/
rm node_modules .turbo dist -rf
cd ../modules-lib/
rm node_modules .turbo dist -rf
cd ../service-lib/
rm node_modules .turbo dist -rf
cd ../tests-lib/
rm node_modules .turbo dist -rf
cd ../workers-lib/
rm node_modules .turbo dist -rf

cd ../../modules/dev-console-api/
rm node_modules .turbo dist -rf
cd ../../modules/apillon-api/
rm node_modules .turbo dist -rf
cd ../../modules/authentication-api/
rm node_modules .turbo dist -rf

cd ../../services/access/
rm node_modules .turbo dist -rf
cd ../../services/monitoring/
rm node_modules .turbo dist -rf
cd ../../services/storage/
rm node_modules .turbo dist -rf
cd ../../services/mailing/
rm node_modules .turbo dist -rf
cd ../../services/config/
rm node_modules .turbo dist -rf
cd ../../services/authentication/
rm node_modules .turbo dist -rf
cd ../../services/blockchain/
rm node_modules .turbo dist -rf
cd ../../services/computing/
rm node_modules .turbo dist -rf
cd ../../services/nfts/
rm node_modules .turbo dist -rf
cd ../../services/referral/
rm node_modules .turbo dist -rf
cd ../../services/social/
rm node_modules .turbo dist -rf
cd ../../services/infrastructure/
rm node_modules .turbo dist -rf

cd ../..

