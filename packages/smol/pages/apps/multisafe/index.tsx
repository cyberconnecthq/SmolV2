import React from 'react';
import {useRouter} from 'next/router';
import {MultisafeAppInfo} from '@smolSections/Multisafe/AppInfo';
import CardWithIcon from '@smolSections/Multisafe/CardWithIcon';
import {MultisafeContextApp} from '@smolSections/Multisafe/useMultisafe';
import {IconClone} from '@lib/icons/IconClone';
import IconSquarePlus from '@lib/icons/IconSquarePlus';

import type {ReactElement} from 'react';

function Safe(): ReactElement {
	const router = useRouter();

	return (
		<div className={'grid w-full max-w-[600px]'}>
			<div className={'grid gap-4'}>
				<CardWithIcon
					icon={<IconClone />}
					label={'Clone a Safe'}
					description={
						'Clone an existing safe with the original configuration: same address, same owner, same threshold, different chain!'
					}
					onClick={async () => router.push('/apps/multisafe/clone-safe')}
				/>
				<CardWithIcon
					icon={<IconSquarePlus />}
					label={'Create a Safe'}
					description={'Create your own fancy new safe with your own custom address!'}
					onClick={async () => router.push('/apps/multisafe/new-safe')}
				/>
			</div>
		</div>
	);
}

export default function MultisafeWrapper(): ReactElement {
	return (
		<MultisafeContextApp>
			<Safe />
		</MultisafeContextApp>
	);
}

MultisafeWrapper.AppName = 'MultiSafe';
MultisafeWrapper.AppDescription =
	'Make your multi-sig, multi-chain: get the same Safe address on all chains. Wow, fancy!';
MultisafeWrapper.AppInfo = <MultisafeAppInfo />;
