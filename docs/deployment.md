# Deploying Apillon services

## CI/CD

Apillon services are deployed and build with **AWS Codebuild** on eu-west-1 region.
Each service and API has its own CodeBuild project defined but all are build from the same git repository. For deploying to AWS Lambda we use [Serverless Framework](https://serverless.com) and webpack plugin for code packaging.

### Runtime environments

| Environment  | Git branch | Auto build on push |
| ------------ | ---------- | ------------------ |
| dev          | develop    | ✔                  |
| staging      | stage      | ✔                  |
| test         | test       | ✔                  |
| production   | master     | ✖                  |

Currently build for production is started manually, other environments are deployed automatically on push to specific branch.

### Environment variables

Variables are loaded from S3 on build time. See `./bin/deploy/aws-build.sh`. Before build there should be updated version of variables on S3.

Majority of variables and secrets for cloud environments are also stored in AWS Secret manager.

### Build scripts and configuration files

| Path                                 | Description                                                       |
| -------------------------------      | ----------------------------------------------------------------- |
| ./buildspec.yml                      | AWS CodeBuild config file for all build & deploy projects         |
| ./buildspec-test.yml                 | AWS CodeBuild config file for test projects                       |
| *(service/api root)*/serverless.yml  | Serverless framework config file                                  |
| |
| ./bin/codebuild/*(env)*/*.json       | Definition files for Codebuild projects and webhooks              |
| ./bin/codebuild/*(env)*/*.sh         | AWS CLI commands for creating/updating/running codebuild projects |
| ./bin/sqs/*(env)*/*.json             | Definition files for SQS queues and DLQs                          |
| ./bin/sqs/create-all.sh              | AWS CLI commands for creating SQS queues                          |
| ./bin/cloudfront/*.json              | Definition files for Cloudfront for Apillon frontend              |
| ./bin/deploy/env/env.template.yml    | Template for apillon services configuration file                  |
| ./bin/deploy/build-aws.sh            | *(Currently not in use!)* Shell build script                      |
| ./bin/deploy/build-single-service.sh | Shell script that runs inside Codebuild and builds all libraries and source for one specific microservice or api                      |
| ./bin/deploy/test-aws.sh            | Shell script for running tests (or specified command) on CodeBuild instance                      |

## Creating new platform deployment environment from scratch

1. Create empty database for all services with db functionality:
    - console-api
    - access
    - monitoring (mongo)
    - storage
    - ...

2. setup S3 buckets
    - frontend app
    - storage cache

3. setup cloudfront for frontend app -> see configurations and scripts @ `/bin/cloudfront/`

4. setup CI/CD projects on codebuild -> see configurations and scripts @ `/bin/codebuild/`

5. setup SQS DLQs & Qs for workers -> see configurations and scripts @ `/bin/sqs/`
    - storage
    - authentication
    - blockchain
    - ...

6. update env vars on `s3://apillon-services-config` in correct `.yml` file

7. setup app secrets in AWS Secret manager

8. **Push the code to configured branch on git to trigger the builds or trigger them manualy**
    - Database migrations should run automatically within build

9. Setup AWS API gateway
    - create URLs and map them to the APIs
    - setup DNS records in AWS Route 53 (DNS server)

## Add deployment of new service to the environment

Steps are the same as mentioned above, but only for your new service.

## Troubleshooting

### Failed builds

- verify if all dependencies are set in each services - each service must have all dependencies listed in `package.json`
- verify in `bin/deploy/build-single-service.sh` if all the libs are set to build and link for correct service and if correct variables are set in CloudBuild.
- verify `webpack.config.js` if all local libraries are set as exception from node externals.

### Runtime errors

- check environment variables and secrets
- check cloudwatch lambda logs
- check build logs
- check lambda networking and VPC settings
