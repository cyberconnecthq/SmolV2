import React, {useMemo} from 'react';
import {Toaster} from 'react-hot-toast';
import PlausibleProvider from 'next-plausible';
import {WalletContextApp} from '@builtbymom/web3/contexts/useWallet';
import {WithMom} from '@builtbymom/web3/contexts/WithMom';
import Layout from '@lib/common/Layout';
import {Meta} from '@lib/common/Meta';
import {WithFonts} from '@lib/common/WithFonts';
import {
	IconAppAddressBook,
	IconAppDisperse,
	IconAppEarn,
	IconAppSend,
	IconAppStream,
	IconAppSwap
} from '@lib/icons/IconApps';
import {IconCheck} from '@lib/icons/IconCheck';
import {IconCircleCross} from '@lib/icons/IconCircleCross';
import {IconWallet} from '@lib/icons/IconWallet';
import {CHAINS} from '@lib/utils/tools.chains';

import type {AppProps} from 'next/app';
import type {ReactElement} from 'react';

import '../style.css';

const MENU = [
	{
		href: '/apps/send',
		label: 'Send',
		icon: <IconAppSend />
	},
	{
		href: '/apps/disperse',
		label: 'Disperse',
		icon: <IconAppDisperse />
	},
	{
		href: '/apps/swap',
		label: 'Swap',
		icon: <IconAppSwap />
	},
	{
		href: '/apps/earn',
		label: 'Earn',
		isDisabled: true,
		icon: <IconAppEarn />
	},
	{
		href: '/apps/stream',
		label: 'Stream',
		isDisabled: true,
		icon: <IconAppStream />
	},
	{
		href: '/apps/address-book',
		label: 'Address Book',
		icon: <IconAppAddressBook />
	},
	{
		href: '/apps/wallet',
		label: 'Wallet',
		icon: <IconWallet />
	}
];

function MyApp(props: AppProps): ReactElement {
	const supportedNetworks = useMemo(() => {
		return Object.values(CHAINS).filter(e => e.isMultisafeSupported);
	}, []);

	return (
		<WithFonts>
			<Meta
				title={'MultiSafe - SmolDapp'}
				description={'One address, all the chains. Deploy your Safe across multiple chains.'}
				titleColor={'#000000'}
				themeColor={'#FFD915'}
				og={'https://smold.app/og_multisafe.png'}
				uri={'https://multisafe.app'}
			/>
			<WithMom
				supportedChains={supportedNetworks}
				tokenLists={['https://raw.githubusercontent.com/SmolDapp/tokenLists/main/lists/1/tokenlistooor.json']}>
				<WalletContextApp>
					<PlausibleProvider
						domain={process.env.PLAUSIBLE_DOMAIN || 'multisafe.app'}
						enabled={true}>
						<main className={'relative mx-auto mb-0 flex min-h-screen w-full flex-col'}>
							<Layout
								{...(props as any)} // eslint-disable-line @typescript-eslint/no-explicit-any
								menu={[
									...MENU
									// {
									// 	href: '/new-safe',
									// 	label: 'Create a Safe',
									// 	icon: <IconSquarePlus />
									// },
									// {
									// 	href: '/clone-safe',
									// 	label: 'Clone a Safe',
									// 	icon: <IconClone />
									// }
								]}
							/>
						</main>
					</PlausibleProvider>
				</WalletContextApp>
			</WithMom>
			<Toaster
				toastOptions={{
					duration: 5000,
					className: 'toast',
					success: {
						icon: <IconCheck className={'-mr-1 size-5 min-h-5 min-w-5 pt-1.5'} />,
						iconTheme: {
							primary: 'black',
							secondary: '#F1EBD9'
						}
					},
					error: {
						icon: <IconCircleCross className={'-mr-1 size-5 min-h-5 min-w-5 pt-1.5'} />,
						iconTheme: {
							primary: 'black',
							secondary: '#F1EBD9'
						}
					}
				}}
				position={'top-right'}
			/>
		</WithFonts>
	);
}
export default MyApp;
