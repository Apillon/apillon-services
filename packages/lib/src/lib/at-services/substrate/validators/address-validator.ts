// import { SubstrateChainPrefix } from '../types';
// import { checkAddress } from '@polkadot/util-crypto';
// import { isUndefined } from '@rawmodel/utils/dist/helpers/is-undefined';
// import { isNull } from '@rawmodel/utils/dist/helpers/is-null';
//
// export function substrateAddressValidator(
//   chainPrefix: SubstrateChainPrefix,
//   allowEmpty = true,
// ) {
//   return function (this: any, address: string): boolean {
//     if (allowEmpty && (isUndefined(address) || isNull(address))) {
//       return true;
//     }
//     try {
//       const [isValid] = checkAddress(address, chainPrefix);
//
//       return isValid;
//     } catch (e: any) {
//       return false;
//     }
//   };
// }
