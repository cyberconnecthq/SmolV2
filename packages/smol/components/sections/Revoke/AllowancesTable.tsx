import {type ReactElement, useMemo, useState} from 'react';
import React from 'react';
import IconChevronPlain from 'packages/lib/icons/IconChevronPlain';
import {IconSpinner} from 'packages/lib/icons/IconSpinner';
import {cl} from '@builtbymom/web3/utils';

import {AllowanceItem} from './AllowanceItem';
import {AllowanceRow} from './AllowanceRow';
import {useAllowances} from './useAllowances';

import type {TAddress} from '@builtbymom/web3/types';
import type {TTokenAllowance} from '@lib/types/Revoke';

type TAllowancesTableProps = {
	revoke: (tokenToRevoke: TTokenAllowance, spender: TAddress) => void;
};

type TSortType = {
	sortBy: 'spender' | 'amount' | 'token' | null;
	asc: boolean;
};

export const AllowancesTable = ({revoke}: TAllowancesTableProps): ReactElement => {
	const {filteredAllowances: allowances, isLoading, isDoneWithInitialFetch} = useAllowances();
	const isFetchingData = !isDoneWithInitialFetch || isLoading;

	const [sort, set_sort] = useState<TSortType>({sortBy: null, asc: true});

	/**********************************************************************************************
	 ** Sorting allowances by amount, spender and token. All of them
	 ** are sorted ether asc or desc order. If sortings are not selected
	 ** we return allowances in the initial timestamp order
	 *********************************************************************************************/
	const sortedAllowances = useMemo(() => {
		if (sort.sortBy === 'amount') {
			return allowances?.toSorted((a, b) =>
				sort.asc ? (a.args.value! > b.args.value! ? -1 : 1) : a.args.value! < b.args.value! ? -1 : 1
			);
		}

		if (sort.sortBy === 'spender') {
			return allowances?.toSorted((a, b) =>
				sort.asc ? b.args.sender.localeCompare(a.args.sender) : a.args.sender.localeCompare(b.args.sender)
			);
		}

		if (sort.sortBy === 'token') {
			return allowances?.toSorted((a, b) =>
				a.symbol && b.symbol
					? sort.asc
						? b.symbol?.localeCompare(a.symbol)
						: a.symbol?.localeCompare(b.symbol)
					: 0
			);
		}

		return allowances;
	}, [allowances, sort.asc, sort.sortBy]);

	return (
		<>
			{(!allowances || allowances.length === 0) && !isFetchingData ? (
				<div className={'mt-10 flex w-full justify-center'}>
					<p>{'Nothing to revoke!'}</p>
				</div>
			) : (
				<>
					<table
						className={
							'mt-6 hidden w-full border-separate border-spacing-y-4 text-left text-sm text-gray-500 md:table md:w-full rtl:text-right dark:text-gray-400'
						}>
						{!isFetchingData && (
							<thead
								className={
									'w-full bg-gray-50 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-400'
								}>
								<tr>
									<th className={' font-light text-neutral-500'}>
										<button
											onClick={() =>
												set_sort(prev => {
													return {
														...sort,
														sortBy: 'token',
														asc: prev.sortBy === 'token' ? !prev.asc : prev.asc
													};
												})
											}
											className={cl(
												'flex items-center',
												sort.sortBy === 'token' ? 'text-neutral-800' : ''
											)}>
											<p>{'Asset'}</p>
											{sort.sortBy === 'token' && !sort.asc ? (
												<IconChevronPlain className={'ml-1 size-4 rotate-180'} />
											) : sort.sortBy === 'token' && sort.asc ? (
												<IconChevronPlain className={'ml-1 size-4'} />
											) : (
												<IconChevronPlain className={'ml-1 size-4'} />
											)}
										</button>
									</th>
									<th className={'flex justify-end font-light text-neutral-500'}>
										<button
											onClick={() =>
												set_sort(prev => {
													return {
														...sort,
														sortBy: 'amount',
														asc: prev.sortBy === 'amount' ? !prev.asc : prev.asc
													};
												})
											}
											className={cl(
												'flex items-center',
												sort.sortBy === 'amount' ? 'text-neutral-800' : ''
											)}>
											<p>{'Amount'}</p>
											{sort.sortBy === 'amount' && !sort.asc ? (
												<IconChevronPlain className={'ml-1 size-4 rotate-180'} />
											) : sort.sortBy === 'amount' && sort.asc ? (
												<IconChevronPlain className={'ml-1 size-4'} />
											) : (
												<IconChevronPlain className={'ml-1 size-4'} />
											)}
										</button>
									</th>
									<th className={'px-6 font-light text-neutral-500'}>
										<div className={'flex justify-end'}>
											<button
												onClick={() =>
													set_sort(prev => {
														return {
															...sort,
															sortBy: 'spender',
															asc: prev.sortBy === 'spender' ? !prev.asc : prev.asc
														};
													})
												}
												className={cl(
													'flex items-center justify-end',
													sort.sortBy === 'spender' ? 'text-neutral-800' : ''
												)}>
												<p>{'Spender'}</p>
												{sort.sortBy === 'spender' && !sort.asc ? (
													<IconChevronPlain className={'ml-1 size-4 rotate-180'} />
												) : sort.sortBy === 'spender' && sort.asc ? (
													<IconChevronPlain className={'ml-1 size-4'} />
												) : (
													<IconChevronPlain className={'ml-1 size-4'} />
												)}
											</button>
										</div>
									</th>
									<th className={'px-6 font-medium'}></th>
								</tr>
							</thead>
						)}
						<tbody
							suppressHydrationWarning
							className={'w-full'}>
							{sortedAllowances?.map(item => (
								<AllowanceRow
									key={`${item.blockNumber}-${item.logIndex}`}
									allowance={item}
									revoke={revoke}
								/>
							))}
						</tbody>
					</table>
					<div className={'flex flex-col gap-y-2 md:hidden'}>
						{allowances?.map(item => (
							<AllowanceItem
								key={`${item.blockNumber}-${item.logIndex}`}
								revoke={revoke}
								allowance={item}
							/>
						))}
					</div>
				</>
			)}
			{isFetchingData && (
				<div className={'mt-10 flex items-center justify-center'}>
					<IconSpinner className={'size-6'} />
				</div>
			)}
		</>
	);
};
