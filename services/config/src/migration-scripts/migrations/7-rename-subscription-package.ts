export async function upgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  // For consistency with other tables
  await queryFn(`RENAME TABLE subscriptionPackage TO subscription_package;`);
}

export async function downgrade(
  queryFn: (query: string, values?: any[]) => Promise<any[]>,
): Promise<void> {
  await queryFn(`RENAME TABLE subscription_package TO subscriptionPackage;`);
}
