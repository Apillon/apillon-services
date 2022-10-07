import { ServiceContext } from '../context';

export class TestService {
  static async test(_event, _context: ServiceContext) {
    return {
      id: 1,
      name: 'test',
    };
  }
}
