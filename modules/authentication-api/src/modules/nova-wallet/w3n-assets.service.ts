/*
https://docs.nestjs.com/providers#services
*/

import { Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { W3nAssetsDto } from './dtos/w3n-assets.dto';
import { callApillonApi } from '@apillon/modules-lib';
import { CodeException, env, getEnvSecrets } from '@apillon/lib';
import axios from 'axios';
import { v4 as uuidV4 } from 'uuid';
import {
  AuthenticationErrorCode,
  InternalErrorErrorCode,
} from '../../config/types';

@Injectable()
export class W3nAssetsService {
  async uploadAssetsToIpfs(
    context: AuthenticationApiContext,
    body: W3nAssetsDto,
  ) {
    //Validate wallets --> https://github.com/KILTprotocol/spec-KiltTransferAssetRecipient
    const assets = Object.keys(body.assets);
    for (const asset of assets) {
      const regex = new RegExp(
        '[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}/[-a-z0-9]{3,8}:[-.%a-zA-Z0-9]{1,128}',
      );
      if (!regex.test(asset)) {
        throw new CodeException({
          code: AuthenticationErrorCode.UPLOAD_WALLETS_INVALID_ASSETS,
          status: 422,
          errorCodes: AuthenticationErrorCode,
        });
      }
    }

    await getEnvSecrets();

    if (
      !env.NOVA_WALLET_API_KEY ||
      !env.NOVA_WALLET_API_KEY_SECRET ||
      !env.NOVA_WALLET_BUCKET_UUID
    ) {
      throw new CodeException({
        status: 500,
        code: InternalErrorErrorCode.NOVA_WALLET_ENV_VARIABLES_NOT_SET,
      });
    }

    //Get upload session & URLs
    const uploadSession = await callApillonApi(
      env.NOVA_WALLET_API_KEY,
      env.NOVA_WALLET_API_KEY_SECRET,
      'POST',
      `/storage/${env.NOVA_WALLET_BUCKET_UUID}/upload`,
      {
        files: [
          {
            fileName: `${uuidV4()}.json`,
          },
        ],
      },
    );

    const uploadUrl = uploadSession.data.files[0];

    //Upload to S3
    await axios.put(uploadUrl.url, body.assets);

    //End session
    await callApillonApi(
      env.NOVA_WALLET_API_KEY,
      env.NOVA_WALLET_API_KEY_SECRET,
      'POST',
      `/storage/${env.NOVA_WALLET_BUCKET_UUID}/upload/${uploadSession.data.sessionUuid}/end`,
      {},
    );

    return { fileUuid: uploadUrl.fileUuid };
  }

  async getFileDetail(context: AuthenticationApiContext, uuid: string) {
    return (
      await callApillonApi(
        env.NOVA_WALLET_API_KEY,
        env.NOVA_WALLET_API_KEY_SECRET,
        'GET',
        `/storage/${env.NOVA_WALLET_BUCKET_UUID}/file/${uuid}/detail`,
      )
    ).data;
  }
}
