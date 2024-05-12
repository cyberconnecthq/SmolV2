import React, {Fragment, useCallback, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import assert from 'assert';
import {concat, encodePacked, getContractAddress, hexToBigInt, keccak256, toHex} from 'viem';
import {cl, isZeroAddress, toAddress, toBigInt} from '@builtbymom/web3/utils';
import {useMultisafe} from '@multisafe/contexts/useMultisafe';
import {
	GNOSIS_SAFE_PROXY_CREATION_CODE,
	PROXY_FACTORY_L2,
	PROXY_FACTORY_L2_DDP,
	SINGLETON_L2,
	SINGLETON_L2_DDP
} from '@multisafeUtils/constants';
import {generateArgInitializers} from '@multisafeUtils/utils';
import {useMountEffect, useUpdateEffect} from '@react-hookz/web';
import {SmolAddressInput} from '@lib/common/SmolAddressInput';
import {IconCross} from '@lib/icons/IconCross';
import {IconDoc} from '@lib/icons/IconDoc';
import {IconFire} from '@lib/icons/IconFire';
import {Button} from '@lib/primitives/Button';

import {PossibleSafe} from './4.ViewNewSafe.possible';
import {ConfigurationStatus} from './ConfigurationStatus';

import type {ReactElement} from 'react';
import type {Hex} from 'viem';
import type {TAddress} from '@builtbymom/web3/types';
import type {TInputAddressLikeWithUUID} from '@multisafe/contexts/useMultisafe';
import type {TInputAddressLike} from '@multisafeCommons/AddressInput';
import type {TNewSafe} from './4.ViewNewSafe';

type TOwners = {
	address: TAddress | undefined;
	label: string;
	UUID: string;
};

export function newVoidOwner(): TOwners {
	return {
		address: undefined,
		label: '',
		UUID: crypto.randomUUID()
	};
}

function SafeOwner(props: {
	owner: TInputAddressLike;
	updateOwner: (value: Partial<TInputAddressLike>) => void;
	removeOwner: () => void;
}): ReactElement {
	const inputRef = useRef<HTMLInputElement>(null);

	return (
		<div className={'flex w-full max-w-full'}>
			<SmolAddressInput
				inputRef={inputRef}
				onSetValue={props.updateOwner}
				value={props.owner}
			/>
			<button
				className={'mx-2 p-2 text-neutral-600 transition-colors hover:text-neutral-700'}
				onClick={props.removeOwner}>
				<IconCross className={'size-4'} />
			</button>
		</div>
	);
}

function ViewNewSafeOwners(): ReactElement {
	const {threshold, onUpdateThreshold, owners, onAddOwner, onUpdateOwner, onRemoveOwner} = useMultisafe();
	const [prefix, set_prefix] = useState<string | undefined>(undefined);
	const [suffix, set_suffix] = useState('');
	const [seed, set_seed] = useState<bigint | undefined>(undefined);
	const [factory, set_factory] = useState<'ssf' | 'ddp'>('ssf');
	const [shouldUseExpertMode, set_shouldUseExpertMode] = useState<boolean>(false);
	const shouldCancel = useRef(false);
	const [isLoadingSafes, set_isLoadingSafes] = useState(false);
	const [possibleSafe, set_possibleSafe] = useState<TNewSafe | undefined>(undefined);
	const [currentSeed, set_currentSeed] = useState(0n);

	useMountEffect((): void => {
		set_currentSeed(hexToBigInt(keccak256(concat([toHex('smol'), toHex(Math.random().toString())]))));
		set_possibleSafe(undefined);
	});

	useUpdateEffect((): void => {
		set_possibleSafe(undefined);
	}, [owners, threshold]);

	const compute = useCallback(
		async ({
			argInitializers,
			bytecode,
			prefix,
			suffix,
			saltNonce
		}: {
			argInitializers: string;
			bytecode: Hex;
			prefix: string;
			suffix: string;
			saltNonce: bigint;
		}): Promise<{address: TAddress; salt: bigint}> => {
			if (shouldCancel.current) {
				return {address: '' as TAddress, salt: 0n};
			}
			const salt = keccak256(encodePacked(['bytes', 'uint256'], [keccak256(`0x${argInitializers}`), saltNonce]));
			const addrCreate2 = getContractAddress({
				bytecode,
				from: factory == 'ssf' ? PROXY_FACTORY_L2 : PROXY_FACTORY_L2_DDP,
				opcode: 'CREATE2',
				salt
			});
			if (addrCreate2.startsWith(prefix) && addrCreate2.endsWith(suffix)) {
				return {address: addrCreate2, salt: saltNonce};
			}
			const newSalt = hexToBigInt(keccak256(concat([toHex('smol'), toHex(Math.random().toString())])));
			set_currentSeed(newSalt);
			await new Promise(resolve => setTimeout(resolve, 0));
			return compute({argInitializers, bytecode, prefix, suffix, saltNonce: newSalt});
		},
		[shouldCancel, factory]
	);

	const generateCreate2Addresses = useCallback(async (): Promise<void> => {
		set_possibleSafe(undefined);
		const salt = currentSeed;

		set_isLoadingSafes(true);
		const ownersAddresses = owners.map(owner => toAddress(owner.address));
		const argInitializers = generateArgInitializers(ownersAddresses, threshold);
		const bytecode = encodePacked(
			['bytes', 'uint256'],
			[GNOSIS_SAFE_PROXY_CREATION_CODE, hexToBigInt(factory == 'ssf' ? SINGLETON_L2 : SINGLETON_L2_DDP)]
		);
		const result = await compute({
			argInitializers,
			bytecode,
			prefix: prefix || '0x',
			suffix,
			saltNonce: salt
		});
		if (shouldCancel.current) {
			shouldCancel.current = false;
			set_possibleSafe(undefined);
			set_isLoadingSafes(false);
			return;
		}
		shouldCancel.current = false;
		set_possibleSafe({
			address: result.address,
			salt: result.salt,
			owners: ownersAddresses,
			threshold,
			prefix: prefix || '0x',
			suffix,
			singleton: factory == 'ssf' ? SINGLETON_L2 : SINGLETON_L2_DDP
		});
		set_currentSeed(result.salt);
		set_isLoadingSafes(false);
	}, [currentSeed, owners, threshold, compute, prefix, suffix, factory]);

	const linkToDeploy = useMemo(() => {
		const URLQueryParam = new URLSearchParams();

		URLQueryParam.set('address', possibleSafe?.address || '');
		URLQueryParam.set('owners', owners.map(owner => toAddress(owner.address)).join('_'));
		URLQueryParam.set('threshold', threshold.toString());
		URLQueryParam.set('singleton', factory == 'ssf' ? SINGLETON_L2 : SINGLETON_L2_DDP);
		URLQueryParam.set('salt', currentSeed.toString());
		return URLQueryParam.toString();
	}, [currentSeed, factory, owners, threshold, possibleSafe?.address]);

	return (
		<div className={'grid w-full max-w-[600px]'}>
			<div className={'-mt-2 mb-6 flex flex-wrap gap-2 text-xs'}>
				<Button
					className={'!h-8 !text-xs'}
					variant={'light'}
					onClick={() => {
						// plausible('download template');
						// downloadTemplate();
					}}>
					<IconDoc className={'mr-2 size-3'} />
					{'View FAQ'}
				</Button>
				<Button
					className={'!h-8 !text-xs'}
					variant={shouldUseExpertMode ? 'filled' : 'light'}
					onClick={() => set_shouldUseExpertMode(!shouldUseExpertMode)}>
					<IconFire className={'mr-2 size-3'} />
					{'Use expert mode'}
				</Button>
			</div>
			<div className={'grid w-full max-w-[600px] gap-6'}>
				<div className={'w-full'}>
					<div className={'mb-2'}>
						<p className={'font-medium'}>{'Owners'}</p>
					</div>
					<div className={'grid gap-4'}>
						{owners.map((owner, index) => (
							<SafeOwner
								key={index}
								owner={owner}
								removeOwner={(): void => onRemoveOwner(owner.UUID)}
								updateOwner={(value): void => {
									onUpdateOwner(owner.UUID, {
										...value,
										UUID: owner.UUID
									} as TInputAddressLikeWithUUID);
								}}
							/>
						))}
					</div>
					<div className={'mb-2 mt-4'}>
						<button
							className={
								'rounded-lg bg-neutral-200 px-5 py-2 text-xs text-neutral-700 transition-colors hover:bg-neutral-300'
							}
							onClick={onAddOwner}>
							{'+ Add owner'}
						</button>
					</div>
				</div>

				<div className={'w-full max-w-[552px]'}>
					<div className={'mb-2'}>
						<p className={'font-medium'}>{'Customization'}</p>
					</div>
					<div className={'full grid max-w-full grid-cols-3 gap-x-4'}>
						<small>{'Threshold'}</small>
						<small>{'Prefix'}</small>
						<small>{'Suffix'}</small>

						<div
							className={cl(
								'h-12 w-full max-w-full md:max-w-[188px] rounded-lg p-2',
								'flex flex-row items-center justify-between cursor-text',
								'border border-neutral-400 focus-within:border-neutral-600 transition-colors'
							)}>
							<button
								className={cl(
									'h-full aspect-square rounded-lg flex items-center justify-center',
									'text-lg text-center text-neutral-600 hover:text-neutral-0',
									'bg-neutral-300 hover:bg-neutral-900',
									'transition-all opacity-100',
									'disabled:opacity-0'
								)}
								disabled={threshold <= 1}
								onClick={(): void => onUpdateThreshold(threshold - 1)}>
								{'-'}
							</button>
							<p className={'font-number font-medium'}>
								{threshold}
								<span className={'text-neutral-600'}>{` / ${owners.length}`}</span>
							</p>
							<button
								type={'button'}
								className={cl(
									'h-full aspect-square rounded-lg flex items-center justify-center',
									'text-lg text-center text-neutral-600 hover:text-neutral-0',
									'bg-neutral-300 hover:bg-neutral-900',
									'transition-all opacity-100',
									'disabled:opacity-0'
								)}
								disabled={threshold >= owners.length}
								onClick={(): void => onUpdateThreshold(threshold + 1)}>
								{'+'}
							</button>
						</div>

						<div
							className={cl(
								'h-12 w-full max-w-full md:max-w-[188px] rounded-lg p-2',
								'flex flex-row items-center justify-between cursor-text',
								'border border-neutral-400 focus-within:border-neutral-600 transition-colors'
							)}>
							<input
								id={'prefix'}
								onChange={(e): void => {
									let {value} = e.target;
									value = value.replaceAll('[^a-fA-F0-9]', '');
									if (!value || value === '0x' || value === '0X') {
										set_prefix(undefined);
										const input = document.getElementById('prefix') as HTMLInputElement;
										if (input) {
											input.value = '';
										}
									} else if (value.length <= 6) {
										if (!value || value === '0x' || value === '0X') {
											set_prefix(undefined);
										} else if (value.match(/^0x[a-fA-F0-9]{0,6}$/)) {
											set_prefix(value);
										} else if (value.match(/^[a-fA-F0-9]{0,4}$/) && !value.startsWith('0x')) {
											set_prefix(`0x${value}`);
										}
									}
								}}
								placeholder={'0x'}
								type={'text'}
								value={prefix}
								pattern={'^0x[a-fA-F0-9]{0,6}$'}
								className={'smol--input font-mono font-bold'}
							/>
						</div>

						<div
							className={cl(
								'h-12 w-full max-w-full md:max-w-[188px] rounded-lg p-2',
								'flex flex-row items-center justify-between cursor-text',
								'border border-neutral-400 focus-within:border-neutral-600 transition-colors'
							)}>
							<input
								onChange={(e): void => {
									const {value} = e.target;
									if (value.length <= 4) {
										if (value.match(/^[a-fA-F0-9]{0,4}$/)) {
											set_suffix(value);
										}
									}
								}}
								type={'text'}
								value={suffix}
								pattern={'[a-fA-F0-9]{0,6}$'}
								className={'smol--input font-mono font-bold'}
							/>
						</div>

						{shouldUseExpertMode && (
							<Fragment>
								<small className={'mt-4'}>{'Seed'}</small>
								<div
									className={cl(
										'col-span-3',
										'h-12 w-full rounded-lg p-2',
										'flex flex-row items-center justify-between cursor-text',
										'border border-neutral-400 focus-within:border-neutral-600 transition-colors'
									)}>
									<input
										onChange={(e): void => {
											const {value} = e.target;
											set_seed(toBigInt(value.replace(/\D/g, '')));
										}}
										type={'text'}
										value={seed ? seed.toString() : undefined}
										pattern={'[0-9]{0,512}$'}
										className={'smol--input font-mono font-bold'}
									/>
								</div>

								<small className={'mt-4'}>{'Factory'}</small>
								<div
									className={cl(
										'col-span-3',
										'h-12 w-full rounded-lg p-2',
										'flex flex-row items-center justify-between cursor-text',
										'border border-neutral-400 focus-within:border-neutral-600 transition-colors'
									)}>
									<select
										className={'smol--input font-mono font-bold'}
										value={factory}
										onChange={(e): void => {
											assert(['ssf', 'ddp'].includes(e.target.value));
											set_factory(e.target.value as 'ssf' | 'ddp');
										}}>
										<option value={'ssf'}>{'Safe Singleton Factory'}</option>
										<option value={'ddp'}>{'Deterministic Deployment Proxy'}</option>
									</select>
								</div>
							</Fragment>
						)}
					</div>
				</div>

				<div className={'flex flex-col'}>
					<div className={'w-full max-w-[552px]'}>
						<ConfigurationStatus
							owners={owners}
							threshold={threshold}
						/>
					</div>
					<div>
						<Button
							className={'group !h-8 w-auto md:min-w-[160px]'}
							isBusy={isLoadingSafes}
							isDisabled={owners.some((owner): boolean => !owner || isZeroAddress(owner.address))}
							onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
								e.currentTarget.blur();
								generateCreate2Addresses();
							}}>
							<p className={'text-sm'}>{'Generate'}</p>
							{isLoadingSafes ? (
								<span
									onClick={(e: React.MouseEvent<HTMLButtonElement>): void => {
										e.currentTarget.blur();
										shouldCancel.current = true;
									}}
									className={cl(
										'hover:!text-neutral-900 absolute inset-0 z-50 flex items-center justify-center',
										'transition-colors hover:cursor-pointer hover:bg-primaryHover rounded-lg'
									)}>
									<p className={'text-sm'}>{'Cancel'}</p>
								</span>
							) : null}
						</Button>
					</div>

					{possibleSafe && !isLoadingSafes ? (
						<Link href={`/deploy?${linkToDeploy}`}>
							<Button>{`Deploy ${possibleSafe?.address}`}</Button>
						</Link>
					) : null}
				</div>

				{possibleSafe && !isLoadingSafes ? (
					<PossibleSafe
						possibleSafe={possibleSafe}
						prefix={prefix || '0x'}
						suffix={suffix}
						currentSeed={currentSeed}
						factory={factory}
						shouldUseTestnets={false}
						onGenerate={generateCreate2Addresses}
					/>
				) : null}
			</div>
		</div>
	);
}

export default ViewNewSafeOwners;
