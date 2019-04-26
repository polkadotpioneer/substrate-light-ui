// Copyright 2018-2019 @paritytech/substrate-light-ui authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { SubmittableExtrinsic, SubmittableResult } from '@polkadot/api/SubmittableExtrinsic';
import { KeyringPair } from '@polkadot/keyring/types';
import { RxResult } from '@polkadot/api/rx/types';
import BN from 'bn.js';
import { Balance } from '@polkadot/types';
import React, { createContext, useState } from 'react';
import { Subject } from 'rxjs';

export interface PendingTransaction { // aka TxQueueItem
  id: number;
  status: {
    isFinalized: boolean;
    isDropped: boolean;
    isUsurped: boolean;
  };
  allFees: BN; allTotal: BN; amount: Balance; recipientAddress: string;
  unsubscribe: any; // function
} // partial? no, but with "?" keys

export interface SubmitParams {
  // todo consolidate with types.ts from SendBalance
  extrinsic: SubmittableExtrinsic<RxResult, RxResult>;
  allFees: BN;
  allTotal: BN;
  amount: Balance;
  recipientAddress: string;
  senderPair: KeyringPair;
}

interface Props {
  children: any
}

export const TxQueueContext = createContext({
  txQueue: [] as PendingTransaction[],
  submit: (params: SubmitParams) => {},
  clear: () => {},
  successObservable: new Subject(),
  errorObservable: new Subject()
});

const successObservable = new Subject();
const errorObservable = new Subject();

export function TxQueueContextProvider(props: Props) {

  const [txQueue, setTxQueue]: [PendingTransaction[], any] = useState([] as PendingTransaction[]);

  console.log('txQueue is', txQueue)

  const replaceTx = (id: number, newTx: PendingTransaction) => {
    setTxQueue((prevTxQueue: PendingTransaction[]) => prevTxQueue.map((tx: PendingTransaction) => (
      tx.id === id
        ? newTx
        : tx
    )));
  }

  const closeTxSubscription = (id: number) => {
    const tx = txQueue.find((tx) => tx.id === id);
    if (tx) tx.unsubscribe();
  }

  const [txCounter, setTxCounter] = useState(0);

  const submit = (params: SubmitParams) => {
    const { extrinsic, senderPair, allFees, allTotal, amount, recipientAddress } = params;

    const transactionId = txCounter;
    setTxCounter(txCounter+1);

    const subscription = extrinsic
      .signAndSend(senderPair) // send the extrinsic
      .subscribe(
        (txResult: SubmittableResult) => {
          // l.log(`Tx status update: ${txResult.status}`);
          const { status: { isFinalized, isDropped, isUsurped } } = txResult;
          replaceTx(transactionId, {
            ...newPendingTx, status: { isFinalized, isDropped, isUsurped }
          });

          if (isFinalized) {
            successObservable.next({amount, recipientAddress, senderAddress: senderPair.address()});
          }

          if (isFinalized || isDropped || isUsurped) {
            closeTxSubscription(transactionId);
          }
        },
        (error: Error) => {
          errorObservable.next({ error: error.message });
        }
      );

    const newPendingTx = {
      id: transactionId,
      status: {
        isFinalized: false,
        isDropped: false,
        isUsurped: false,
      },
      allFees, allTotal, amount, recipientAddress,
      unsubscribe: () => subscription.unsubscribe()
    }

    setTxQueue(txQueue.concat(newPendingTx));
  }

  const clear = () => {
    txQueue.forEach(({ unsubscribe }) => { unsubscribe() });
    setTxQueue([]);
  };

  return <TxQueueContext.Provider value={{ txQueue, submit, clear, successObservable, errorObservable }}>
      {props.children}
    </TxQueueContext.Provider>;
}