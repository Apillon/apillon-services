import { PopulateFrom } from '@apillon/lib';
import { ModelBase, prop } from '@apillon/lib/dist/lib/base-models/base';
import { faker } from '@faker-js/faker';
import { stringParser } from '@rawmodel/parsers';

export class UpdateUserDto extends ModelBase {
  // WARNING: wallet should not be used here (without signature)

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    fakeValue: () => faker.internet.userName(),
  })
  public name: string;
}
