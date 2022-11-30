aws codebuild create-project --cli-input-json file://dev-console-config-prod.json --profile authtrail
@REM aws codebuild create-webhook --cli-input-json file://dev-console-webhook-prod.json --profile authtrail

aws codebuild create-project --cli-input-json file://access-config-prod.json --profile authtrail
@REM @REM aws codebuild create-webhook --cli-input-json file://access-webhook-prod.json --profile authtrail

aws codebuild create-project --cli-input-json file://monitoring-config-prod.json --profile authtrail
@REM @REM aws codebuild create-webhook --cli-input-json file://monitoring-webhook-prod.json --profile authtrail

aws codebuild create-project --cli-input-json file://storage-config-prod.json --profile authtrail
@REM @REM aws codebuild create-webhook --cli-input-json file://storage-webhook-prod.json --profile authtrail

aws codebuild create-project --cli-input-json file://mailing-config-prod.json --profile authtrail
@REM @REM aws codebuild create-webhook --cli-input-json file://mailing-webhook-prod.json --profile authtrail


@REM FRONTEND:
aws codebuild create-project --cli-input-json file://apillon-app-config-prod.json --profile authtrail
@REM @REM aws codebuild create-webhook --cli-input-json file://apillon-app-webhook-prod.json --profile authtrail
