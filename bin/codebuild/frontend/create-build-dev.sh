aws codebuild create-project --cli-input-json file://apillon-app-config-dev.json --profile apillon
aws codebuild create-webhook --cli-input-json file://apillon-app-webhook-dev.json --profile apillon

aws codebuild create-project --cli-input-json file://apillon-admin-config-dev.json --profile apillon
aws codebuild create-webhook --cli-input-json file://apillon-admin-webhook-dev.json --profile apillon
