aws sqs create-queue --queue-name apillon-storage-queue-dev-dlq --attributes file://dev/storage-queue-dev-dlq.json --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-dev --attributes file://dev/storage-queue-dev.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-storage-queue-staging-dlq --attributes file://staging/storage-queue-staging-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-staging --attributes file://staging/storage-queue-staging.json  --region eu-west-1

aws sqs create-queue --queue-name apillon-storage-queue-production-dlq --attributes file://production/storage-queue-production-dlq.json  --region eu-west-1
aws sqs create-queue --queue-name apillon-storage-queue-production --attributes file://production/storage-queue-production.json  --region eu-west-1