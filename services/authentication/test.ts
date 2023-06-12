} catch (error) {
        if (error.method == 'DidAlreadyPresent') {
          // If DID present on chain, signAndSubmitTx will throw an error
          await new Lmas().writeLog({
            logType: LogType.INFO, //!! This is NOT an error !!
            message: `${error.method}: ${error.docs[0]}`,
            location: 'Authentication-API/identity/authentication.worker',
            service: ServiceName.AUTHENTICATION_API,
            data: {
              email: params.email,
              didUri: params.didUri,
            },
          });
        } else {
          await new Lmas().writeLog({
            message: error,
            logType: LogType.ERROR,
            location: 'Authentication-API/identity/authentication.worker',
            service: ServiceName.AUTHENTICATION_API,
            data: {
              email: params.email,
              didUri: params.didUri,
            },
          });
          throw error;
        }
    


  const blockchainServiceRequest: CreateSubstrateTransactionDto =
    new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.KILT,
        transaction: transation,
        referenceTable: DbTables.IDENTITY,
        referenceId: identity.id,
      },
      context,
    );

  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);

      const attesterAcc = (await generateAccount(
      env.KILT_ATTESTER_MNEMONIC,
    )) as KiltKeyringPair;

    // DID
    const attesterDidDoc = await getFullDidDocument(attesterKeypairs);
    // const attesterDidUri = attesterDidDoc.uri;