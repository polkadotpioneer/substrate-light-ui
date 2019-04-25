// Copyright 2018-2019 @paritytech/substrate-light-ui authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { useContext, useEffect } from 'react';
import { AlertsContext } from '@substrate/ui-common';
import { Message } from 'semantic-ui-react';
import IdentityIcon from '@polkadot/ui-identicon';
import { StackedHorizontal, Margin } from '@substrate/ui-components';

export function TxQueueNotifier() {
  const { successObservable, errorObservable } = useContext(TxQueueContext);
  const { enqueue } = useContext(AlertsContext);

  // Display notification on success
  useEffect(() => {
    const subscription = successObservable.subscribe((details: any) => {
      const { amount, recipientAddress, senderAddress } = details;

      const content = (
        <Message.Content>
          <StackedHorizontal justifyContent='space-around'>
            <span>Transaction Completed!</span>
            <StackedHorizontal>
              <Margin as='span' left='small' right='small' top='small'>
                <IdentityIcon theme='substrate' size={16} value={senderAddress} />
              </Margin>
              sent {amount.toString()} units to
        <Margin as='span' left='small' right='small' top='small'>
                <IdentityIcon theme='substrate' size={16} value={recipientAddress} />
              </Margin>
            </StackedHorizontal>
          </StackedHorizontal>
        </Message.Content>
      );

      enqueue({
        content: content,
        type: 'success'
      });
    });

    return subscription.unsubscribe();
  }, [successObservable]);

  // Display notification on error
  useEffect(() => {
    const subscription = errorObservable.subscribe((details: any) => {
      const { error } = details;

      const content = (
        <Message.Content>
          <Message.Header>Error! </Message.Header>
          <Message.Content > {error} </Message.Content>
        </Message.Content>
      );

      enqueue({
        content: content,
        type: 'error'
      });
    });

    return subscription.unsubscribe();
  }, [errorObservable]);

  return null;
};