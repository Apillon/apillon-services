type ModelConstructor = new (...args: any[]) => any;

export type ExtractFromRow = <
  T extends string,
  U extends { [key in T]: ModelConstructor },
>(
  row: { [key: string]: unknown },
  tableAliasesAndModels: U,
) => { [K in keyof U]: InstanceType<U[K]> };

export type ExtractFromRows = <T extends ModelConstructor>(
  rows: { [key: string]: unknown }[],
  tableAlias: string,
  modelClass: T,
) => InstanceType<T>[];
