# Apillon Authentication Service

Authentication Service provides functionality for Apillon OAUTH application. It enables developers to use Apillon OAUTH service on their websites. End users can then login to ther websites with help of Kilt blockchain protocol.

## Getting Started

Please read [Development](../../docs/development.md) and [Debug and Test](../../docs/debug-and-test.md) documentation. These instructions will help you set up the development environment and run the microservice locally.

## Configuration

Environment variables that has to be set:

```ts
   /************************************************************
   * AUTH - Apillon Authentication Service
   ************************************************************/
  // MAIN
  AUTH_API_HOST: string;
  AUTH_API_PORT: number;

  AUTH_APP_URL: string;

  AUTH_API_MYSQL_HOST: string;
  AUTH_API_MYSQL_PORT: number;
  AUTH_API_MYSQL_USER: string;
  AUTH_API_MYSQL_PASSWORD: string;
  AUTH_API_MYSQL_DEPLOY_USER: string;
  AUTH_API_MYSQL_DEPLOY_PASSWORD: string;
  AUTH_API_MYSQL_DATABASE: string;

  // TEST
  AUTH_API_HOST_TEST: string;
  AUTH_API_PORT_TEST: number;
  AUTH_APP_URL_TEST: string;
  AUTH_API_MYSQL_HOST_TEST: string;
  AUTH_API_MYSQL_PORT_TEST: number;
  AUTH_API_MYSQL_USER_TEST: string;
  AUTH_API_MYSQL_PASSWORD_TEST: string;
  AUTH_API_MYSQL_DATABASE_TEST: string;

  // MICROSERVICE
  AUTH_FUNCTION_NAME: string;
  AUTH_FUNCTION_NAME_TEST: string;
  AUTH_SOCKET_PORT: number;
  AUTH_SOCKET_PORT_TEST: number;

  /************************************************************
   * Kilt config
   ************************************************************/
  KILT_NETWORK: string;
  KILT_ATTESTER_MNEMONIC: string;
  KILT_WHITELIST: array, separated by floating point

  /************************************************************
   * Authentication config (Uses Kilt module)
   ************************************************************/
  AUTH_AWS_WORKER_SQS_URL: string;
  AUTH_AWS_WORKER_LAMBDA_NAME: string;
```
## Architecture and logic

* **DID** - Decentralized Identity
W3C standard, basically an address accessible with a master key (mnemonic), which unlocks the other utility keys - authentication, encryption, assertion, delegation.
A DID defines the subject - the Kilt account, is tied to it, but not linked. The account holds tokens and uses the DID to perform operations. A DID requires a deposit ob 2 KILT, which is returned upon did revokation (minus the transaction fees).
* **VC** - Verifiable Credentail
Is a JSON (can also be a different representation, as defined the VC standard), which holds information about an entity. It is composed of data, rootHash, nonce map, which is used for selective disclosure (minimization)
* **CLAIM** -
A claim object by the claimer. It holds no value inside the Kilt network.
* **CREDENTIAL** -
A credential is a verified set of one or more claims. It is written to the blockchain.
* **PRESENTATION** -
A presentation is an objected created from one or more credential fields. It can be combined from multiple credentials. A presentation holds the rootHash, which is checked by the verifier.
* **ATTESTATION**
The act of providing evidence or confirming the validity of the data within the claim, typically performed by a trusted attester.
* **Attester**
An entity makes sure that certain statements are accurate. This entity examines claims made by other entities and only approves those that are true, issuing a certification.

> 1. The verification process verifies the **presentation** of an entity
> 2. The registration process issues an **account**, a **did** and a **credential** for a set of properties of a subject.

## MODULES
* Identity
* Verification
* Sporran

### REGISTRATION

#### Endpoints

* Identity Controller:

**POST** 	identity/verification/email:
> Send a verification mail to the provided email with a JWT token of type IDENTITY_VERIFICATION, signed by Apillon.
This endpoint servers two main purposes - to verify the client via email, and to trigger the identity generation process, if that is the wish of the caller.  If an identity already exists and it's status in ATTESTED | REVOKED, then the function should trigger an error message to the client -> Invalid request, identity exists etc. We use this endpoint to send different kinds of verification emails: identity generation, credential restore od DID revoke.

**POST** 	identity/generate
> Issues a request to the SQS queue for identity generation. It can be either a full identity generation (DID create and attestation), or just attestion.
Creates a new entry in the identity table, if it does not exist. This call will fail, if the identity table entry for the given email does not exist OR the identity state is not IN_PROGRESS AND not IDENTITY_VERIFIED.
The identity entry is updated with IDENTITY_VERIFIED and the IdentityGenerateWorker is executed, which is elaborated further below under the worker section.

**GET** 	identity/state/query
> Used to fetch the state of the generation process, which can take several minutes. This is used as a polling call so the client can adequately update its state, once the generation is done, as well as to mitigate any time-out problems.

**GET** 	identity/credential/query
> Used in credential restore operation to fetch the saved credential for the provided email. A verification JWT token is required. A credential JSON file is returned to the client for the provided email address.

**POST** 	identity/did/revoke
> Issues a DID revoke operation request on the blockchain. If the identity does not exist OR it's status is not ATTESTED for the given email, this endpoint will fail.

## VERIFICATION
**POST** 	verification/verify
> Verification is only composed of one endpoint, which is the verification process.
Verifies a presentation sent by the claimer for a given credential.

## SPORRAN

**POST** 	sporran/message/submit-terms
> BE creates a message of type submit-terms, which is sent to Sporran. This message submits the actual terms of attestation (ctype) to the sporran user

**POST** 	sporran/message/request-credentials
> BE creates a message of type request-credentials. This message is then sent to sporran, where the user can select the requested credential (required by the application and specified in the request-credential message), signs it, then sends it to BE for verification.

**POST** sporran/message/submit-attestation
> This message submits the attestation object from the BE if it was successfully attested.


### modules/apillon-api/modules/authentication
GET auth/session-token
> Returns the session token, which can then be used with all subsequential requests.

GET auth/verify-login
> Verifies the acquired session token with Apillon's secret signing key. This method is used for OAuth, when the 3rd party project verifies if a user has successfully logged in

## OAuth 2.0 controllers
Are located in authentication module in apillon-api.

**GET** 	sporran/session-values
> Returns the session values for the Sporran connection

**POST**	sporran/verify-session
> Verifies the sporran session

## Update worker
Localted in workers/update-state.worker.ts. Is used to update the state of transactions received from the blockchain service. It can be thought of as a state machine,that executes next steps, depending on the final state of the identity job.

## Flows
* Registration flow
* Verification flow
* Sporran specifics

### Registration flow
Is divided into several steps
1. Email verification (This is actually the attestation step)
2. Create an account (a wallet) - on the FE side. This generates a BIP39 mnemonic.
3. Create a DID document (identity.service - generate identity). A blockchain service request is created an identity job process started
4. Attestation step. Once the DID was created, an attestation request is created and sent to the blockchain.
5. Link account and DID is the optional last step, if the user selected this option on the FE.


### Verification flow
Composed of one step and multiple sub-steps
1. Verifies the integrity of the presentation
2. Check if presentation attestation object is present on chain (rootHash).
3. Check if the owner (attester is valid). **IMPORTANT**: Only SocialKYC and Apillon attesters currently supported.
4. Check if attestation object was revoked.
5. Return verify result to caller.

### Sporran flow
Sporran has two supported flows for now, verification and registation with sporran (feature currently disabled but implemted). Verification has multiple steps
1. Initiate Sporran session. Generates app specific data such as dApp name, dApp URI, challenge.
2. Verify sporran session - parses JWT token from FE (apillon specific), verifies the corrent dApp URI and check if the provided challenge, signed by the public sporran key (a light did is used for the session) is corrent, and the challenge is the same as generated in the first step.
3. Communication can now start with the use of iMessage structures defined by Sporran (Check sporran.service for more details)

### Well known did
A well known did must be created for the sporran session communication and placed in public/.well-known/did-configration.json. There is a script file in scripts/ folder.

## Deployment
Please read [Deployment](../../docs/deployment.md) documentation.

## License
Copyright (c) Apillon - all rights reserved