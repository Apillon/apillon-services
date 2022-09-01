export class Logger {
  static writeLog(event, _context) {
    console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);
  }
}
