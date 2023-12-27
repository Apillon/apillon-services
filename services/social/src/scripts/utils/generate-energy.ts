import { SubsocialApi } from '@subsocial/api';
import { convertToBalanceWithDecimal } from '@subsocial/utils';

export const signAndSendTx = async (
  tx: any,
  accountId: string,
  callback?: (result: any) => void,
) => {
  const { web3FromAddress } = await import('@polkadot/extension-dapp');
  const accounts = await getAllAccounts();

  const addresses = accounts.map((account) => account.address);

  const containsAddress = addresses.includes(accountId);
  if (!containsAddress) {
    throw Error('Address not found on Polkadot.js extension.');
  }

  const { signer } = await web3FromAddress(accountId);
  await tx.signAsync(accountId, { signer });

  await tx.send(callback ?? logTransaction);
};

export async function run() {
  const burnAmount = 1; // 1 SUB

  const parsedBurnAmount = convertToBalanceWithDecimal(burnAmount, 10); // SUB token uses 10 decimals, SOON (testnet) uses 12 decimals

  // or you can just multiply it manually
  // const parsedBurnAmount = burnAmount * 10 ** 10
  const config = {
    substrateNodeUrl: 'wss://xsocial.subsocial.network',
    ipfsNodeUrl: 'https://gw.crustfiles.app',
  };
  const api: SubsocialApi = await SubsocialApi.create(config);
  const substrateApi = await api.substrateApi;

  const target = '5EqMze969gCJxWFAZ1P1pcSax1tD5YtKqPrzkVyPZSmiNVaB'; // change it to target account
  const tx = substrateApi.tx.energy.generateEnergy(
    target,
    parsedBurnAmount.toString(),
  );

  // Add the selected account address, to get all connected accounts
  // use the [getAllAccounts] method.
  const account = '<selected_account_address>';

  // Signing the transaction and sending for execution.
  signAndSendTx(tx, account, async (result) => {
    const { status } = result;

    if (!result || !status) {
      return;
    }

    if (status.isFinalized || status.isInBlock) {
      const blockHash = status.isFinalized
        ? status.asFinalized
        : status.asInBlock;

      console.log(`✅ Tx finalized. Block hash: ${blockHash.toString()}`);
    } else if (result.isError) {
      console.log(JSON.stringify(result));
    } else {
      console.log(`⏱ Current tx status: ${status.type}`);
    }
  });

  return { result: true };
}

run()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((err) => {
    console.error(err);
  });
