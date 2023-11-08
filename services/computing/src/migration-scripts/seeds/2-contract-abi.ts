import { DbTables } from '../../config/types';
import { ComputingContractType } from '@apillon/lib';

const abi =
  '{"source":{"hash":"0x7a27529c40fe5e4dc5c588e436183241ab77e3012df8a5e56a0c81014e1ad1fd","language":"ink! 4.1.0","compiler":"rustc 1.69.0","build_info":{"build_mode":"Debug","cargo_contract_version":"3.2.0","rust_toolchain":"stable-x86_64-unknown-linux-gnu","wasm_opt_settings":{"keep_debug_symbols":false,"optimization_passes":"Z"}}},"contract":{"name":"rust_vault_snippets","version":"0.1.0","authors":["[your_name] <[your_email]>"]},"spec":{"constructors":[{"args":[{"label":"contract_id","type":{"displayName":["String"],"type":2}},{"label":"rpc_api","type":{"displayName":["String"],"type":2}},{"label":"ipfs_endpoint","type":{"displayName":["String"],"type":2}},{"label":"owner_restriction","type":{"displayName":["bool"],"type":5}}],"default":false,"docs":[],"label":"new","payable":false,"returnType":{"displayName":["ink_primitives","ConstructorResult"],"type":6},"selector":"0x9bae9d5e"}],"docs":[],"environment":{"accountId":{"displayName":[],"type":7},"balance":{"displayName":[],"type":7},"blockNumber":{"displayName":[],"type":7},"chainExtension":{"displayName":[],"type":7},"hash":{"displayName":[],"type":7},"maxEventTopics":0,"timestamp":{"displayName":[],"type":7}},"events":[],"lang_error":{"displayName":["ink","LangError"],"type":8},"messages":[{"args":[{"label":"nft_id","type":{"displayName":["u8"],"type":1}},{"label":"cid","type":{"displayName":["String"],"type":2}}],"default":false,"docs":[],"label":"set_cid","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0xe7089a85"},{"args":[],"default":false,"docs":[],"label":"test_caller","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0x83ef83da"},{"args":[],"default":false,"docs":[],"label":"test_get_data","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0xf776e552"},{"args":[{"label":"nft_id","type":{"displayName":["u8"],"type":1}}],"default":false,"docs":[],"label":"get_cid","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0x46a31eb3"},{"args":[],"default":false,"docs":[],"label":"get_caller_owner","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0x63be7590"},{"args":[{"label":"new_owner","type":{"displayName":["AccountId"],"type":3}}],"default":false,"docs":[],"label":"set_owner","mutates":true,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0x367facd6"},{"args":[{"label":"signature","type":{"displayName":["String"],"type":2}},{"label":"message","type":{"displayName":["String"],"type":2}},{"label":"nft_id","type":{"displayName":["u8"],"type":1}}],"default":false,"docs":[],"label":"verify_nft_ownership","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":12},"selector":"0x501560e7"},{"args":[{"label":"file_content","type":{"displayName":["String"],"type":2}}],"default":false,"docs":[],"label":"encrypt_content","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0xd3c77ae3"},{"args":[{"label":"signature","type":{"displayName":["String"],"type":2}},{"label":"message","type":{"displayName":["String"],"type":2}},{"label":"nft_id","type":{"displayName":["u8"],"type":1}}],"default":false,"docs":[],"label":"download_and_decrypt","mutates":false,"payable":false,"returnType":{"displayName":["ink","MessageResult"],"type":9},"selector":"0xd868db7a"}]},"storage":{"root":{"layout":{"struct":{"fields":[{"layout":{"leaf":{"key":"0x00000000","ty":0}},"name":"private_key"},{"layout":{"leaf":{"key":"0x00000000","ty":0}},"name":"salt"},{"layout":{"root":{"layout":{"leaf":{"key":"0x1d973feb","ty":2}},"root_key":"0x1d973feb"}},"name":"cid_map"},{"layout":{"leaf":{"key":"0x00000000","ty":3}},"name":"owner"},{"layout":{"leaf":{"key":"0x00000000","ty":5}},"name":"owner_restriction"},{"layout":{"leaf":{"key":"0x00000000","ty":2}},"name":"contract_id"},{"layout":{"leaf":{"key":"0x00000000","ty":2}},"name":"rpc_api"},{"layout":{"leaf":{"key":"0x00000000","ty":2}},"name":"ipfs_endpoint"}],"name":"ApillonContract"}},"root_key":"0x00000000"}},"types":[{"id":0,"type":{"def":{"sequence":{"type":1}}}},{"id":1,"type":{"def":{"primitive":"u8"}}},{"id":2,"type":{"def":{"primitive":"str"}}},{"id":3,"type":{"def":{"composite":{"fields":[{"type":4,"typeName":"[u8; 32]"}]}},"path":["ink_primitives","types","AccountId"]}},{"id":4,"type":{"def":{"array":{"len":32,"type":1}}}},{"id":5,"type":{"def":{"primitive":"bool"}}},{"id":6,"type":{"def":{"variant":{"variants":[{"fields":[{"type":7}],"index":0,"name":"Ok"},{"fields":[{"type":8}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":7},{"name":"E","type":8}],"path":["Result"]}},{"id":7,"type":{"def":{"tuple":[]}}},{"id":8,"type":{"def":{"variant":{"variants":[{"index":1,"name":"CouldNotReadInput"}]}},"path":["ink_primitives","LangError"]}},{"id":9,"type":{"def":{"variant":{"variants":[{"fields":[{"type":10}],"index":0,"name":"Ok"},{"fields":[{"type":8}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":10},{"name":"E","type":8}],"path":["Result"]}},{"id":10,"type":{"def":{"variant":{"variants":[{"fields":[{"type":2}],"index":0,"name":"Ok"},{"fields":[{"type":11}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":2},{"name":"E","type":11}],"path":["Result"]}},{"id":11,"type":{"def":{"variant":{"variants":[{"index":0,"name":"EcdhInvalidSecretKey"},{"index":1,"name":"EcdhInvalidPublicKey"},{"index":2,"name":"AESCannotEncrypt"},{"index":3,"name":"AESCannotDecrypt"},{"index":4,"name":"InvalidAddress"},{"index":5,"name":"BalanceOverflow"},{"index":6,"name":"FetchDataFailed"},{"index":7,"name":"FailedToGetBlockNumber"},{"index":8,"name":"RequestFailed"},{"index":9,"name":"Test"},{"index":10,"name":"NoPermission"}]}},"path":["rust_vault_snippets","error","ApillonError"]}},{"id":12,"type":{"def":{"variant":{"variants":[{"fields":[{"type":13}],"index":0,"name":"Ok"},{"fields":[{"type":8}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":13},{"name":"E","type":8}],"path":["Result"]}},{"id":13,"type":{"def":{"variant":{"variants":[{"fields":[{"type":5}],"index":0,"name":"Ok"},{"fields":[{"type":11}],"index":1,"name":"Err"}]}},"params":[{"name":"T","type":5},{"name":"E","type":11}],"path":["Result"]}}],"version":"4"}';

export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(
    `INSERT INTO \`${DbTables.CONTRACT_ABI}\` (\`status\`, \`contractType\`, \`version\`, \`abi\`)
       VALUES (5, '${ComputingContractType.SCHRODINGER}', 1, '${abi}');`,
  );
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<Array<any>>,
): Promise<void> {
  await queryFn(`
    DELETE
    FROM \`${DbTables.CONTRACT_ABI}\`
    WHERE contractType = '${ComputingContractType.SCHRODINGER}' AND version = 1;
  `);
}
