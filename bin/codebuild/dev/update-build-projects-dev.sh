aws codebuild update-project --cli-input-json file://dev-console-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://dev-console-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://access-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://access-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://monitoring-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://monitoring-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://storage-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://storage-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://mailing-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://mailing-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://config-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://config-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://apillon-api-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-api-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://auth-api-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://auth-api-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://auth-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://auth-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://referral-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://referral-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://nfts-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://nfts-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://blockchain-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://blockchain-webhook-dev.json --profile apillon

