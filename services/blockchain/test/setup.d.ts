import { Context } from '@apillon/lib';
import { MySql } from '@apillon/lib';
import { ServiceContext } from '../src/context';
import { SubstrateChain } from '@apillon/lib';
export interface DatabaseState {
    mysql: MySql;
}
export interface Stage {
    db: MySql;
    context: ServiceContext;
}
export declare function setupTest(): Promise<Stage>;
export declare function generateSubstrateWallets(amount: number, type: SubstrateChain, context: Context): Promise<void>;
export declare const releaseStage: (stage: Stage) => Promise<void>;
