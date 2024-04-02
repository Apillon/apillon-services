export async function getConfig() {
  const configLocation = '../../../test-config';
  return await import(configLocation);
}
