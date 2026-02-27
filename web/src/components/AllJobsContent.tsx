import { useState, useEffect, useRef, useCallback } from 'react';
import { jobsApi, type Job } from '../lib/api';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

const PAGE_SIZE = 10;

export default function AllJobsContent() {
	const { t, ready } = useTranslation();
	const [jobs, setJobs] = useState<Job[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [error, setError] = useState('');
	const [mounted, setMounted] = useState(false);
	const sentinelRef = useRef<HTMLDivElement>(null);

	const hasMore = jobs.length < total;

	useEffect(() => {
		setMounted(true);
		loadInitial();
	}, []);

	const loadInitial = async () => {
		try {
			const data = await jobsApi.list(PAGE_SIZE, 0);
			setJobs(data.jobs);
			setTotal(data.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : t('jobs.error_load_all'));
		} finally {
			setLoading(false);
		}
	};

	const loadMore = useCallback(async () => {
		if (loadingMore || !hasMore) return;
		setLoadingMore(true);
		try {
			const data = await jobsApi.list(PAGE_SIZE, jobs.length);
			setJobs(prev => [...prev, ...data.jobs]);
			setTotal(data.total);
		} catch (err) {
			setError(err instanceof Error ? err.message : t('jobs.error_load_more'));
		} finally {
			setLoadingMore(false);
		}
	}, [jobs.length, loadingMore, hasMore]);

	// Infinite scroll via IntersectionObserver
	useEffect(() => {
		if (!sentinelRef.current || !hasMore) return;

		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) {
					loadMore();
				}
			},
			{ rootMargin: '200px' }
		);

		observer.observe(sentinelRef.current);
		return () => observer.disconnect();
	}, [loadMore, hasMore]);

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'completed':
				return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' };
			case 'running':
				return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
			case 'queued':
				return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' };
			case 'failed':
				return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
			case 'cancelled':
				return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
			default:
				return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-500' };
		}
	};

	const getStatusIcon = (status: string) => {
		switch (status) {
			case 'completed':
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				);
			case 'running':
				return (
					<svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
					</svg>
				);
			case 'queued':
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
				);
			case 'failed':
				return (
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
					</svg>
				);
			default:
				return null;
		}
	};

	if (!mounted) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mx-auto"></div>
			</div>
		);
	}

	if (!ready || loading) {
		return (
			<div className="flex items-center justify-center py-20">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
					<p className="text-gray-500">{t('common.loading')}</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
				<div className="flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					{error}
				</div>
			</div>
		);
	}

	return (
		<div className="animate-fade-in">
			<div className="flex items-center justify-between mb-6">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">{t('nav.all_jobs')}</h1>
					<p className="text-gray-500 mt-1">{t('dashboard.table.job_total', { count: total })}</p>
				</div>
				<a
					href="/jobs/new"
					className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all duration-200 shadow-lg hover:shadow-xl font-medium text-sm"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					{t('dashboard.actions.create_new')}
				</a>
			</div>

			<div className="bg-white rounded-xl shadow-card overflow-hidden border border-gray-100">
				{jobs.length === 0 ? (
					<div className="p-12 text-center">
						<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
							<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
							</svg>
						</div>
						<h3 className="text-lg font-medium text-gray-900 mb-2">{t('dashboard.table.no_jobs')}</h3>
						<p className="text-gray-500 mb-6">{t('dashboard.table.no_jobs_desc')}</p>
						<a
							href="/jobs/new"
							className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
						>
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
							</svg>
							{t('dashboard.actions.create_first')}
						</a>
					</div>
				) : (
					<div className="divide-y divide-gray-100">
						{jobs.map((job) => {
							const statusStyle = getStatusColor(job.status);
							return (
								<a
									key={job.id}
									href={`/jobs/${job.id}`}
									className="block px-6 py-4 hover:bg-gray-50 transition-colors group"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-4">
											<div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusStyle.bg}`}>
												<div className={`w-2 h-2 rounded-full ${statusStyle.dot}`}></div>
											</div>
											<div>
												<div className="flex items-center gap-2">
													<span className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
														{job.name}
													</span>
													<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
														{getStatusIcon(job.status)}
														{t(`jobs.status.${job.status}`)}
													</span>
												</div>
												<div className="text-sm text-gray-500 mt-0.5">
													{new Date(job.created_at).toLocaleDateString(undefined, {
														month: 'short',
														day: 'numeric',
														year: 'numeric',
														hour: '2-digit',
														minute: '2-digit'
													})}
												</div>
											</div>
										</div>
										<div className="flex items-center gap-6">
											{job.status === 'running' && job.progress > 0 && (
												<div className="text-right">
													<div className="text-sm font-medium text-gray-900">{job.progress}%</div>
													<div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1">
														<div
															className="h-full bg-primary-600 rounded-full transition-all"
															style={{ width: `${job.progress}%` }}
														/>
													</div>
												</div>
											)}
											{job.status === 'completed' && job.leads_found > 0 && (
												<div className="text-right">
													<div className="text-sm font-medium text-gray-900">{job.leads_found.toLocaleString()}</div>
													<div className="text-xs text-gray-500">{t('dashboard.table.leads_found')}</div>
												</div>
											)}
											<svg className="w-5 h-5 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
											</svg>
										</div>
									</div>
								</a>
							);
						})}
					</div>
				)}

				{/* Infinite scroll sentinel */}
				{hasMore && (
					<div ref={sentinelRef} className="px-6 py-4 flex items-center justify-center">
						<div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-200 border-t-primary-600"></div>
						<span className="ml-3 text-sm text-gray-500">{t('dashboard.table.loading_more')}</span>
					</div>
				)}
			</div>
		</div>
	);
}
