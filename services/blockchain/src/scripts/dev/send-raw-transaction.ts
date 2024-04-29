import { ApiPromise, WsProvider } from '@polkadot/api';
import { typesBundle as SubsocialTypesBundle } from '../../modules/substrate/types-bundle/subsocial/definitions';
import { typesBundleForPolkadot as CrustTypesBundle } from '@crustio/type-definitions';

async function run() {
  const provider = new WsProvider(
    // 'wss://rpc.crust.network',
    'wss://para.f3joule.space', // subsocial
  );

  const api = await ApiPromise.create({
    provider,
    //typesBundle: CrustTypesBundle,
    typesBundle: SubsocialTypesBundle,
    throwOnConnect: true,
  });

  await api.isReady;
  const signedTx = api.tx('');
  try {
    await signedTx.send();
  } catch (e) {
    console.log(e);
  }
}
run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
