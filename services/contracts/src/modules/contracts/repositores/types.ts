type ModelConstructor = new (...args: any[]) => any;

export type ExtractFromRow = <
  T extends string,
  U extends { [key in T]: ModelConstructor },
>(
  rows: { [key: string]: unknown }[],
  tableAliasesAndModels: U,
) => { [K in keyof U]: InstanceType<U[K]> };

export type ExtractFromRows = <T extends ModelConstructor>(
  data: { [key: string]: unknown }[],
  tableAlias: string,
  modelClass: T,
) => InstanceType<T>[];
