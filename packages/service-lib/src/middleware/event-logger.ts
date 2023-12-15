export function logLambdaEvent(event: any) {
  event.user_uuid ||= event.user?.user_uuid;
  delete event.user;
  delete event.securityToken;
}
