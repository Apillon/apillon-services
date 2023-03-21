import { bgYellow, black } from 'colors/safe';
import * as readline from 'readline';
import {
  downgradeDatabase,
  rebuildDatabase,
  seedDatabase,
  unseedDatabase,
  upgradeDatabase,
} from './migrations';

export class SqlMigrator {
  private settings: {
    database: string;
    host: string;
    port: number;
    user: string;
    password: string;
  };

  public constructor(options: {
    database: string;
    host: string;
    port: number;
    user: string;
    password: string;
  }) {
    this.settings = options;
  }

  public async upgrade(showDialog = true, steps = 0): Promise<boolean> {
    if (showDialog) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const dialog = await new Promise((resolve, _reject) => {
        rl.question(
          `You are about to upgrade database ${bgYellow(
            black(` ${this.settings.database} @ ${this.settings.host} `),
          )}.
    
Set number of versions to upgrade ('Y' for all, '<number>' for number of versions, 'N' to exit):`,
          (answer) => {
            steps = parseInt(answer);
            if (answer.toUpperCase() === 'Y') {
              steps = 0;
              console.log('Upgrading to LATEST version.');
            } else if (steps) {
              console.log(`Upgrading for ${steps} version(s).`);
            } else {
              console.log('Invalid input. Exiting.');
              rl.close();
              resolve(false);
            }

            rl.close();
            resolve(true);
          },
        );
      });
      if (dialog) {
        return this.upgrade(false, steps);
      } else {
        return false;
      }
    } else {
      console.log(
        `Upgrading database ${bgYellow(
          black(` ${this.settings.database} @ ${this.settings.host} `),
        )}`,
      );

      await upgradeDatabase(
        this.settings.database, //env.MYSQL_DATABASE,
        this.settings.host, // env.MYSQL_HOST,
        this.settings.port, //env.MYSQL_PORT,
        this.settings.user, //env.MYSQL_USER,
        this.settings.password, //env.MYSQL_PASSWORD,
        steps || 0,
      );

      return true;
    }
  }

  public async downgrade(showDialog = true, steps = -1): Promise<boolean> {
    if (showDialog) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const dialog = await new Promise((resolve, _reject) => {
        rl.question(
          `You are about to downgrade database ${bgYellow(
            black(` ${this.settings.database} @ ${this.settings.host} `),
          )}.
    
        Set number of versions to downgrade (-1 for all, 0 to exit):`,
          (answer) => {
            steps = parseInt(answer, 10);
            if (steps) {
              console.log(
                `Downgrading ${steps > 0 ? steps : 'ALL'} version(s).`,
              );
            } else {
              console.log('Invalid input. Exiting.');
              rl.close();
              resolve(false);
            }

            rl.close();
            resolve(true);
          },
        );
      });
      if (dialog) {
        return this.downgrade(false, steps);
      } else {
        return false;
      }
    } else {
      console.log(
        `Downgrading database ${bgYellow(
          black(` ${this.settings.database} @ ${this.settings.host} `),
        )}`,
      );

      await downgradeDatabase(
        this.settings.database, //env.MYSQL_DATABASE,
        this.settings.host, // env.MYSQL_HOST,
        this.settings.port, //env.MYSQL_PORT,
        this.settings.user, //env.MYSQL_USER,
        this.settings.password, //env.MYSQL_PASSWORD,
        steps || -1,
      );

      return true;
    }
  }

  public async seed(showDialog = true, steps = 0) {
    if (showDialog) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const dialog = await new Promise((resolve, _reject) => {
        rl.question(
          `You are about to seed database ${bgYellow(
            black(` ${this.settings.database} @ ${this.settings.host} `),
          )}.
    
Set number of versions to seed ('Y' for all, '<number>' for number of versions, 'N' to exit):`,
          (answer) => {
            steps = parseInt(answer);
            if (answer.toUpperCase() === 'Y') {
              steps = 0;
              console.log('Upgrading to LATEST version.');
            } else if (steps) {
              console.log(`Upgrading for ${steps} version(s).`);
            } else {
              console.log('Invalid input. Exiting.');
              rl.close();
              resolve(false);
            }

            rl.close();
            resolve(true);
          },
        );
      });
      if (dialog) {
        return this.seed(false, steps);
      } else {
        return false;
      }
    } else {
      console.log(
        `Seeding database ${bgYellow(
          black(` ${this.settings.database} @ ${this.settings.host} `),
        )}`,
      );

      await seedDatabase(
        this.settings.database, //env.MYSQL_DATABASE,
        this.settings.host, // env.MYSQL_HOST,
        this.settings.port, //env.MYSQL_PORT,
        this.settings.user, //env.MYSQL_USER,
        this.settings.password, //env.MYSQL_PASSWORD,
        steps || 0,
      );
      return true;
    }
  }

  public async unseed(showDialog = true, steps = -1) {
    if (showDialog) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const dialog = await new Promise((resolve, _reject) => {
        rl.question(
          `You are about to unseed database ${bgYellow(
            black(` ${this.settings.database} @ ${this.settings.host} `),
          )}.
    
        Set number of versions to unseed (-1 for all, 0 to exit):`,
          (answer) => {
            steps = parseInt(answer, 10);
            if (steps) {
              console.log(`Unseeding ${steps > 0 ? steps : 'ALL'} version(s).`);
            } else {
              console.log('Invalid input. Exiting.');
              rl.close();
              resolve(false);
            }

            rl.close();
            resolve(true);
          },
        );
      });
      if (dialog) {
        return this.unseed(false, steps);
      } else {
        return false;
      }
    } else {
      console.log(
        `Unseeding database ${bgYellow(
          black(` ${this.settings.database} @ ${this.settings.host} `),
        )}`,
      );

      await unseedDatabase(
        this.settings.database, //env.MYSQL_DATABASE,
        this.settings.host, // env.MYSQL_HOST,
        this.settings.port, //env.MYSQL_PORT,
        this.settings.user, //env.MYSQL_USER,
        this.settings.password, //env.MYSQL_PASSWORD,
        steps || -1,
      );
      return true;
    }
  }

  public async rebuild(showDialog = true) {
    if (showDialog) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const dialog = await new Promise((resolve, _reject) => {
        rl.question(
          `You are about to reset database ${this.settings.database} @ ${this.settings.host}.\n Are you sure? (Yes/No):`,
          (answer) => {
            rl.close();
            if (answer.toLowerCase() === 'yes') {
              resolve(true);
            } else {
              console.log('Exiting.');
              resolve(false);
            }
          },
        );
      });
      if (dialog) {
        return this.rebuild(false);
      } else {
        return false;
      }
    } else {
      console.log(
        `Rebuilding database ${bgYellow(
          black(` ${this.settings.database} @ ${this.settings.host} `),
        )}`,
      );

      await rebuildDatabase(
        this.settings.database, //env.MYSQL_DATABASE,
        this.settings.host, // env.MYSQL_HOST,
        this.settings.port, //env.MYSQL_PORT,
        this.settings.user, //env.MYSQL_USER,
        this.settings.password, //env.MYSQL_PASSWORD,
      );

      await seedDatabase(
        this.settings.database, //env.MYSQL_DATABASE,
        this.settings.host, // env.MYSQL_HOST,
        this.settings.port, //env.MYSQL_PORT,
        this.settings.user, //env.MYSQL_USER,
        this.settings.password, //env.MYSQL_PASSWORD,
      );
      return true;
    }
  }
}
