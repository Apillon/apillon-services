// import { env } from '@apillon/lib';
// import { KiltBlockchainIndexer } from '../kilt-indexer.service';

// // TODO: Move to indexer, test with real wallet
// // TODO2: Add more test cases
// // TODO3: Once new indexer deployed to crust, modify this test.
// describe.skip('Test all transactions', () => {
//   const address = 'cTL1jk9CbHJAYz2hWDh3PprRCtrPAHUvSDw7gZbVWbUYt8SJU';

//   beforeAll(async () => {
//     env.BLOCKCHAIN_CRUST_GRAPHQL_SERVER = 'http://localhost:4351/graphql';
//   });

//   test('Get all transactions', async () => {
//     const crustIndexer = new KiltBlockchainIndexer();

//     // Withdrawals from block to block
//     const allTransactions: any = await crustIndexer.getAllSystemEvents(
//       address,
//       11280536,
//       11280936,
//       10,
//     );

//     // TODO: Does not check if any other element is present in the transaction
//     expect(allTransactions.storageOrders.length).toEqual(1);
//     expect(allTransactions.transfers.length).toEqual(3);
//     expect(allTransactions.systems.length).toEqual(2);
//   });

//   test('Get all system events', async () => {
//     const crustIndexer = new KiltBlockchainIndexer();

//     // Withdrawals from block to block
//     const systemTransactions: any = await crustIndexer.getAllSystemEvents(
//       address,
//       11281560,
//       11281620,
//     );

//     console.log('All transactions ', systemTransactions);

//     // TODO: Does not check if any other element is present in the transaction
//     expect(systemTransactions.length).toEqual(8);
//   });
// });
