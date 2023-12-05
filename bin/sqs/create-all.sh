aws sqs create-queue --queue-name apillon-storage-queue-dev-dlq --attributes file://dev/storage-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-dev --attributes file://dev/storage-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-storage-queue-staging-dlq --attributes file://staging/storage-queue-staging-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-staging --attributes file://staging/storage-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-storage-queue-production-dlq --attributes file://production/storage-queue-production-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-production --attributes file://production/storage-queue-production.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-storage-queue-test-dlq --attributes file://test/storage-queue-test-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-test --attributes file://test/storage-queue-test.json  --region eu-west-1



aws sqs create-queue --queue-name apillon-nfts-queue-dev-dlq --attributes file://dev/nfts-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-nfts-queue-dev --attributes file://dev/nfts-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-nfts-queue-staging-dlq --attributes file://staging/nfts-queue-staging-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-nfts-queue-staging --attributes file://staging/nfts-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-nfts-queue-production-dlq --attributes file://production/nfts-queue-production-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-nfts-queue-production --attributes file://production/nfts-queue-production.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-nfts-queue-test-dlq --attributes file://test/nfts-queue-test-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-nfts-queue-test --attributes file://test/nfts-queue-test.json  --region eu-west-1



aws sqs create-queue --queue-name apillon-computing-queue-dev-dlq --attributes file://dev/computing-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-computing-queue-dev --attributes file://dev/computing-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-computing-queue-staging-dlq --attributes file://staging/computing-queue-staging-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-computing-queue-staging --attributes file://staging/computing-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-computing-queue-production-dlq --attributes file://production/computing-queue-production-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-computing-queue-production --attributes file://production/computing-queue-production.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-computing-queue-test-dlq --attributes file://test/computing-queue-test-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-computing-queue-test --attributes file://test/computing-queue-test.json  --region eu-west-1



aws sqs create-queue --queue-name apillon-auth-queue-dev-dlq --attributes file://dev/auth-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-auth-queue-dev --attributes file://dev/auth-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-auth-queue-staging-dlq --attributes file://staging/auth-queue-staging-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-auth-queue-staging --attributes file://staging/auth-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-auth-queue-production-dlq --attributes file://production/auth-queue-production-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-auth-queue-production --attributes file://production/auth-queue-production.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-auth-queue-test-dlq --attributes file://test/auth-queue-test-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-auth-queue-test --attributes file://test/auth-queue-test.json  --region eu-west-1


aws sqs create-queue --queue-name apillon-blockchain-queue-dev-dlq --attributes file://dev/blockchain-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-blockchain-queue-dev --attributes file://dev/blockchain-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-blockchain-queue-staging-dlq --attributes file://staging/blockchain-queue-staging-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-blockchain-queue-staging --attributes file://staging/blockchain-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-blockchain-queue-production-dlq --attributes file://production/blockchain-queue-production-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-blockchain-queue-production --attributes file://production/blockchain-queue-production.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-monitoring-queue-dev-dlq --attributes file://dev/monitoring-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-monitoring-queue-dev --attributes file://dev/monitoring-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-monitoring-queue-staging-dlq --attributes file://staging/monitoring-queue-staging-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-monitoring-queue-staging --attributes file://staging/monitoring-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-monitoring-queue-production-dlq --attributes file://production/monitoring-queue-production-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-monitoring-queue-production --attributes file://production/monitoring-queue-production.json  --region eu-west-1


aws sqs create-queue --queue-name apillon-config-queue-dev-dlq --attributes file://dev/config-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-config-queue-dev --attributes file://dev/config-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-config-queue-staging-dlq --attributes file://staging/config-queue-staging-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-config-queue-staging --attributes file://staging/config-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-config-queue-production-dlq --attributes file://production/config-queue-production-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-config-queue-production --attributes file://production/config-queue-production.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-config-queue-test-dlq --attributes file://test/config-queue-test-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-config-queue-test --attributes file://test/config-queue-test.json  --region eu-west-1
