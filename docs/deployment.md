# Deploying Apillon services

* Create databases for all services with db functionality:
  * console-api
  * access
  * monitorng (mongo)
  * storage
  * ...

* setup local .env file with correct variables

* run **migration** scripts for all services with SQL DB
  * console-api
  * access
  * storage
  * ...

* run **seed** scripts for all services with SQL DB
  * console-api
  * access
  * ...

* setup S3 buckets
  * frontend app
  * storage cache

* setup cloudfront for frontend app -> see configurations and scripts @ `/bin/cloudfront/`

* setup CI/CD projects on codebuild -> see configurations and scripts @ `/bin/codebuild/`

* setup SQS DLQs & Qs for workers -> see configurations and scripts @ `/bin/sqs/`
  * storage

* update env vars on `s3://apillon-services-config` in correct `.yml` file

* setup app secrets in AWS Secret manager

* **RUN BUILD :)**

## Troubleshooting

### Builds

* verify if all dependencies are set in each services - each service must have all dependencies listed in `package.json`

* verify in `bin/deploy/build-single-service.sh` if all the libs are set to build and link for correct service and if correct variables are set in cloudbuild.

* verify `webpack.config.js` if all libraries are set as exeption from node externals.

### Runtime

* check environment variables and secrets

* check cloudwatch lambda logs

* check build logs
