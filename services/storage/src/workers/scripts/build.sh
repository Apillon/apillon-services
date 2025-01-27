#!/bin/bash

set -e

# Variables
REPO_URL=$1
WEBSITE_UUID=$2
BUILD_COMMAND=$3
INSTALL_COMMAND=$4
BUILD_DIR=$5
APILLON_API_KEY=$6
APILLON_API_SECRET=$7

APP_DIR=/tmp/github-app

rm -rf "$APP_DIR"

# Clone the repository and checkout the specified branch
echo "Cloning repository $REPO_URL..."

mkdir -p $APP_DIR

(git clone --progress $1 $APP_DIR 2>&1 | tee logs/true ) > logs/cmd.stdout > logs/cmd.stderr

# Navigate to the app directory
cd $APP_DIR

# Install dependencies and build
echo "Installing dependencies..."

# Check if install command is provided and run it
if [ -n "$INSTALL_COMMAND" ]; then
  echo "Running install command: $INSTALL_COMMAND"
  $INSTALL_COMMAND
  echo "Install completed successfully."
else
  echo "Install command not set"
fi

# Check if a build command is provided and run it
if [ -n "$BUILD_COMMAND" ]; then
  echo "Running custom build command: $BUILD_COMMAND"
  $BUILD_COMMAND
  echo "Build completed successfully."
else
  echo "Build command not set"
fi

echo $APILLON_API_URL

# SET values for Apillon

echo "Uploading the website to Apillon..."
apillon hosting deploy-website $BUILD_DIR --uuid "$WEBSITE_UUID" --key "$APILLON_API_KEY" --secret "$APILLON_API_SECRET"