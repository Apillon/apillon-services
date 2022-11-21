import {
  //   Attestation,
  //   Blockchain,
  //   Claim,
  //   ConfigService,
  //   Credential,
  connect,
  //   CType,
  //   Did,
  //   ICType,
  KiltKeyringPair,
  //   ICredential,
  //   KeyringPair,
} from '@kiltprotocol/sdk-js';
import { env } from '@apillon/lib';
import // createAccount,
// createFullDid,
// generateKeypairs,
// getCtypeSchema,
'./utils';
import { Presentation } from '../../config/types';
import * as fs from 'fs';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { generateKeypairs } from './utils';
