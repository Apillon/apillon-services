import { MongoCollections } from '@apillon/lib';
import { postToSlack } from './lib/slack';

/**
 * Alerting class for sending alerts and admin alerts.
 */
export class Alerting {
  /**
   * Send an alert and store it in the database.
   * @param {any} event - The alert data to be sent and stored.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The sent alert data.
   */
  static async sendAlert(event, context) {
    console.info(`SENDING ALERT: ${JSON.stringify(event)}`);

    await context.mongo.db.collection(MongoCollections.ALERT).insertOne(event);
    return event;
  }

  /**
   * Send an admin alert, store it in the database, and post it to Slack.
   * @param {any} event - The admin alert data to be sent, stored, and posted.
   * @param {any} context - The service context for database access.
   * @returns {Promise<any>} - The sent admin alert data.
   */
  static async sendAdminAlert(event, context) {
    delete event.eventName; // Unnecessary property;
    event.ts = new Date();
    console.info(`SENDING ADMIN ALERT: ${JSON.stringify(event)}`);

    await context.mongo.db
      .collection(MongoCollections.ADMIN_ALERT)
      .insertOne(event);

    await postToSlack(event.message, event.service, event.logType);

    // TODO: send email ?

    return event;
  }
}
