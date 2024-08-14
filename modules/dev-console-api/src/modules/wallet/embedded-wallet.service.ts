import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import {
  AuthenticationMicroservice,
  BaseProjectQueryFilter,
  OasisSignaturesQueryFilter,
} from '@apillon/lib';

@Injectable()
export class EmbeddedWalletService {
  async getIntegrationsList(
    context: DevConsoleApiContext,
    project_uuid: string,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).getOasisSignaturesCountByApiKey(project_uuid)
    ).data;
  }

  async getIntegrations(
    context: DevConsoleApiContext,
    integration_uuid: string,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).getOasisSignaturesCountByApiKey(project_uuid)
    ).data;
  }

  async createIntegration(
    context: DevConsoleApiContext,
    integration_uuid: string,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).getOasisSignaturesCountByApiKey(project_uuid)
    ).data;
  }

  async updateIntegration(
    context: DevConsoleApiContext,
    integration_uuid: string,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).getOasisSignaturesCountByApiKey(project_uuid)
    ).data;
  }

  async getOasisSignaturesCountByApiKey(
    context: DevConsoleApiContext,
    project_uuid: string,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).getOasisSignaturesCountByApiKey(project_uuid)
    ).data;
  }

  async listOasisSignatures(
    context: DevConsoleApiContext,
    query: OasisSignaturesQueryFilter,
  ) {
    return (
      await new AuthenticationMicroservice(context).listOasisSignatures(query)
    ).data;
  }
}
