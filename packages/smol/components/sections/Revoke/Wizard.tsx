import {useCallback, useState} from 'react';
import {ErrorModal} from 'packages/lib/common/ErrorModal';
import {SuccessModal} from 'packages/lib/common/SuccessModal';
import {isDev} from 'packages/lib/utils/constants';
import {useWeb3} from '@builtbymom/web3/contexts/useWeb3';
import {useChainID} from '@builtbymom/web3/hooks/useChainID';
import {approveERC20, defaultTxStatus} from '@builtbymom/web3/utils/wagmi';

import {AllowancesFilters} from './AllowancesFilters';
import {AllowancesTable} from './AllowancesTable';
import {useAllowances} from './useAllowances';

import type {TTokenAllowance} from 'packages/lib/utils/types/app.revoke';
import type {ReactElement} from 'react';
import type {TAddress} from '@builtbymom/web3/types';

export const RevokeWizard = (): ReactElement => {
	const {provider} = useWeb3();
	const [revokeStatus, set_revokeStatus] = useState(defaultTxStatus);
	const {chainID, safeChainID} = useChainID();
	const {dispatchConfiguration, configuration} = useAllowances();

	const revokeTokenAllowance = useCallback(
		(tokenToRevoke: TTokenAllowance, spender: TAddress): void => {
			dispatchConfiguration({type: 'SET_TOKEN_TO_REVOKE', payload: {...tokenToRevoke, spender}});
			if (!tokenToRevoke) {
				return;
			}
			approveERC20({
				contractAddress: tokenToRevoke.address,
				chainID: isDev ? chainID : safeChainID,
				connector: provider,
				spenderAddress: spender,
				amount: 0n,
				statusHandler: set_revokeStatus
			}).then(result => {
				if (result.isSuccessful) {
					set_revokeStatus({...defaultTxStatus, success: true});
				}
			});
		},
		[chainID, dispatchConfiguration, provider, safeChainID]
	);

	return (
		<>
			<AllowancesFilters />
			<AllowancesTable revoke={revokeTokenAllowance} />

			<ErrorModal
				isOpen={revokeStatus.error}
				onClose={(): void => {
					set_revokeStatus(defaultTxStatus);
					dispatchConfiguration({type: 'SET_TOKEN_TO_REVOKE', payload: undefined});
				}}
				title={'Error'}
				content={'An error occured while revoking  your token, please try again.'}
				ctaLabel={'Close'}
			/>

			<SuccessModal
				isOpen={revokeStatus.success}
				onClose={(): void => {
					set_revokeStatus(defaultTxStatus);
					dispatchConfiguration({type: 'SET_TOKEN_TO_REVOKE', payload: undefined});
				}}
				title={'It looks like a success!'}
				content={`${configuration.tokenToRevoke?.name} token has successfully revoked on ${configuration.tokenToRevoke?.spender} contract`}
				ctaLabel={'Close'}
			/>
		</>
	);
};
