aws codebuild update-project --cli-input-json file://dev-console-config-prod.json --profile apillon
@REM aws codebuild update-webhook --cli-input-json file://dev-console-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://access-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://access-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://monitoring-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://monitoring-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://storage-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://storage-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://mailing-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://mailing-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://config-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://config-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://referral-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://referral-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://nfts-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://nfts-webhook-prod.json --profile apillon

aws codebuild update-project --cli-input-json file://apillon-api-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://apillon-api-webhook-prod.json --profile apillon


@REM FRONTEND:
aws codebuild update-project --cli-input-json file://apillon-app-config-prod.json --profile apillon
@REM @REM aws codebuild update-webhook --cli-input-json file://apillon-app-webhook-prod.json --profile apillon
