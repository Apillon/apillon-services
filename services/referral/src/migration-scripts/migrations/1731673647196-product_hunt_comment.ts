
export async function upgrade(queryFn: (query: string, values?: any[]) => Promise<void>) {
  await queryFn(``);
}
    
export async function downgrade(queryFn: (query: string, values?: any[]) => Promise<void>) {
  await queryFn(``);
}
