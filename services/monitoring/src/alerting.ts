import { postToSlack } from '@apillon/lib';

export class Alerting {
  static async sendAlert(event, context) {
    console.log(`SENDING ALERT:${JSON.stringify(event)}`);

    await context.mongo.db.collection('alert').insertOne(event);
    return event;
  }

  static async sendAdminAlert(event, context) {
    console.log(`SENDING ADMIN ALERT:${JSON.stringify(event)}`);

    await context.mongo.db.collection('admin-alert').insertOne(event);

    await postToSlack(event.message, event.serviceName, event.level);

    // TODO: send email ?

    return event;
  }
}
