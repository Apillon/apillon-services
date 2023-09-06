import { ModelBase, PopulateFrom } from '@apillon/lib';
import { faker } from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { prop } from '@rawmodel/core';

export class UpdateUserDto extends ModelBase {
  // WARNING: wallet should not be used here (without signature)

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE],
    fakeValue: () => faker().internet.userName(),
  })
  public name: string;
}
