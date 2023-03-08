aws codebuild create-project --cli-input-json file://dev-console-config-prod.json --profile apillon
# aws codebuild create-webhook --cli-input-json file://dev-console-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://access-config-prod.json --profile apillon
# # aws codebuild create-webhook --cli-input-json file://access-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://monitoring-config-prod.json  --profile apillon
# # aws codebuild create-webhook --cli-input-json file://monitoring-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://storage-config-prod.json --profile apillon
# # aws codebuild create-webhook --cli-input-json file://storage-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://mailing-config-prod.json --profile apillon
# # aws codebuild create-webhook --cli-input-json file://mailing-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://config-config-prod.json --profile apillon
# # aws codebuild create-webhook --cli-input-json file://config-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://referral-config-prod.json --profile apillon
## aws codebuild create-webhook --cli-input-json file://referral-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://nfts-config-prod.json --profile apillon
## aws codebuild create-webhook --cli-input-json file://nfts-webhook-prod.json --profile apillon

aws codebuild create-project --cli-input-json file://apillon-api-config-prod.json --profile apillon
## aws codebuild create-webhook --cli-input-json file://apillon-api-webhook-prod.json --profile apillon


# FRONTEND:
aws codebuild create-project --cli-input-json file://apillon-app-config-prod.json --profile apillon
## aws codebuild create-webhook --cli-input-json file://apillon-app-webhook-prod.json --profile apillon

