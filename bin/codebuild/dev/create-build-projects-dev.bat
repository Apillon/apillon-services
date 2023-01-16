@REM aws codebuild create-project --cli-input-json file://dev-console-config-dev.json
@REM aws codebuild create-webhook --cli-input-json file://dev-console-webhook-dev.json

@REM aws codebuild create-project --cli-input-json file://access-config-dev.json
aws codebuild create-webhook --cli-input-json file://access-webhook-dev.json

aws codebuild create-project --cli-input-json file://monitoring-config-dev.json
aws codebuild create-webhook --cli-input-json file://monitoring-webhook-dev.json

aws codebuild create-project --cli-input-json file://storage-config-dev.json
aws codebuild create-webhook --cli-input-json file://storage-webhook-dev.json

aws codebuild create-project --cli-input-json file://mailing-config-dev.json
aws codebuild create-webhook --cli-input-json file://mailing-webhook-dev.json

aws codebuild create-project --cli-input-json file://config-config-dev.json
aws codebuild create-webhook --cli-input-json file://config-webhook-dev.json

aws codebuild create-project --cli-input-json file://apillon-api-config-dev.json
aws codebuild create-webhook --cli-input-json file://apillon-api-webhook-dev.json

aws codebuild create-project --cli-input-json file://auth-api-config-dev.json
aws codebuild create-webhook --cli-input-json file://auth-api-webhook-dev.json


