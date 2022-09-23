import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { endpoint } from '../config';

describe('AppController (e2e)', () => {
  beforeEach(async () => {});

  it('/ (GET)', () => {
    return request(endpoint).get('/').expect(200);
  });
});
