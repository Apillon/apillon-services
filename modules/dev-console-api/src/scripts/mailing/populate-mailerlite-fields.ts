import {
  DefaultUserRole,
  MySql,
  SqlModelStatus,
  env,
  getEnvSecrets,
} from '@apillon/lib';
import { DbTables } from '../../config/types';
import axios from 'axios';

async function populateMailerliteFields() {
  await getEnvSecrets();
  const mysql = new MySql({
    host: env.DEV_CONSOLE_API_MYSQL_HOST,
    port: env.DEV_CONSOLE_API_MYSQL_PORT,
    database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
    user: env.DEV_CONSOLE_API_MYSQL_USER,
    password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
  });
  await mysql.connect();

  const allProjects = await mysql.paramExecute(
    `SELECT * FROM \`${DbTables.PROJECT}\` WHERE \`status\` = ${SqlModelStatus.ACTIVE}`,
  );

  for (const project of allProjects) {
    const { 0: projectOwner } = await mysql.paramExecute(
      `
      SELECT u.email
      FROM \`${DbTables.PROJECT}\` p
      JOIN \`${DbTables.PROJECT_USER}\` pu ON p.id = pu.project_id
      JOIN \`${DbTables.USER}\` u ON pu.user_id = u.id
      WHERE p.project_uuid = @project_uuid
      AND role_id = @role_id
      AND p.status <> ${SqlModelStatus.DELETED}
      LIMIT 1;
      `,
      {
        project_uuid: project.project_uuid,
        role_id: DefaultUserRole.PROJECT_OWNER,
      },
    );
    const email = projectOwner?.email;
    if (!email) {
      continue;
    }
    try {
      await axios.put(
        `https://api.mailerlite.com/api/v2/subscribers/${email}`,
        { fields: { project_owner: true } },
        { headers: { 'X-MailerLite-ApiKey': env.MAILERLITE_API_KEY } },
      );
      console.log(`Processed ${email}`);
    } catch (err) {
      console.error(`Error for ${email}: ${err.message}`);
    }
  }
}

populateMailerliteFields();
