import { useState, useEffect } from 'react';
import { authApi, keysApi, type ApiKeys, type User } from '../lib/api';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

export default function SettingsContent() {
  const { t, ready } = useTranslation();
  const [user, setUser] = useState<User | null>(null);
  const [apiKeys, setApiKeys] = useState<ApiKeys[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [userData, keysData] = await Promise.all([
        authApi.me(),
        keysApi.list(),
      ]);
      setUser(userData);
      setApiKeys(keysData.keys);
    } catch (err) {
      window.location.href = '/login';
    } finally {
      setLoading(false);
    }
  };

  const handleAddKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || !newApiKey) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await keysApi.create(newKeyName, newApiKey);
      setNewKeyName('');
      setNewApiKey('');
      setSuccess(t('settings.api_key_added'));
      loadData();
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err.detail || err.message || 'error.generic');
      setError(t(errorMessage));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKey = async (keyId: number) => {
    if (!confirm(t('settings.api_key_delete_confirm'))) return;

    try {
      await keysApi.delete(keyId);
      setSuccess(t('settings.api_key_deleted'));
      loadData();
    } catch (err: any) {
      const errorMessage = typeof err === 'string' ? err : (err.detail || err.message || 'error.generic');
      setError(t(errorMessage));
    }
  };

  if (!ready || !mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        {ready && <p className="text-gray-500">{t('common.loading')}</p>}
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('settings.account')}</h2>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
            <span className="text-primary-600 font-bold text-xl">
              {user?.email?.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="font-medium text-gray-900">{user?.email}</div>
            <div className="text-sm text-gray-500">{t('settings.account_id')}: {user?.email}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{t('settings.billing_and_api', 'Billing & API Configuration')}</h2>
            <p className="text-sm text-gray-600 mt-1">
              {t('settings.billing_desc', 'Lead Extractor is free if you provide your own Google Places API key. Otherwise, you can use our Managed Service.')}
            </p>
          </div>
          {!(user?.subscription_tier === 'week' || user?.subscription_tier === 'month') && (
            <a
              href="/checkout"
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors border border-primary-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              {t('settings.manage_plans', 'Manage Plans')}
            </a>
          )}
        </div>

        {error && (
          <div className="sticky top-4 z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg mb-4 animate-shake flex items-start gap-3">
            <svg className="w-5 h-5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 text-sm">{error}</span>
            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
            {success}
          </div>
        )}

        {apiKeys.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">{t('settings.your_api_keys')}</h3>
            <div className="space-y-2">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{key.key_name}</div>
                    <div className="text-sm text-gray-500">
                      {t('jobs.created')} {new Date(key.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleAddKey} className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">{t('settings.add_new_api_key')}</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.key_name')}
            </label>
            <input
              type="text"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={t('settings.key_name_placeholder')}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('settings.google_maps_api_key')}
            </label>
            <input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder={t('settings.api_key_placeholder')}
              required
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newKeyName || !newApiKey}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('settings.adding')}
              </span>
            ) : t('settings.add_api_key')}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-1">{t('settings.how_to_get_api_key')}:</h4>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>{t('settings.step_1')} <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">{t('settings.google_cloud_console')}</a></li>
            <li>{t('settings.step_2')}</li>
            <li>{t('settings.step_3')}</li>
            <li>{t('settings.step_4')}</li>
            <li>{t('settings.step_5')}</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
