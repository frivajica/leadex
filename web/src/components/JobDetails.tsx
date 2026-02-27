import { useState, useEffect, useCallback, useMemo } from 'react';
import { jobsApi, resultsApi, type Job, type Lead } from '../lib/api';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

interface JobDetailsProps {
  jobId: number;
  apiUrl: string;
}

export default function JobDetails({ jobId, apiUrl }: JobDetailsProps) {
  const { t, ready } = useTranslation();
  const [job, setJob] = useState<Job | null>(null);
  const [results, setResults] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  const [sortColumn, setSortColumn] = useState<'score' | 'name' | 'rating' | 'distance'>('score');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filterText, setFilterText] = useState('');
  const [websiteFilter, setWebsiteFilter] = useState<'all' | 'yes' | 'no'>('all');

  const loadJob = useCallback(async () => {
    try {
      const jobData = await jobsApi.get(jobId);
      setJob(jobData);

      if (jobData.status === 'completed') {
        const resultsData = await resultsApi.list(jobId, 100, 0);
        setResults(resultsData.results);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('jobs.error_load'));
    } finally {
      setLoading(false);
    }
  }, [jobId, t]);

  useEffect(() => {
    loadJob();

    const interval = setInterval(() => {
      if (job?.status === 'running' || job?.status === 'queued') {
        loadJob();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadJob, job?.status]);

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const endpoint = format === 'csv'
        ? `/api/jobs/${jobId}/results/export?format=csv`
        : `/api/jobs/${jobId}/results/export?format=json`;

      const response = await fetch(`${apiUrl}${endpoint}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'error.generic' }));
        throw new Error(errorData.detail || 'error.generic');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads_${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err.detail || err.message || 'error.generic');
      alert(t(errorMessage));
    }
  };

  const handleDelete = async () => {
    if (!confirm(t('jobs.delete_confirm'))) return;

    try {
      await jobsApi.delete(jobId);
      window.location.href = '/dashboard';
    } catch (err) {
      alert(t('jobs.error_delete'));
    }
  };

  const handleRestart = async () => {
    try {
      await jobsApi.restart(jobId);
      loadJob();
    } catch (err) {
      alert(t('jobs.error_restart'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 100) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    if (score >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const handleSort = (column: 'score' | 'name' | 'rating' | 'distance') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredResults = useMemo(() => {
    let filtered = results;

    if (filterText) {
      const search = filterText.toLowerCase();
      filtered = filtered.filter(r =>
        r.name?.toLowerCase().includes(search) ||
        r.business_type?.toLowerCase().includes(search) ||
        r.address?.toLowerCase().includes(search)
      );
    }

    if (websiteFilter !== 'all') {
      filtered = filtered.filter(r =>
        websiteFilter === 'yes' ? !!r.website : !r.website
      );
    }

    return filtered;
  }, [results, filterText, websiteFilter]);

  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'score':
          comparison = (a.lead_score || 0) - (b.lead_score || 0);
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'rating':
          comparison = (a.rating || 0) - (b.rating || 0);
          break;
        case 'distance':
          comparison = (a.distance_km || 0) - (b.distance_km || 0);
          break;
      }
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }, [filteredResults, sortColumn, sortDirection]);

  if (!mounted || loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error || t('jobs.error_not_found')}
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{job.name}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(job.status)}`}>
                {t(`jobs.status.${job.status}`)}
              </span>
            </div>
            <p className="text-gray-500">
              {t('jobs.created')} {new Date(job.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-2">
            {(job.status === 'failed' || job.status === 'cancelled') && (
              <button
                onClick={handleRestart}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('common.restart')}
              </button>
            )}
            {job.status === 'running' && (
              <button
                onClick={() => jobsApi.cancel(jobId)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
            >
              {t('common.delete')}
            </button>
          </div>
        </div>

        {job.status === 'running' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>{t('jobs.progress')}</span>
              <span>{job.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all"
                style={{ width: `${job.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {job.status === 'failed' && job.error_message && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            <strong>{t('common.error')}:</strong> {job.error_message}
          </div>
        )}
      </div>

      {job.status === 'completed' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">{results.length}</div>
            <div className="text-gray-600">{t('jobs.total_leads')}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {results.length > 0
                ? Math.round(results.reduce((sum, r) => sum + (r.lead_score || 0), 0) / results.length)
                : 0}
            </div>
            <div className="text-gray-600">{t('jobs.avg_score')}</div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="text-2xl font-bold text-gray-900">
              {results.filter(r => r.website).length}
            </div>
            <div className="text-gray-600">{t('jobs.with_website')}</div>
          </div>
        </div>
      )}

      {job.status === 'completed' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder={t('jobs.search_leads')}
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm w-48"
              />
              <select
                value={websiteFilter}
                onChange={(e) => setWebsiteFilter(e.target.value as 'all' | 'yes' | 'no')}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">{t('common.all')}</option>
                <option value="yes">{t('jobs.with_website')}</option>
                <option value="no">{t('jobs.without_website')}</option>
              </select>
              <span className="text-sm text-gray-500">
                {sortedResults.length} / {results.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                {t('common.export_csv')}
              </button>
              <button
                onClick={() => handleExport('json')}
                className="px-4 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                {t('common.export_json')}
              </button>
            </div>
          </div>

          {sortedResults.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              {t('jobs.no_leads_found')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('score')}>{t('jobs.table_score')} {sortColumn === 'score' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>{t('jobs.table_name')} {sortColumn === 'name' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100">{t('jobs.table_type')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('rating')}>{t('jobs.table_rating')} {sortColumn === 'rating' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100" onClick={() => handleSort('distance')}>{t('jobs.table_distance')} {sortColumn === 'distance' ? (sortDirection === 'desc' ? '↓' : '↑') : ''}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('jobs.table_website')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('jobs.table_actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sortedResults.map((lead, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full ${getScoreColor(lead.lead_score || 0)} flex items-center justify-center text-white text-xs font-bold`}>
                            {lead.lead_score || 0}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{lead.name}</div>
                        <div className="text-sm text-gray-500">{lead.address}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{lead.business_type}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500">★</span>
                          <span>{lead.rating}</span>
                          <span className="text-gray-400 text-sm">({lead.review_count})</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {lead.distance_km ? `${lead.distance_km} km` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        {lead.website ? (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {t('common.visit')}
                          </a>
                        ) : (
                          <span className="text-green-600 font-medium">{t('jobs.no_website')}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {lead.maps_url && (
                          <a
                            href={lead.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:text-primary-700"
                          >
                            {t('common.maps')}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
