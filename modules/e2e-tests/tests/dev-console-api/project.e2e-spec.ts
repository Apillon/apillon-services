import * as request from 'supertest';
import { endpoint } from '../../config';

describe('ProjectController (e2e)', () => {
  beforeEach(async () => {});

  it('/ (POST)', async () => {
    const response = await request(endpoint)
      .post('/project')
      .send({ name: 'e2e test project' })
      .set('Accept', 'application/json')
      .expect('Content-Type', /json/)
      .expect(201);

    expect(response.body.id).not.toBeNull();
  });

  /*it('/:id (GET)', () => {
    return request('endpoint').get('/').expect(200);
  });*/
});
