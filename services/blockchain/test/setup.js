"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.releaseStage = exports.generateSubstrateWallets = exports.setupTest = void 0;
const lib_1 = require("@apillon/lib");
const keyring_1 = __importDefault(require("@polkadot/keyring"));
const util_crypto_1 = require("@polkadot/util-crypto");
const context_1 = require("../src/context");
const wallet_1 = require("../src/common/models/wallet");
const lib_2 = require("@apillon/lib");
async function setupTest() {
    lib_1.env.APP_ENV = lib_1.AppEnvironment.TEST;
    lib_1.env.BLOCKCHAIN_MYSQL_HOST = null;
    try {
        await (0, lib_1.rebuildDatabase)(lib_1.env.BLOCKCHAIN_MYSQL_DATABASE_TEST, lib_1.env.BLOCKCHAIN_MYSQL_HOST_TEST, lib_1.env.BLOCKCHAIN_MYSQL_PORT_TEST, lib_1.env.BLOCKCHAIN_MYSQL_USER_TEST, lib_1.env.BLOCKCHAIN_MYSQL_PASSWORD_TEST);
        const config = {
            host: lib_1.env.BLOCKCHAIN_MYSQL_HOST_TEST,
            database: lib_1.env.BLOCKCHAIN_MYSQL_DATABASE_TEST,
            password: lib_1.env.BLOCKCHAIN_MYSQL_PASSWORD_TEST,
            port: lib_1.env.BLOCKCHAIN_MYSQL_PORT_TEST,
            user: lib_1.env.BLOCKCHAIN_MYSQL_USER_TEST,
        };
        const db = new lib_1.MySql(config);
        await db.connect();
        const context = new context_1.ServiceContext();
        context.mysql = db;
        return {
            db,
            context,
        };
    }
    catch (e) {
        console.error(e);
        throw new Error('Unable to set up env');
    }
}
exports.setupTest = setupTest;
async function generateSubstrateWallets(amount, type, context) {
    const keyring = new keyring_1.default();
    for (let i = 0; i < amount; i++) {
        const mnemonic = (0, util_crypto_1.mnemonicGenerate)();
        const pair = keyring.createFromUri(mnemonic);
        const wallet = new wallet_1.Wallet({
            chain: type,
            chainType: lib_2.ChainType.SUBSTRATE,
            seed: mnemonic,
            address: pair.address,
        }, context);
        await wallet.insert();
    }
}
exports.generateSubstrateWallets = generateSubstrateWallets;
const releaseStage = async (stage) => {
    if (!stage) {
        throw new Error('Error - stage does not exist');
    }
    await (0, lib_1.dropDatabase)(lib_1.env.BLOCKCHAIN_MYSQL_DATABASE_TEST, lib_1.env.BLOCKCHAIN_MYSQL_HOST_TEST, lib_1.env.BLOCKCHAIN_MYSQL_PORT_TEST, lib_1.env.BLOCKCHAIN_MYSQL_USER_TEST, lib_1.env.BLOCKCHAIN_MYSQL_PASSWORD_TEST);
    if (stage.db) {
        try {
            await stage.db.close();
        }
        catch (error) {
            throw new Error('Error when releasing database: ' + error);
        }
    }
};
exports.releaseStage = releaseStage;
//# sourceMappingURL=setup.js.map