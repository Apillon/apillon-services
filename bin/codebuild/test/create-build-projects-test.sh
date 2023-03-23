# aws codebuild create-project --cli-input-json file://dev-console-config-test.json --profile apillon
# aws codebuild create-webhook --cli-input-json file://dev-console-webhook-test.json --profile apillon

aws codebuild create-project --cli-input-json file://access-config-test.json --profile apillon
aws codebuild create-webhook --cli-input-json file://access-webhook-test.json --profile apillon

aws codebuild create-project --cli-input-json file://monitoring-config-test.json  --profile apillon
aws codebuild create-webhook --cli-input-json file://monitoring-webhook-test.json --profile apillon

aws codebuild create-project --cli-input-json file://storage-config-test.json --profile apillon
aws codebuild create-webhook --cli-input-json file://storage-webhook-test.json --profile apillon

aws codebuild create-project --cli-input-json file://mailing-config-test.json --profile apillon
aws codebuild create-webhook --cli-input-json file://mailing-webhook-test.json --profile apillon

aws codebuild create-project --cli-input-json file://config-config-test.json --profile apillon
aws codebuild create-webhook --cli-input-json file://config-webhook-test.json --profile apillon


aws codebuild create-project --cli-input-json file://auth-config-test.json  --profile apillon
aws codebuild create-webhook --cli-input-json file://auth-webhook-test.json  --profile apillon

aws codebuild create-project --cli-input-json file://nfts-config-test.json  --profile apillon
aws codebuild create-webhook --cli-input-json file://nfts-webhook-test.json  --profile apillon

aws codebuild create-project --cli-input-json file://referral-config-test.json  --profile apillon
aws codebuild create-webhook --cli-input-json file://referral-webhook-test.json  --profile apillon

# run tests
aws codebuild create-project --cli-input-json file://run-test-config.json  --profile apillon


