import { useState, useEffect } from 'react';
import { jobsApi, keysApi, authApi, type Job, type User } from '../lib/api';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

interface DashboardContentProps {
  apiUrl?: string;
}

export default function DashboardContent({ apiUrl }: DashboardContentProps) {
  const { t, ready } = useTranslation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadJobs();
  }, []);

  const loadJobs = async () => {
    try {
      const [jobsData, keysData, userData] = await Promise.all([
        jobsApi.list(10, 0),
        keysApi.list(),
        authApi.me()
      ]);
      setJobs(jobsData.jobs);
      setHasApiKey(keysData.keys.length > 0);
      setUser(userData);
      console.log('[Dashboard] User data loaded:', userData);
      console.log('[Dashboard] Managed plan?', userData.subscription_tier !== 'free');
      console.log('[Dashboard] Credits?', userData.job_credits);
    } catch (err) {
      console.error('[Dashboard] Failed to load data:', err);
      setError(err instanceof Error ? err.message : t('auth.error_generic'));
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
        </div>
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

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const totalLeads = jobs.reduce((sum, j) => sum + (j.leads_found || 0), 0);
  const runningJobs = jobs.filter(j => j.status === 'running' || j.status === 'queued').length;

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t('dashboard.title')}</h1>
        <p className="text-slate-500 mt-2 leading-relaxed">{t('dashboard.desc')}</p>
      </div>

      {/* Account Status Widget */}
      {hasApiKey !== null && user !== null && (
        <div className="mb-8">
          {hasApiKey ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-green-800">Free Tier Active</h3>
                <p className="text-sm text-green-700 mt-1">
                  You are using your personal Google Places API key. All lead extractions are free!
                </p>
              </div>
            </div>
          ) : user.subscription_tier === 'week' || user.subscription_tier === 'month' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-sm">
              <div className="flex-shrink-0 mt-0.5">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-800">
                  {user.subscription_tier === 'week' ? 'Weekly' : 'Monthly'} Plan Active
                </h3>
                <p className="text-sm text-blue-700 mt-1">
                  Unlimited access until {new Date(user.subscription_expires_at!).toLocaleDateString()}.
                </p>
              </div>
            </div>
          ) : user.job_credits > 0 ? (
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-indigo-800">
                    {user.job_credits} Job Credit{user.job_credits !== 1 ? 's' : ''} Remaining
                  </h3>
                  <p className="text-sm text-indigo-700 mt-1">
                    Save more with a weekly or monthly subscription for unlimited access.
                  </p>
                </div>
              </div>
              <a
                href="/checkout"
                className="flex-shrink-0 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Subscribe & Save
              </a>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Action Required: Choose a Plan</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Add your Google API Key (Free) or select a Managed Plan to start extracting.
                  </p>
                </div>
              </div>
              <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                <a href="/settings" className="flex-1 sm:flex-none text-center px-4 py-2 bg-white text-yellow-700 border border-yellow-300 rounded-lg text-sm font-medium hover:bg-yellow-100 transition-colors shadow-sm">
                  Add API Key
                </a>
                <a href="/checkout" className="flex-1 sm:flex-none text-center px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors shadow-sm">
                  View Plans
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-premium p-6 ring-1 ring-slate-200/50 hover:shadow-premium-hover transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('dashboard.stats.total_jobs')}</p>
              <p className="text-3xl font-bold tracking-tight text-slate-900 mt-2">{totalJobs}</p>
            </div>
            <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center ring-1 ring-primary-500/10">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-premium p-6 ring-1 ring-slate-200/50 hover:shadow-premium-hover transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('dashboard.stats.completed')}</p>
              <p className="text-3xl font-bold tracking-tight text-green-600 mt-2">{completedJobs}</p>
            </div>
            <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center ring-1 ring-green-500/10">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-premium p-6 ring-1 ring-slate-200/50 hover:shadow-premium-hover transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('dashboard.stats.total_leads')}</p>
              <p className="text-3xl font-bold tracking-tight text-accent-600 mt-2">{totalLeads.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center ring-1 ring-accent-500/10">
              <svg className="w-6 h-6 text-accent-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-premium p-6 ring-1 ring-slate-200/50 hover:shadow-premium-hover transition-all duration-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{t('dashboard.stats.running')}</p>
              <p className="text-3xl font-bold tracking-tight text-blue-600 mt-2">{runningJobs}</p>
            </div>
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center ring-1 ring-blue-500/10">
              <svg className={`w-6 h-6 text-blue-600${runningJobs > 0 ? ' animate-spin-slow' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <a
          href="/jobs/new"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl hover:bg-primary-700 hover:shadow-lg transition-all duration-200 active:scale-95 font-medium shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('dashboard.actions.create_new')}
        </a>
      </div>

      <div className="bg-white rounded-2xl shadow-premium overflow-hidden ring-1 ring-slate-200/50">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">{t('dashboard.table.recent_jobs')}</h2>
          {jobs.length > 0 && (
            <span className="text-sm font-medium text-slate-500 bg-white px-2.5 py-1 rounded-full ring-1 ring-slate-200/50">
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {jobs.length === 0 ? (
          <div className="p-16 text-center bg-slate-50/30">
            <div className="w-20 h-20 bg-white shadow-sm ring-1 ring-slate-200/50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">{t('dashboard.table.no_jobs')}</h3>
            <p className="text-slate-500 mb-8 max-w-sm mx-auto leading-relaxed">{t('dashboard.table.no_jobs_desc')}</p>
            <a
              href="/jobs/new"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all duration-200 active:scale-95 shadow-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('dashboard.actions.create_first')}
            </a>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {jobs.slice(0, 3).map((job) => {
              const statusStyle = getStatusColor(job.status);
              return (
                <a
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="block px-6 py-5 hover:bg-slate-50/80 transition-all duration-200 group active:bg-slate-100/50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ring-1 ring-slate-900/5 group-hover:scale-105 transition-transform duration-300 ${statusStyle.bg}`}>
                        <div className={`w-2.5 h-2.5 rounded-full ${statusStyle.dot}`}></div>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900 group-hover:text-primary-700 transition-colors">
                            {job.name}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} ring-1 ring-inset ring-slate-900/5`}>
                            {getStatusIcon(job.status)}
                            {t(`jobs.status.${job.status}`)}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
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

        {totalJobs > 3 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <a href="/jobs" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              {t('dashboard.table.view_all')} →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
