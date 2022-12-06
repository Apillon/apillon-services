aws codebuild create-project --cli-input-json file://dev-console-config-stg.json --profile authtrail
aws codebuild create-webhook --cli-input-json file://dev-console-webhook-stg.json --profile authtrail

aws codebuild create-project --cli-input-json file://access-config-stg.json --profile authtrail
aws codebuild create-webhook --cli-input-json file://access-webhook-stg.json --profile authtrail

aws codebuild create-project --cli-input-json file://monitoring-config-stg.json  --profile authtrail
aws codebuild create-webhook --cli-input-json file://monitoring-webhook-stg.json --profile authtrail

aws codebuild create-project --cli-input-json file://storage-config-stg.json --profile authtrail
aws codebuild create-webhook --cli-input-json file://storage-webhook-stg.json --profile authtrail

aws codebuild create-project --cli-input-json file://mailing-config-stg.json --profile authtrail
aws codebuild create-webhook --cli-input-json file://mailing-webhook-stg.json --profile authtrail

aws codebuild create-project --cli-input-json file://staging-config-stg.json --profile authtrail
aws codebuild create-webhook --cli-input-json file://staging-webhook-stg.json --profile authtrail

