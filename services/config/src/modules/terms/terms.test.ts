import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { TermsService } from './terms.service';

describe('Terms unit test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();

    // insert terms
    const inserts = [
      // Old type 1
      `
      INSERT INTO terms (id, status, title, type, text, validFrom) 
      VALUES (1, 5, 'Test1-t1', 1, 'old terms t1', DATE_ADD(NOW(), INTERVAL -2 DAY));
      `,
      // active type 1
      `
      INSERT INTO terms (id, status, title, type, text, validFrom) 
      VALUES (2, 5, 'Test2-t1', 1, 'active terms t1', DATE_ADD(NOW(), INTERVAL -1 DAY));
      `,
      // active type 2
      `
      INSERT INTO terms (id, status, title, type, url, validFrom) 
      VALUES (3, 5, 'Test-t2', 2, 'https://apillon.io/t2', DATE_ADD(NOW(), INTERVAL -2 DAY));
      `,
      // draft type 2
      `
      INSERT INTO terms (id, status, title, type, url, validFrom) 
      VALUES (4, 1, 'Test-t2', 2, 'https://apillon.io/t2', DATE_ADD(NOW(), INTERVAL -1 DAY));
      `,
      // old type 2
      `
      INSERT INTO terms (id, status, title, type, text, validFrom) 
      VALUES (5, 5, 'Test-t2', 2, 'old type 2', DATE_ADD(NOW(), INTERVAL -3 DAY));
      `,
      // deactivated type 2
      `
       INSERT INTO terms (id, status, title, type, url, validFrom) 
       VALUES (6, 9, 'Test-t2', 2, 'https://apillon.io/t2', DATE_ADD(NOW(), INTERVAL -10 MINUTE));
       `,
      // Active type 3
      `
      INSERT INTO terms (id, status, title, type, text, validFrom, isRequired) 
      VALUES (7, 5, 'Test t3', 3, 'active t3', DATE_ADD(NOW(), INTERVAL -2 DAY), 1);
      `,
    ];

    for (const x of inserts) {
      await stage.db.paramExecute(x);
    }
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Should get active terms', async () => {
    const terms = await TermsService.getActiveTerms(null, stage.context);

    expect(terms.length).toBe(3);
    expect(terms.filter((x) => x.type === 1).length).toBe(1);
    expect(terms.find((x) => x.type === 1).id).toBe(2);
    expect(terms.find((x) => x.type === 1).isRequired).toBeFalsy();
    expect(terms.filter((x) => x.type === 2).length).toBe(1);
    expect(terms.find((x) => x.type === 2).id).toBe(3);
    expect(terms.find((x) => x.type === 2).isRequired).toBeFalsy();
    expect(terms.filter((x) => x.type === 3).length).toBe(1);
    expect(terms.find((x) => x.type === 3).id).toBe(7);
    expect(terms.find((x) => x.type === 3).isRequired).toBeTruthy();
  });
});
