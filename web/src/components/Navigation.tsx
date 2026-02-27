import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';
import LanguageSwitcher from './LanguageSwitcher';
import { authApi } from '../lib/api';

interface NavigationProps {
	currentPath: string;
	lang?: string;
}

export default function Navigation({ currentPath, lang }: NavigationProps) {
	const { t, ready, i18n } = useTranslation();
	const [mounted, setMounted] = useState(false);

	// Synchronize language during SSR and on first mount
	if (lang && i18n.language !== lang) {
		i18n.changeLanguage(lang);
	}

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
		<nav className="bg-slate-50/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-50">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between h-16">
					<div className="flex items-center gap-3">
						<a href="/" className="flex items-center gap-2 group transition-transform active:scale-95">
							<div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-premium group-hover:shadow-premium-hover transition-all duration-300">
								<svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
							</div>
							<span className="text-xl font-bold text-slate-900 group-hover:text-primary-700 transition-colors">Lead Extractor</span>
						</a>
					</div>
					<div className="flex items-center gap-1">
						{navItems.map((item) => (
							<a
								key={item.href}
								href={item.href}
								className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 active:scale-95 ${currentPath === item.href
									? 'bg-primary-50 text-primary-700 shadow-sm ring-1 ring-primary-500/20'
									: 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
									}`}
							>
								{item.label}
							</a>
						))}
						<div className="h-6 w-px bg-slate-200 mx-2"></div>
						<LanguageSwitcher />
						<button
							onClick={handleLogout}
							className="px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all duration-200 active:scale-95 ml-1"
						>
							{t('nav.sign_out')}
						</button>
					</div>
				</div>
			</div>
		</nav>
	);
}
