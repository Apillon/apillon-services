import { env } from '@apillon/lib';
import axios from 'axios';

export async function setMailerliteField(
  email: string,
  field: string,
  value: any,
) {
  try {
    await axios.put(
      `https://api.mailerlite.com/api/v2/subscribers/${email}`,
      { fields: { [field]: value } },
      { headers: { 'X-MailerLite-ApiKey': env.MAILERLITE_API_KEY } },
    );
    console.log(`Field ${field} set for email ${email}`);
  } catch (err) {
    console.error(
      `Error setting ${field} mailerlite field for ${email}: ${err.message}`,
    );
  }
}
