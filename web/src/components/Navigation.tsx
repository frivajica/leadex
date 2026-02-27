import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';
import { authApi } from '../lib/api';

interface NavigationProps {
	currentPath: string;
}

export default function Navigation({ currentPath }: NavigationProps) {
	const { t, ready } = useTranslation();
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	if (!ready || !mounted) return null;

	const handleLogout = async () => {
		try {
			await authApi.logout();
		} catch {
			// Continue with redirect even if API fails
		}
		window.location.href = '/login';
	};

	const navItems = [
		{ href: '/dashboard', label: t('nav.dashboard'), key: 'dashboard' },
		{ href: '/jobs', label: t('nav.all_jobs', 'All Jobs'), key: 'all_jobs' },
		{ href: '/jobs/new', label: t('nav.new_job'), key: 'new_job' },
		{ href: '/settings', label: t('nav.settings'), key: 'settings' },
	];

	return (
		<nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center gap-3">
						<a href="/" className="flex items-center gap-2">
							<div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
								<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>
							<span className="text-xl font-bold text-gray-900">Lead Extractor</span>
						</a>
					</div>
					<div className="flex items-center gap-1">
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${currentPath === item.href
									? 'bg-primary-50 text-primary-700'
									: 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
									}`}
							>
								{item.label}
							</a>
						))}

						<div className="ml-2 pl-4 border-l border-gray-200 flex items-center gap-4">
							<LanguageSwitcher />
							<button
								onClick={handleLogout}
								className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
								title={t('nav.sign_out')}
							>
								<div className="flex items-center gap-1.5">
									<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
									</svg>
									<span className="hidden md:inline">{t('nav.sign_out')}</span>
								</div>
							</button>
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}
