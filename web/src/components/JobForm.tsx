import { useState, useEffect, useRef, useCallback } from 'react';
import { jobsApi, keysApi, categoryGroupsApi, type CategoryGroup } from '../lib/api';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

enum LocationMode {
  Detect = 'detect',
  Manual = 'manual',
}

export default function JobForm() {
  const { t, ready } = useTranslation();
  const errorRef = useRef<HTMLDivElement>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>(LocationMode.Detect);

  // Data
  const [groups, setGroups] = useState<CategoryGroup[] | null>(null);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(5000);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'score' | 'distance'>('score');
  const [useFilters, setUseFilters] = useState(false);
  const [minRating, setMinRating] = useState(4.0);
  const [minReviews, setMinReviews] = useState(10);
  const [minPhotos, setMinPhotos] = useState(3);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [groupsData, keysData] = await Promise.all([
          categoryGroupsApi.list(),
          keysApi.list(),
        ]);
        setGroups(groupsData.groups);
        setHasApiKey(keysData.keys.length > 0);
      } catch {
        setHasApiKey(false);
      }
    };
    fetchData();
  }, []);

  // Scroll to error when it appears
  useEffect(() => {
    if (error && errorRef.current) {
      errorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [error]);

  // Validation
  const isValid = name.trim() !== '' && lat !== '' && lng !== '' && selectedGroups.length > 0;

  const toggleGroup = useCallback((groupId: string) => {
    setSelectedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(t('jobs.form.error_location'));
      return;
    }

    setLocationLoading(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLat(String(latitude));
        setLng(String(longitude));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await response.json();
          setAddress(data.display_name || `${latitude}, ${longitude}`);
        } catch {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        setLocationLoading(false);
      },
      (err) => {
        setLocationLoading(false);
        let msg = t('jobs.form.error_location') + '. ';
        if (err.code === 1) msg += 'Permission denied. Please allow location or enter manually.';
        else if (err.code === 2) msg += 'Location unavailable.';
        else msg += 'Please enter manually.';
        setError(msg);
      },
      { enableHighAccuracy: false, timeout: 15000 }
    );
  };

  const formatRadius = (value: number) => {
    if (value >= 1000) return `${(value / 1000).toFixed(1)} km`;
    return `${value} m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    setError('');

    // Resolve selected groups into category IDs
    const categories = groups
      ? selectedGroups.flatMap(gId => {
        const group = groups.find(g => g.id === gId);
        return group ? group.categories : [];
      })
      : [];

    try {
      const result = await jobsApi.create({
        name: name.trim(),
        center_lat: parseFloat(lat),
        center_lng: parseFloat(lng),
        center_address: address,
        categories: categories.length > 0 ? categories : undefined,
        radius,
        min_rating: useFilters ? minRating : 0,
        min_reviews: useFilters ? minReviews : 0,
        min_photos: useFilters ? minPhotos : 0,
        use_quality_filters: useFilters,
        sort_by: sortBy,
      });

      setSuccess(true);
      setTimeout(() => {
        window.location.href = `/jobs/${result.id}`;
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('auth.error_generic');
      if (errorMessage.toLowerCase().includes('payment required')) {
        window.location.href = '/checkout';
        return;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !mounted) return null;

  if (success) {
    return (
      <div className="text-center py-12 animate-scale-in">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('jobs.form.success_title')}</h3>
        <p className="text-gray-600">{t('jobs.form.success_desc')}</p>
      </div>
    );
  }

  // Helper text for missing requirements
  const getMissingHints = () => {
    const hints: string[] = [];
    if (!name.trim()) hints.push(t('jobs.form.name'));
    if (!lat || !lng) hints.push(t('jobs.form.location'));
    if (selectedGroups.length === 0) hints.push(t('jobs.form.business_categories', 'Categories'));
    return hints;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Sticky Error Banner */}
      {error && (
        <div
          ref={errorRef}
          className="sticky top-4 z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-lg animate-shake flex items-start gap-3"
        >
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

      {/* Job Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('jobs.form.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder={t('jobs.form.name_placeholder')}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('jobs.form.location')} <span className="text-red-500">*</span>
        </label>

        {/* Segmented Control */}
        <div className="flex rounded-lg border border-gray-200 p-1 bg-gray-50 mb-3">
          <button
            type="button"
            onClick={() => setLocationMode(LocationMode.Detect)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${locationMode === LocationMode.Detect
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {t('jobs.form.detect_location', 'Detect Location')}
          </button>
          <button
            type="button"
            onClick={() => setLocationMode(LocationMode.Manual)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${locationMode === LocationMode.Manual
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            {t('jobs.form.enter_manually', 'Enter Manually')}
          </button>
        </div>

        {locationMode === LocationMode.Detect ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={getCurrentLocation}
              disabled={locationLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition-colors"
            >
              {locationLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('jobs.form.getting_location')}
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {t('jobs.form.use_my_location')}
                </>
              )}
            </button>
            {address && (
              <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <svg className="w-4 h-4 text-green-600 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-700">{address}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('jobs.form.latitude', 'Latitude')}
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => { setLat(e.target.value); setError(''); }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. 19.4326"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                {t('jobs.form.longitude', 'Longitude')}
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => { setLng(e.target.value); setError(''); }}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g. -99.1332"
              />
            </div>
          </div>
        )}
      </div>

      {/* Radius */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">{t('jobs.form.search_radius')}</label>
          <span className="text-sm font-medium text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
            {formatRadius(radius)}
          </span>
        </div>
        <input
          type="range"
          min="100"
          max="50000"
          step="100"
          value={radius}
          onChange={(e) => setRadius(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg accent-primary-600"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>100m</span>
          <span>50km</span>
        </div>
      </div>

      {/* Category Groups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">
            {t('jobs.form.business_categories', 'Business Categories')} <span className="text-red-500">*</span>
          </label>
          {groups && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedGroups(groups.map(g => g.id))}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('jobs.form.select_all')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setSelectedGroups([])}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                {t('jobs.form.deselect_all')}
              </button>
            </div>
          )}
        </div>

        {groups === null ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-xl h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {groups.map(group => {
              const isSelected = selectedGroups.includes(group.id);
              return (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all text-center ${isSelected
                      ? 'border-primary-500 bg-primary-50 shadow-sm'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  <span className="text-2xl">{group.icon}</span>
                  <span className={`text-xs font-medium leading-tight ${isSelected ? 'text-primary-700' : 'text-gray-700'}`}>
                    {group.label}
                  </span>
                  <span className={`text-[10px] ${isSelected ? 'text-primary-500' : 'text-gray-400'}`}>
                    {group.count} {group.count === 1 ? 'type' : 'types'}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        {selectedGroups.length > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            {t('jobs.form.categories_selected', { count: selectedGroups.length })} group{selectedGroups.length !== 1 ? 's' : ''}
          </p>
        )}
        {selectedGroups.length === 0 && groups !== null && (
          <p className="mt-2 text-xs text-amber-600">
            {t('jobs.form.select_at_least_one', 'Select at least one category group to continue')}
          </p>
        )}
      </div>

      {/* Quality Filters */}
      <div className="border-t border-gray-200 pt-6">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${useFilters ? 'bg-primary-100' : 'bg-gray-100'}`}>
              <svg className={`w-5 h-5 ${useFilters ? 'text-primary-600' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div className="text-left">
              <span className="block text-sm font-medium text-gray-900">{t('jobs.form.quality_filters')}</span>
              <span className="block text-xs text-gray-500">{t('jobs.form.quality_filters_desc')}</span>
            </div>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="mt-4">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={useFilters}
              onChange={(e) => setUseFilters(e.target.checked)}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
            />
            <span className="ml-2 text-sm text-gray-600">{t('jobs.form.apply_quality_filters')}</span>
          </label>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('jobs.form.min_rating')}</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('jobs.form.min_reviews')}</label>
              <input
                type="number"
                min="0"
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">{t('jobs.form.min_photos')}</label>
              <input
                type="number"
                min="0"
                value={minPhotos}
                onChange={(e) => setMinPhotos(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Sort */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('jobs.form.sort_by')}</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSortBy('score')}
            className={`flex items-center justify-center gap-2 p-3 border rounded-lg transition-colors ${sortBy === 'score'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span className="text-sm font-medium">{t('jobs.form.sort_score')}</span>
          </button>
          <button
            type="button"
            onClick={() => setSortBy('distance')}
            className={`flex items-center justify-center gap-2 p-3 border rounded-lg transition-colors ${sortBy === 'distance'
              ? 'border-primary-500 bg-primary-50 text-primary-700'
              : 'border-gray-200 hover:border-gray-300'
              }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium">{t('jobs.form.sort_distance')}</span>
          </button>
        </div>
      </div>

      {/* Payment / API Key Choice */}
      {hasApiKey === false && (
        <div className="border-t border-gray-200 pt-6">
          <label className="block text-sm font-medium text-gray-900 mb-4">
            {t('jobs.form.process_choice', 'How would you like to process this job?')}
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a
              href="/settings"
              className="relative flex flex-col p-4 border border-gray-200 rounded-xl hover:border-primary-500 hover:bg-primary-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <span className="font-medium text-gray-900 group-hover:text-primary-700">Use Personal Key</span>
                </div>
                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Free</span>
              </div>
              <p className="text-xs text-gray-500">
                Add your Google Places API Key in Settings to extract unlimited leads for free.
              </p>
            </a>

            <label className="relative flex flex-col p-4 border-2 border-primary-500 bg-primary-50 rounded-xl cursor-pointer">
              <input type="radio" name="payment_choice" value="managed" checked readOnly className="sr-only" />
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary-200 flex items-center justify-center text-primary-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <span className="font-medium text-primary-900">Use Managed API</span>
                </div>
                <span className="w-4 h-4 rounded-full border-4 border-primary-600 bg-white"></span>
              </div>
              <p className="text-xs text-primary-700">
                Zero setup. Pay via Stripe or use an existing subscription plan.
              </p>
            </label>
          </div>
        </div>
      )}

      {/* Submit */}
      <div>
        <button
          type="submit"
          disabled={!isValid || loading}
          className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {t('jobs.form.creating_job')}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {t('jobs.form.create_job')}
            </span>
          )}
        </button>
        {!isValid && !loading && (
          <p className="mt-2 text-xs text-gray-400 text-center">
            {t('jobs.form.missing_fields', 'Missing')}: {getMissingHints().join(', ')}
          </p>
        )}
      </div>
    </form>
  );
}
