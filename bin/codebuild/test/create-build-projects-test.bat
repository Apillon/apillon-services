@REM aws codebuild create-project --cli-input-json file://dev-console-config-test.json
@REM aws codebuild create-webhook --cli-input-json file://dev-console-webhook-test.json

aws codebuild create-project --cli-input-json file://access-config-test.json
aws codebuild create-webhook --cli-input-json file://access-webhook-test.json

aws codebuild create-project --cli-input-json file://monitoring-config-test.json
aws codebuild create-webhook --cli-input-json file://monitoring-webhook-test.json

aws codebuild create-project --cli-input-json file://storage-config-test.json
aws codebuild create-webhook --cli-input-json file://storage-webhook-test.json

aws codebuild create-project --cli-input-json file://mailing-config-test.json
aws codebuild create-webhook --cli-input-json file://mailing-webhook-test.json

aws codebuild create-project --cli-input-json file://config-config-test.json
aws codebuild create-webhook --cli-input-json file://config-webhook-test.json

