import { SubstrateService } from '../../modules/substrate/substrate.service';
import { ChainType, PhalaLogFilterDto, SubstrateChain } from '@apillon/lib';
import { setupTest, Stage } from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';

describe('Substrate service tests', () => {
  let stage: Stage;
  beforeAll(async () => {
    stage = await setupTest();

    await new Endpoint(
      {
        url: 'wss://poc6.phala.network/ws',
        chain: SubstrateChain.PHALA,
        chainType: ChainType.SUBSTRATE,
      },
      stage.context,
    ).insert();
  });
  test('getPhalaLogRecordsAndGasPrice', async () => {
    const phalaLogFilter = new PhalaLogFilterDto({
      type: 'Log',
      contract:
        '0xafced93c37d5d05f5bde493cbe80d3e157fc2b625a85d68bd7931b938d75740c',
      clusterId:
        '0x0000000000000000000000000000000000000000000000000000000000000001',
    });
    const result = await SubstrateService.getPhalaLogRecordsAndGasPrice(
      {
        phalaLogFilter,
      },
      stage.context,
    );

    expect(result).toBe({
      gasPrice: 5,
      records: [],
    });
  });
});
