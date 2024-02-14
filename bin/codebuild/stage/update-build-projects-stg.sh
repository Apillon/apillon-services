aws codebuild update-project --cli-input-json file://dev-console-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://dev-console-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://access-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://access-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://monitoring-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://monitoring-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://storage-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://storage-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://mailing-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://mailing-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://config-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://config-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://apillon-api-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-api-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://auth-api-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://auth-api-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://auth-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://auth-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://referral-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://referral-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://nfts-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://nfts-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://blockchain-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://blockchain-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://computing-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://computing-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://social-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://social-webhook-stg.json --profile apillon

# FRONTEND:
aws codebuild update-project --cli-input-json file://apillon-app-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-app-webhook-stg.json --profile apillon
