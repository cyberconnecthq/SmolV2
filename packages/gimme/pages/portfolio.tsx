import {type ReactElement} from 'react';
import {isZeroAddress} from '@builtbymom/web3/utils';
import {Portfolio} from '@gimmmeSections/Portfolio';
import {WithdrawContextApp} from '@gimmmeSections/Portfolio/Withdraw/useWithdrawFlow';

import {BalancesModalContextApp} from '../contexts/useBalancesModal';

import type {TToken} from '@builtbymom/web3/types';

function PortfolioPage(): ReactElement {
	return (
		<WithdrawContextApp>
			{({configuration}) => (
				<BalancesModalContextApp
					selectedTokens={
						!isZeroAddress(configuration.tokenToReceive?.address)
							? [configuration.tokenToReceive as TToken]
							: []
					}>
					<Portfolio />
				</BalancesModalContextApp>
			)}
		</WithdrawContextApp>
	);
}

export default PortfolioPage;
