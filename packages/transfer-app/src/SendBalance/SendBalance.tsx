// Copyright 2018-2019 @paritytech/substrate-light-ui authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { DerivedBalances, DerivedFees } from '@polkadot/api-derive/types';
import { Index } from '@polkadot/types';
import { AppContext } from '@substrate/ui-common';
import { Balance, Form, Input, NavButton, StackedHorizontal, SubHeader } from '@substrate/ui-components';
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { Observable, Subscription, zip } from 'rxjs';
import { take } from 'rxjs/operators';

import { CenterDiv, InputAddress, LeftDiv, RightDiv } from '../Transfer.styles';
import { SubResults } from './types';
import { MatchParams } from '../types';
import { validate } from './validate';
import { Validation } from './Validation';
import { logger } from '@polkadot/util';

interface SendMatchParams extends MatchParams {
  recipientAddress?: string;
}

interface Props extends RouteComponentProps<SendMatchParams> { }

interface State extends Partial<SubResults> {
  amountAsString: string;
}

const l = logger('transfer-app');

export class SendBalance extends React.PureComponent<Props, State> {
  static contextType = AppContext;

  context!: React.ContextType<typeof AppContext>; // http://bit.ly/typescript-and-react-context

  state: State = {
    amountAsString: ''
  };

  subscription?: Subscription;

  componentDidMount () {
    if (!this.props.match.params.recipientAddress) {
      return;
    }
    this.subscribeFees(this.props.match.params.currentAccount, this.props.match.params.recipientAddress);
  }

  componentDidUpdate (prevProps: Props) {
    if (!this.props.match.params.recipientAddress) {
      return;
    }

    if (
      prevProps.match.params.currentAccount !== this.props.match.params.currentAccount ||
      prevProps.match.params.recipientAddress !== this.props.match.params.recipientAddress
    ) {
      this.closeSubscription();
      this.subscribeFees(this.props.match.params.currentAccount, this.props.match.params.recipientAddress);
    }
  }

  componentWillUnmount () {
    this.closeSubscription();
  }

  closeSubscription () {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  subscribeFees (currentAccount: string, recipientAddress: string) {
    const { api } = this.context;

    // Subscribe to sender's & receivers's balances, nonce and some fees
    this.subscription = zip(
      api.derive.balances.fees() as unknown as Observable<DerivedFees>,
      api.derive.balances.votingBalance(currentAccount) as unknown as Observable<DerivedBalances>,
      api.derive.balances.votingBalance(recipientAddress) as unknown as Observable<DerivedBalances>,
      api.query.system.accountNonce(currentAccount) as unknown as Observable<Index>
    )
      .pipe(
        take(1)
      )
      .subscribe(([fees, currentBalance, recipientBalance, accountNonce]) => this.setState({
        fees,
        currentBalance,
        recipientBalance,
        accountNonce
      }));
  }

  handleChangeAmount = ({ target: { value } }: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      amountAsString: value
    });
  }

  handleChangeCurrentAccount = (account: string) => {
    const { history, match: { params: { recipientAddress } } } = this.props;

    history.push(`/transfer/${account}/${recipientAddress}`);
  }

  handleChangeRecipientAddress = (recipientAddress: string) => {
    const { history, match: { params: { currentAccount } } } = this.props;

    history.push(`/transfer/${currentAccount}/${recipientAddress}`);
  }

  handleSubmit = () => {
    const { api, keyring, txQueueStore } = this.context;
    const { match: { params: { currentAccount, recipientAddress } } } = this.props;

    const values = validate({ ...this.state, currentAccount, recipientAddress }, api);

    values.fold(
      () => {/* Do nothing if error */ },
      (allExtrinsicData) => {
        // If everything is correct, then submit the extrinsic

        const {extrinsic, amount, allFees, allTotal} = allExtrinsicData;

        l.log('Sending tx from', currentAccount, 'to', recipientAddress, 'of amount', amount);
        
        const senderPair = keyring.getPair(currentAccount);
        txQueueStore.submit({ extrinsic, amount, allFees, allTotal, senderPair, recipientAddress: recipientAddress as any});
      });
  }

  render () {
    const { api } = this.context;
    const { match: { params: { currentAccount, recipientAddress } } } = this.props;
    const { amountAsString } = this.state;

    const values = validate({ ...this.state, currentAccount, recipientAddress }, api);

    return (
      <Form onSubmit={this.handleSubmit}>
        <StackedHorizontal alignItems='flex-start'>
          <LeftDiv>
            <SubHeader textAlign='left'>Sender Account:</SubHeader>
            <InputAddress
              isDisabled
              onChange={this.handleChangeCurrentAccount}
              type='account'
              value={currentAccount}
              withLabel={false}
            />
            <Balance address={currentAccount} />
          </LeftDiv>

          <CenterDiv>
            <SubHeader textAlign='left'>Amount:</SubHeader>
            <Input
              fluid
              label='UNIT'
              labelPosition='right'
              min={0}
              onChange={this.handleChangeAmount}
              placeholder='e.g. 1.00'
              type='number'
              value={amountAsString}
            />
          </CenterDiv>

          <RightDiv>
            <SubHeader textAlign='left'>Recipient Address:</SubHeader>
            <InputAddress
              label={null}
              onChange={this.handleChangeRecipientAddress}
              type='all'
              value={recipientAddress}
              withLabel={false}
            />
            <Balance address={recipientAddress} />
          </RightDiv>
        </StackedHorizontal>
        <StackedHorizontal>
          <LeftDiv />
          <CenterDiv>
            <Validation values={values} />
          </CenterDiv>
          <RightDiv>
            <NavButton disabled={values.isLeft()}>Submit</NavButton>
          </RightDiv>
        </StackedHorizontal>
      </Form>
    );
  }
}
