aws codebuild update-project --cli-input-json file://apillon-app-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-app-webhook-dev.json --profile apillon

aws codebuild update-project --cli-input-json file://apillon-admin-config-dev.json --profile apillon
aws codebuild update-webhook --cli-input-json file://apillon-admin-webhook-dev.json --profile apillon