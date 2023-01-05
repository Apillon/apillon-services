import {
  Task,
  TaskType,
} from '@apillon/referral/src/modules/referral/models/task.model';
import { Product } from '@apillon/referral/src/modules/referral/models/product.model';
import { TestContext } from './context';

export async function createTestReferralTasks(ctx: TestContext): Promise<any> {
  const referral = new Task({}, ctx)
    .fake()
    .populate({ type: TaskType.REFERRAL });
  await referral.insert();

  const github = new Task({}, ctx)
    .fake()
    .populate({ type: TaskType.GITHUB_CONNECT });
  await github.insert();

  const twitter = new Task({}, ctx)
    .fake()
    .populate({ type: TaskType.TWITTER_CONNECT });
  await twitter.insert();

  const retweet = new Task({}, ctx)
    .fake()
    .populate({ type: TaskType.TWITTER_RETWEET });
  await retweet.insert();

  return { referral, github, twitter, retweet };
}

export async function createTestReferralProduct(
  ctx: TestContext,
  data?: any,
): Promise<any> {
  const product = new Product({}, ctx).fake().populate(data);
  await product.insert();

  return product;
}
