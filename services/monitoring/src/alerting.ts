export class Alerting {
  static sendAlert(event, _context) {
    console.log(`SENDING ALERT:${JSON.stringify(event)}`);
  }
}
