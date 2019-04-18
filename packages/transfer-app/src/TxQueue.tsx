// Copyright 2018-2019 @paritytech/substrate-light-ui authors & contributors
// This software may be modified and distributed under the terms
// of the Apache-2.0 license. See the LICENSE file for details.

import { SubmittableResult } from '@polkadot/api/SubmittableExtrinsic';
import IdentityIcon from '@polkadot/ui-identicon';
import { logger } from '@polkadot/util';
import { AppContext } from '@substrate/ui-common';
import { Icon, Margin, Message, NavButton, NavLink, Segment, Stacked, StackedHorizontal, SubHeader } from '@substrate/ui-components';
import { Subscription } from 'rxjs';
import React from 'react';
import { RouteComponentProps, Redirect } from 'react-router-dom';

import { CenterDiv, LeftDiv, RightDiv } from './Transfer.styles';
import { MatchParams } from './types';
import { AllExtrinsicData } from './SendBalance/types';

interface Props extends RouteComponentProps<MatchParams, {}, Partial<AllExtrinsicData> | undefined> { }

interface State {
  showDetails: boolean;
  txResult?: SubmittableResult;
}

const l = logger('transfer-app');

export class TxQueue extends React.PureComponent<Props, State> {
  static contextType = AppContext;

  private subscription: Subscription | undefined;

  context!: React.ContextType<typeof AppContext>; // http://bit.ly/typescript-and-react-context

  state: State = {
    showDetails: false
  };

  closeSubscription () {
    if (this.subscription) {
      this.subscription.unsubscribe();
      this.subscription = undefined;
    }
  }

  handleNewTransfer = () => {
    const { history, match: { params: { currentAccount } } } = this.props;
    const { txQueue } = this.context;

    // Transaction was seen by the user, we can remove it
    txQueue.clear();

    // TODO should we redirect manually? it should be automatic in the render
    // if we use one and the same component. and not routes.
    // /transfer/0x00/ et c'est tout
    // history.push(`/transfer/${currentAccount}`);
  }

  toggleDetails = () => this.setState({ showDetails: !this.state.showDetails });

  render () {
    const { location, match: { params: { currentAccount } } } = this.props;

    // TODO if no pending tx, just go to /send

    const { showDetails, txResult } = this.state;

    return (
      <StackedHorizontal alignItems='flex-start'>

        <LeftDiv>
          {this.renderTxStatus()}
        </LeftDiv>

        <CenterDiv>
          <SubHeader>Summary:</SubHeader>
          {this.renderSummary()}
        </CenterDiv>

        <RightDiv>
          <SubHeader onClick={this.toggleDetails}>
            {showDetails ? 'Hide' : 'Click here to view details'}
          </SubHeader>
          {showDetails && this.renderDetails()}
          {txResult && txResult.status.isFinalized ? (
            <NavButton onClick={this.handleNewTransfer}>New Transfer</NavButton>
          ) : <p>Please wait until the transaction is validated before making a new transfer..</p>}
        </RightDiv>
      </StackedHorizontal>
    );
  }

  renderDetails () {
    const { location, match: { params: { currentAccount } } } = this.props;

    const { allFees, allTotal, amount, recipientAddress } = location.state;

    return (
      <Segment placeholder>
        <p>From: {currentAccount}</p>
        <p>To: {recipientAddress}</p>
        <p>Amount: {amount.toString()} units</p>
        <p>Fees: {allFees.toString()} units</p>
        <p>Total amount (amount + fees): {allTotal.toString()} units</p>
      </Segment>
    );
  }

  renderSummary () {
    const { location, match: { params: { currentAccount } } } = this.props;

    const { amount, recipientAddress } = location.state;

    return (
      <StackedHorizontal>
        <Margin as='span' left='small' right='small' top='small'>
          <IdentityIcon theme='substrate' size={16} value={currentAccount} />
        </Margin>
        sent {amount.toString()} units to
        <Margin as='span' left='small' right='small' top='small'>
          <IdentityIcon theme='substrate' size={16} value={recipientAddress} />
        </Margin>
      </StackedHorizontal>
    );
  }

  renderSuccess () {
    const { match: { params: { currentAccount } } } = this.props;

    return (
      <Message.Content>
        <StackedHorizontal justifyContent='space-around'>
          <span>Transaction Completed!</span>
          {this.renderSummary()}
          <NavLink inverted to={`/transfer/${currentAccount}/sent`}>View transfer details</NavLink>
        </StackedHorizontal>
      </Message.Content>
    );
  }

  renderTxStatus () {
    const { txResult } = this.state;

    switch (txResult && txResult.status.type) {
      case 'Finalized':
        return <Stacked>
          <SubHeader color='lightBlue1' >Transaction completed!</SubHeader>
          <Icon name='check' size='big' />
        </Stacked>;
      case 'Dropped':
      case 'Usurped':
        return <Stacked>
          <SubHeader color='lightBlue1'>Transaction error!</SubHeader>
          <Icon error name='cross' size='big' />
        </Stacked>;
      default:
        return <Stacked>
          <SubHeader color='lightBlue1'>Sending...</SubHeader>
          <Icon loading name='spinner' size='big' />
        </Stacked>;
    }
  }
}
