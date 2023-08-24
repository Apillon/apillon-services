aws codebuild update-project --cli-input-json file://apillon-app-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-app-webhook-stg.json --profile apillon

aws codebuild update-project --cli-input-json file://apillon-admin-config-stg.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-admin-webhook-stg.json --profile apillon
