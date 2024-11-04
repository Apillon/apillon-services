## Setting Up a New Apillon Microservice

To add a new microservice for the Apillon backend (BE), follow these steps to ensure integration and deployment.

### AWS Setup

Apillon uses AWS CodeBuild to automate microservice builds triggered by pushes to specific branches (e.g., `develop`, `stage`). For continuous deployment, begin by setting up build projects and configuring scripts in the `apillon/apillon-services-devops` repository.

1. **Create Configuration Files**

   - Define a new configuration file for the microservice in `bin/codebuild/<stage>/<name_of_ms>-<stage>.json`.
   - Create a webhook configuration file to enable automatic deployment upon git branch pushes: `bin/codebuild/<stage>/<name_of_ms>-webhook-<stage>.json`.

2. **Update Utility Scripts**
   - Edit the relevant utility scripts to include the new microservice, such as `create-build-projects-<stage>.sh`, `run-builds-<stage>.sh`, and `update-build-projects-<stage>.sh`.
   - Execute the `create-build-projects` script, commenting out all other microservices except the new one and its associated webhook configuration.

#### Optional: AWS SQS Queue and Worker Configuration

If the new microservice requires a queue or worker:

1. Define AWS SQS configurations for the primary queue and Dead Letter Queue (DLQ):
   - Main queue: `bin/sqs/<stage>/<name_of_ms>-queue-<stage>.json`
   - DLQ: `bin/sqs/<stage>/<name_of_ms>-queue-<stage>-dlq.json`
2. Update `bin/sqs/create-all.sh` to include the new queue configurations.
3. When ready to deploy, run `bin/sqs/create-all.sh`, commenting out all other CLI commands except those related to the new microservice.

### Database Setup

For each environment, create a separate database for the new microservice with the naming convention `Apillon_<name_of_ms>_<stage>`. This can be done via console command:

```sql
CREATE DATABASE Apillon_<name_of_ms>_<stage>;
```

### Code Structure

Place the new microservice's code in the `services` folder, with the folder name matching the microservice's name. As a quick starting point, consider duplicating a smaller service and adjusting names as needed.

### Environment Variables

Each microservice requires a unique set of environment variables for connecting to databases, AWS Lambdas, and queues. Instead of storing `.env` files on S3, use **AWS Secrets Manager** for security.

Minimum required environment variables:

- `<STAGE>_MYSQL_HOST`: Database host
- `<STAGE>_MYSQL_DATABASE`: Database name
- `<STAGE>_MYSQL_USER`: Database user
- `<STAGE>_MYSQL_PASSWORD`: Password for the database user
- `<STAGE>_MYSQL_PORT`: Database port
- `<STAGE>_FUNCTION_NAME`: Lambda function handling microservice events
- `<STAGE>_AWS_WORKER_SQS_URL`: AWS SQS queue URL
- `<STAGE>_AWS_WORKER_SQS_ARN`: Queue identifier

For production, use separate users for runtime and migrations:

- `<STAGE>_MYSQL_DEPLOY_USER`
- `<STAGE>_MYSQL_DEPLOY_PASSWORD`

### To-Do Summary

- **AWS Setup**

  - Create configuration files in `bin/codebuild` for build and webhook.
  - Update utility scripts and run `create-build-projects` for the new microservice.

- **AWS SQS (if applicable)**

  - Add SQS configurations for main queue and DLQ in `bin/sqs`.
  - Update and run `bin/sqs/create-all.sh`.

- **Database**

  - Create a database for each environment using the naming convention `Apillon_<name_of_ms>_<stage>`.

- **Code Structure**

  - Add the new microservice under `services`, reusing an existing service structure if needed.

- **Environment Variables**
  - Configure required variables in AWS Secrets Manager, including separate runtime and migration users for production.

By following these steps, you will have a fully configured and deployable Apillon microservice.
