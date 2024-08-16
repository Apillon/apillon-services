import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import {
  AuthenticationMicroservice,
  BaseProjectQueryFilter,
  CreateEWIntegrationDto,
  EmbeddedWalletSignaturesQueryFilter,
} from '@apillon/lib';

@Injectable()
export class EmbeddedWalletService {
  async getEmbeddedWalletInfo(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new AuthenticationMicroservice(context).getEmbeddedWalletInfo(
        query.project_uuid,
      )
    ).data;
  }

  async getIntegrationsList(
    context: DevConsoleApiContext,
    query: BaseProjectQueryFilter,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).listEmbeddedWalletIntegrations(query)
    ).data;
  }

  async getIntegration(
    context: DevConsoleApiContext,
    integration_uuid: string,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).getEmbeddedWalletIntegration(integration_uuid)
    ).data;
  }

  async createIntegration(
    context: DevConsoleApiContext,
    body: CreateEWIntegrationDto,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).createEmbeddedWalletIntegration(body)
    ).data;
  }

  async updateIntegration(
    context: DevConsoleApiContext,
    integration_uuid: string,
    body: any,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).updateEmbeddedWalletIntegration(integration_uuid, body)
    ).data;
  }

  async listSignatures(
    context: DevConsoleApiContext,
    query: EmbeddedWalletSignaturesQueryFilter,
  ) {
    return (
      await new AuthenticationMicroservice(
        context,
      ).listEmbeddedWalletSignatures(query)
    ).data;
  }
}
