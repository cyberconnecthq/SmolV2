import {createContext, useCallback, useContext, useEffect, useMemo} from 'react';
import {useRouter} from 'next/router';
import {useSend} from 'packages/smol/components/Send/useSend';
import {useBalances} from '@builtbymom/web3/hooks/useBalances.multichains';
import {useChainID} from '@builtbymom/web3/hooks/useChainID';
import {toAddress, toNormalizedBN} from '@builtbymom/web3/utils';
import {useDeepCompareEffect} from '@react-hookz/web';
import {useSyncUrlParams} from '@smolHooks/useSyncUrlParams';
import {useValidateAddressInput} from '@lib/hooks/useValidateAddressInput';
import {useValidateAmountInput} from '@lib/hooks/useValidateAmountInput';
import {isString} from '@lib/types/utils';
import {optionalRenderProps} from '@lib/utils/react/optionalRenderProps';
import {getStateFromUrlQuery} from '@lib/utils/url/getStateFromUrlQuery';

import {newSendVoidInput} from './useSend.helpers';

import type {ReactElement} from 'react';
import type {TToken} from '@builtbymom/web3/types';
import type {TSendQuery} from '@lib/types/app.send';
import type {TTokenAmountInputElement} from '@lib/types/utils';
import type {TOptionalRenderProps} from '@lib/utils/react/optionalRenderProps';
import type {TInputAddressLike} from '@lib/utils/tools.address';

type TSendQueryManagement = {
	stateFromUrl: TSendQuery;
	initialStateFromUrl: TSendQuery | null;
	hasInitialInputs: boolean;
};

const defaultProps = {
	stateFromUrl: {to: undefined, tokens: undefined, values: undefined},
	initialStateFromUrl: null,
	hasInitialInputs: false
};

const SendQueryManagementContext = createContext<TSendQueryManagement>(defaultProps);

export const SendQueryManagement = (props: {
	children: TOptionalRenderProps<TSendQueryManagement, ReactElement>;
}): ReactElement => {
	const {initialStateFromUrl, stateFromUrl, hasInitialInputs} = useSendQuery();
	const {configuration} = useSend();

	/**
	 * Update the url query on every change in the UI
	 */
	useSyncUrlParams({
		to: configuration.receiver.address,
		tokens: configuration.inputs.map(input => input.token?.address).filter(isString),
		values: configuration.inputs
			.map(input => (input.amount === '' ? undefined : input.normalizedBigAmount?.raw.toString()))
			.filter(isString)
	});

	const contextValue = useMemo(
		(): TSendQueryManagement => ({
			stateFromUrl,
			initialStateFromUrl,
			hasInitialInputs
		}),
		[hasInitialInputs, initialStateFromUrl, stateFromUrl]
	);

	return (
		<SendQueryManagementContext.Provider value={contextValue}>
			{optionalRenderProps(props.children, contextValue)}
		</SendQueryManagementContext.Provider>
	);
};

export function useSendQuery(): {
	initialStateFromUrl: TSendQuery | null;
	stateFromUrl: TSendQuery;
	hasInitialInputs: boolean;
} {
	const router = useRouter();
	const searchParams = new URLSearchParams(router.asPath.split('?')[1]);

	const {dispatchConfiguration} = useSend();
	const {safeChainID} = useChainID();

	const queryParams = Object.fromEntries(searchParams.entries());
	const stateFromUrl = getStateFromUrlQuery<TSendQuery>(queryParams, ({string, array}) => ({
		to: string('to'),
		tokens: array('tokens'),
		values: array('values')
	}));

	const initialStateFromUrl = useMemo(() => {
		return stateFromUrl;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const hasInitialInputs = Array.isArray(initialStateFromUrl.tokens) || Array.isArray(initialStateFromUrl.values);

	const initialTokensRaw =
		initialStateFromUrl?.tokens?.map(token => ({address: toAddress(token), chainID: safeChainID})) || [];

	/** Some tokens in URL may not be present in token list, so they should be fetched  */
	const {data: initialTokens} = useBalances({tokens: initialTokensRaw});

	const onSetRecipient = useCallback(
		(value: Partial<TInputAddressLike>): void => {
			dispatchConfiguration({type: 'SET_RECEIVER', payload: value});
		},
		[dispatchConfiguration]
	);

	const onAddToken = (initalValue: TTokenAmountInputElement): void => {
		dispatchConfiguration({
			type: 'ADD_INPUT',
			payload: initalValue
		});
	};

	const getInitialAmount = (index: number, token: TToken): string => {
		return initialStateFromUrl?.values?.[index] && token.address
			? toNormalizedBN(initialStateFromUrl?.values[index], token.decimals).display
			: '0';
	};

	const {validate: validateAddressInput} = useValidateAddressInput();

	/** Trigger validation when initial value changes */
	useEffect(() => {
		validateAddressInput(undefined, initialStateFromUrl?.to || '').then(result => onSetRecipient(result));
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [initialStateFromUrl?.to]);

	const {validate: validateTokenAmount} = useValidateAmountInput();

	/**
	 * Add missing token inputs if tokens or values are present in the url query
	 */
	useDeepCompareEffect(() => {
		const tokens = initialTokens[safeChainID] ? Object.values(initialTokens[safeChainID]) : [];
		if (!initialStateFromUrl || !Array.isArray(tokens)) {
			return;
		}
		tokens.forEach((token, index) => {
			const amount = getInitialAmount(index, token);
			const result = validateTokenAmount(amount, token);
			onAddToken({...newSendVoidInput(), ...result});
		});
	}, [initialTokens]);

	return {initialStateFromUrl, stateFromUrl, hasInitialInputs};
}

export function useSendQueryManagement(): TSendQueryManagement {
	const ctx = useContext(SendQueryManagementContext);
	if (!ctx) {
		throw new Error('SendQueryManagementContext not found');
	}
	return ctx;
}
