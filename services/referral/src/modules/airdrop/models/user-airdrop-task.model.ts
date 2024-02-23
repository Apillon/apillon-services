import {
  AppEnvironment,
  BaseSQLModel,
  Mongo,
  MongoCollections,
  PopulateFrom,
  SerializeFor,
  env,
  presenceValidator,
  prop,
} from '@apillon/lib';
import { booleanParser, stringParser, integerParser } from '@rawmodel/parsers';
import { DbTables, ReferralErrorCode } from '../../../config/types';

interface UserStats {
  email: string;
  user_uuid: string;
  project_count: number;
  project_uuids: string[];
  subscriptions: number;
  buy_count: number;
  buy_amount: number;
  spend_count: number;
  spend_amount: number;
  bucket_count: number;
  file_count: number;
  ipns_count: number;
  www_count: number;
  www_domain_count: number;
  nft_count: number;
  social_count: number;
  comp_count: number;
  id_count: number;
  key_count: number;
  apiKeys: string[][];
  coworker_count: number;
  referral_count: number;
  referrals: string[][];
}
export class UserAirdropTask extends BaseSQLModel {
  public readonly tableName = DbTables.USER_AIRDROP_TASK;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ReferralErrorCode.USER_UUID_NOT_PRESENT,
      },
    ],
  })
  public user_uuid: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public projectCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public bucketCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public fileUploaded: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public websiteCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public ipnsCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public onSubscriptionPlan: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public creditsPurchased: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public grillChatCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public nftCollectionCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public domainLinked: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public websiteUploadedViaApi: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public fileUploadedViaApi: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public computingContractCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public collaboratorAdded: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public kiltIdentityCreated: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public identitySdkUsed: boolean;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: false,
  })
  public nftMintedApi: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
  })
  public usersReferred: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
  })
  public creditsSpent: number;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE],
    serializable: [
      SerializeFor.ADMIN,
      SerializeFor.SERVICE,
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: 0,
  })
  public totalPoints: number;

  // Define a mapping for tasks to points
  taskPoints = {
    register: 10,
    projectCreated: 1,
    bucketCreated: 1,
    fileUploaded: 1,
    ipnsCreated: 1,
    websiteCreated: 1,
    domainLinked: 10,
    nftCollectionCreated: 10,
    onSubscriptionPlan: 20,
    creditsPurchased: 5,
    grillChatCreated: 1,
    computingContractCreated: 0,
    kiltIdentityCreated: 10,
    collaboratorAdded: 1,
    usersReferred: 2,
    websiteUploadedViaApi: 5,
    identitySdkUsed: 2,
    fileUploadedViaApi: 5,
    nftMintedApi: 5,
  };

  exists(): boolean {
    return !!this.user_uuid;
  }

  public async populateByUserUuid(user_uuid: string) {
    if (!user_uuid) {
      throw new Error('user_uuid should not be null');
    }
    const data = await this.getContext().mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.USER_AIRDROP_TASK}\`
        WHERE user_uuid = @user_uuid;
      `,
      { user_uuid },
    );

    return data?.length
      ? this.populate(data[0], PopulateFrom.DB)
      : this.reset();
  }

  public async insertOrUpdate(): Promise<void> {
    const serializedData = this.serialize(SerializeFor.INSERT_DB);

    const updateFields = Object.keys(serializedData)
      .map((key) => `${key} = @${key}`)
      .join(', ');

    const query = `
      INSERT INTO \`${DbTables.USER_AIRDROP_TASK}\` SET ${updateFields}
      ON DUPLICATE KEY UPDATE ${updateFields};
    `;

    await this.getContext().mysql.paramExecute(query, serializedData);
  }

  public async getNewStats(user_uuid: string, isRecursive = false) {
    this.user_uuid = user_uuid;
    const res = await this.db().paramExecute(
      `
      SELECT * FROM v_userStats
      WHERE user_uuid = @user_uuid
    `,
      {
        user_uuid,
      },
    );

    const userStats = res[0] as UserStats;

    await this.assignUserAirdropTasks(userStats);

    const referrals =
      userStats.referral_count > 0
        ? userStats.referrals.join(',').split(',')
        : [];

    if (referrals?.length && !isRecursive) {
      await Promise.all(
        referrals.map((x) => {
          new UserAirdropTask({}, this.getContext()).getNewStats(x, true);
        }),
      );

      await this.assignReferredUsers(referrals);
    }

    this.recalculateTotalPoints();
    await this.insertOrUpdate();
    console.info('Finished assigning airdrop tasks');
    return this;
  }

  public recalculateTotalPoints() {
    let points = 10; // 10 points for registering
    console.log(`${points} awarded to user ${this.user_uuid} for registration`);

    // Calculate total points based on the completed tasks
    for (const [task, isCompleted] of Object.entries(
      this.serialize(SerializeFor.PROFILE),
    )) {
      let taskPoint = 0;
      if (task === 'creditsSpent') {
        taskPoint = Math.floor(this.creditsSpent / 3000);
      } else if (task === 'usersReferred') {
        taskPoint = this.usersReferred * this.taskPoints[task];
      } else if (isCompleted) {
        taskPoint = this.taskPoints[task] || 0;
      }
      console.log(`${taskPoint} awarded to user ${this.user_uuid} for ${task}`);
      points += taskPoint;
    }

    this.totalPoints = points;
    console.log(`Total points awarded to user ${this.user_uuid} --> ${points}`);
    return points;
  }

  private async assignUserAirdropTasks(stat: UserStats): Promise<void> {
    if (!stat.project_count) {
      return;
    }

    // Populate tasks for user based on their data in the database
    // from each of their projects
    this.populate({
      projectCreated: true,
      bucketCreated: stat.bucket_count > 0,
      fileUploaded: stat.file_count > 0,
      ipnsCreated: stat.ipns_count > 0,
      websiteCreated: stat.www_count > 0,
      domainLinked: stat.www_domain_count > 0,
      nftCollectionCreated: stat.nft_count > 0,
      onSubscriptionPlan: stat.subscriptions > 0,
      grillChatCreated: stat.social_count > 0,
      computingContractCreated: stat.comp_count > 0,
      kiltIdentityCreated: stat.id_count > 0,
      collaboratorAdded: stat.coworker_count > 0,
      creditsPurchased: stat.buy_count > 0,
      creditsSpent: stat.spend_amount,
      userReferred: 0,
      ...(await this.assignApiTasks(stat.apiKeys.join(',').split(','))),
    });
  }

  // Assign tasks which are checked on mongoDB (API calls)
  private async assignApiTasks(apiKeys: any[]) {
    const mongo = new Mongo(
      env.APP_ENV === AppEnvironment.TEST
        ? env.MONITORING_MONGO_SRV_TEST
        : env.MONITORING_MONGO_SRV,
      env.APP_ENV === AppEnvironment.TEST
        ? env.MONITORING_MONGO_DATABASE_TEST
        : env.MONITORING_MONGO_DATABASE,
      4,
    );
    await mongo.connect();
    const collection = mongo.db.collection(MongoCollections.API_REQUEST_LOGS);

    const checkApiCalled = ($regex: RegExp) =>
      collection
        .count({ apiKey: { $in: apiKeys }, url: { $regex, $options: 'i' } })
        .then((c) => c > 0);

    return {
      websiteUploadedViaApi: await checkApiCalled(/^\/hosting.*upload/),
      identitySdkUsed: await checkApiCalled(/^\/wallet-identity.*$/),
      fileUploadedViaApi: await checkApiCalled(/^\/storage\/buckets.*upload/),
      nftMintedApi: await checkApiCalled(/^\/nfts\/collections.*mint/),
    };
  }

  // Add total points based on users they have referred which meet totalPoints criteria
  private async assignReferredUsers(referrals: string[]) {
    if (!referrals?.length) {
      return;
    }

    const res = await this.db().paramExecute(
      `
        SELECT count(*) as cnt 
        FROM ${DbTables.USER_AIRDROP_TASK}
        WHERE user_uuid IN (@referrals)
        AND totalPoints >= 15
      `,
      referrals,
    );

    this.usersReferred = res[0]?.cnt || 0;
  }
}
