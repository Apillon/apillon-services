aws codebuild update-project --cli-input-json file://dev-console-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://access-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://monitoring-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://storage-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://mailing-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://config-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://referral-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://nfts-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://apillon-api-config-prod.json --profile apillon
aws codebuild update-project --cli-input-json file://blockchain-config-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://apillon-app-config-prod.json --profile apillon