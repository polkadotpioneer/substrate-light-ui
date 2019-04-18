// Copyright 2018-2019 @paritytech/substrate-light-ui authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { SubmittableExtrinsic, SubmittableResult } from '@polkadot/api/SubmittableExtrinsic';
import { KeyringPair } from '@polkadot/keyring/types';
import { RxResult } from '@polkadot/api/rx/types';

export interface PendingTransaction {
  id: number;
  status: {
    isFinalized: boolean,
    isDropped: boolean,
    isUsurped: boolean,
  };
  // TODO and also the transaction details (de qui à qui, combien)
  unsubscribe: any; // function
} // partial? no, but with "?" keys

interface SubmitParams {
  extrinsic: SubmittableExtrinsic<RxResult, RxResult>,
  senderPair: KeyringPair
}

export class TxQueueStore {
  txs: PendingTransaction[] = [];
  // alertStore: ...

  counter = 0;

  submit (params: SubmitParams) {
    const {extrinsic, senderPair} = params;

    const pendingTransactionId = this.counter++;

    const subscription = extrinsic
      // send the extrinsic
      .signAndSend(senderPair)
      .subscribe(
        (txResult: SubmittableResult) => {
          // l.log(`Tx status update: ${txResult.status}`);
          const { status: {isFinalized, isDropped, isUsurped} } = txResult;
          this._replaceTx(pendingTransactionId, {...newPendingTx, ...{
            status: { isFinalized, isDropped, isUsurped }
          }});

          // this.setState(state => ({ ...state, txResult })); // use fp-ts lenses? how do I modify self? with this.? but then react won't know about the changes. need to update txs with a new txs that has a new tx inside. sounds good. how do we do that. private method _replaceTx(id, new)
          // const { status: { isFinalized, isDropped, isUsurped } } = txResult;

          // if (status.isFinalized) {
          //   this.alertStore.enqueue({
          //     content: this.renderSuccess(),
          //     type: 'success'
          //   });
          // }

          // if (isFinalized || isDropped || isUsurped) {
          //   this.closeSubscription();
          // }
        },
        (error: Error) => {

          // this.alertStore.enqueue({
          //   content: <Message.Content>
          //     <Message.Header>Error! < /Message.Header>
          //     < Message.Content > { error.message } < /Message.Content>
          //     < /Message.Content>,
          //   type: 'error'
          // });
        }
      );

    const newPendingTx = {
      id: pendingTransactionId,
      status: {
        isFinalized: false,
        isDropped: false,
        isUsurped: false,
      },
      unsubscribe: subscription.unsubscribe
    }

    this.txs = this.txs.concat(newPendingTx);
  }

  clear() {
    this.txs.forEach(({unsubscribe}) => { unsubscribe() });
    this.txs = [];
  }

  _replaceTx(id: number, newTx: PendingTransaction) {
    this.txs = this.txs.map(tx => (
      tx.id === id
      ? newTx
      : tx
    ));
    
    // use some fp-ts util here
    // use map?

    // const setArrayImmutable = (arr, i, value) => 
    // Object.assign([...arr], { [i]: value })
    // https://medium.com/@giltayar/immutably-setting-a-value-in-a-js-array-or-how-an-array-is-also-an-object-55337f4d6702
  }
}

// Todo modify AlertStore so it follows the same pattern as well
