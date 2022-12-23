import {
  Task,
  TaskType,
} from '@apillon/referral/src/modules/referral/models/task.model';
import { TestContext } from './context';

export async function createTestReferralTasks(
  consoleCtx: TestContext,
): Promise<any> {
  const referral = new Task({}, consoleCtx)
    .fake()
    .populate({ type: TaskType.REFERRAL });
  await referral.insert();

  const github = new Task({}, consoleCtx)
    .fake()
    .populate({ type: TaskType.GITHUB_CONNECT });
  await github.insert();

  const twitter = new Task({}, consoleCtx)
    .fake()
    .populate({ type: TaskType.TWITTER_CONNECT });
  await twitter.insert();

  const retweet = new Task({}, consoleCtx)
    .fake()
    .populate({ type: TaskType.TWITTER_RETWEET });
  await retweet.insert();

  return { referral, github, twitter, retweet };
}
