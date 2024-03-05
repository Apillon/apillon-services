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
import { UserStats, taskPoints } from './user-stats';
import dns from 'node:dns';

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
    this.reset();
    this.user_uuid = user_uuid;
    const res = await this.db().paramExecute(
      `
      SELECT * FROM v_userStats
      WHERE user_uuid = @user_uuid
    `,
      { user_uuid },
    );

    if (!res.length) {
      return this;
    }

    const userStats = res[0] as UserStats;

    await this.assignUserAirdropTasks(userStats);

    const referrals = [
      ...new Set(
        userStats.referral_count > 0
          ? userStats.referrals.join(',').split(',')
          : [],
      ),
    ];

    if (referrals?.length && !isRecursive) {
      // disable recursion

      // await Promise.all(
      //   referrals.map((x) =>
      //     new UserAirdropTask({}, this.getContext()).getNewStats(x, true),
      //   ),
      // );

      await this.assignReferredUsers(referrals);
    }

    const domains = [
      ...new Set(
        userStats.www_domain_count > 0
          ? userStats.domains.join(',').split(',')
          : [],
      ),
    ];

    if (domains?.length && !isRecursive) {
      await this.checkLinkedDomains(domains);
    }

    this.recalculateTotalPoints();
    await this.insertOrUpdate();
    console.info('Finished assigning airdrop tasks');
    return this;
  }

  public recalculateTotalPoints() {
    let points = 10; // 10 points for registering

    // Calculate total points based on the completed tasks
    for (const [task, isCompleted] of Object.entries(
      this.serialize(SerializeFor.PROFILE),
    )) {
      let taskPoint = 0;
      if (task === 'creditsSpent') {
        taskPoint = Math.floor(this.creditsSpent / 3000);
      } else if (task === 'usersReferred') {
        taskPoint = this.usersReferred * taskPoints[task];
      } else if (isCompleted) {
        taskPoint = taskPoints[task] || 0;
      }
      // console.log(`${taskPoint} awarded to user ${this.user_uuid} for ${task}`);
      points += taskPoint;
    }

    this.totalPoints = points;
    // console.log(`Total points awarded to user ${this.user_uuid} --> ${points}`);
    return points;
  }

  async assignUserAirdropTasks(stat: UserStats): Promise<void> {
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
      domainLinked: false, // Checked later with DNS resolve
      nftCollectionCreated: stat.nft_count > 0,
      onSubscriptionPlan: stat.subscriptions > 0,
      grillChatCreated: stat.social_count > 0,
      computingContractCreated: stat.comp_count > 0,
      kiltIdentityCreated: stat.id_count > 0,
      collaboratorAdded: stat.coworker_count > 0,
      creditsPurchased: stat.buy_count > 0,
      creditsSpent: stat.spend_amount,
      userReferred: 0, // Populated later
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

    const activity = {
      websiteUploadedViaApi: false,
      identitySdkUsed: false,
      fileUploadedViaApi: false,
      nftMintedApi: false,
    };

    try {
      await mongo.connect();
      const collection = mongo.db.collection(MongoCollections.API_REQUEST_LOGS);

      const checkApiCalled = ($regex: RegExp) =>
        collection
          .count({
            apiKey: { $in: apiKeys },
            status: { $in: [200, 201] },
            url: { $regex, $options: 'i' },
          })
          .then((c) => c > 0);

      await Promise.all([
        checkApiCalled(/^\/hosting.*upload/).then(
          (v) => (activity.websiteUploadedViaApi = v),
        ),
        checkApiCalled(/^\/wallet-identity.*$/).then(
          (v) => (activity.identitySdkUsed = v),
        ),
        checkApiCalled(/^\/storage\/buckets.*upload/).then(
          (v) => (activity.fileUploadedViaApi = v),
        ),
        checkApiCalled(/^\/nfts\/collections.*mint/).then(
          (v) => (activity.nftMintedApi = v),
        ),
      ]);

      await mongo.close();
    } catch (err) {
      console.error(err);
      try {
        await mongo.close();
      } catch (e) {}
    }

    return activity;
  }

  // Add total points based on users they have referred which meet totalPoints criteria
  async assignReferredUsers(referrals: string[]) {
    if (!referrals?.length) {
      return;
    }
    const res = await this.db().paramExecute(
      `
        SELECT count(*) as cnt
        FROM ${DbTables.USER_AIRDROP_TASK}
        WHERE user_uuid IN ('${referrals.join("','")}')
        AND totalPoints >= 15
      `,
    );

    this.usersReferred = res[0]?.cnt || 0;
  }

  // Verify that user has linked webiste DNS record to Apillon hosting
  async checkLinkedDomains(domains: string[]) {
    if (!domains?.length) {
      return;
    }

    const validIps = ['52.19.92.40', '63.35.144.25', '35.244.158.129'];

    // Replace prefixes for DNS lookup (failsafe for http prefixes)
    domains = domains.map((domain) =>
      domain.replace('http://', '').replace('https://', ''),
    );

    for (const domain of domains) {
      const { address } = await dns.promises.lookup(domain).catch((err) => {
        console.error(`Error resolving DNS domain: ${err}`);
        return { address: null };
      });
      if (validIps.includes(address)) {
        this.domainLinked = true;
        return;
      }
    }
  }
}
