import { useState, useEffect, useMemo } from 'react';
import { jobsApi, keysApi, categoriesApi, type Category } from '../lib/api';
import { useTranslation } from 'react-i18next';
import i18n from '../lib/i18n';

export default function JobForm() {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<Category[] | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [radius, setRadius] = useState(5000);
  const [sortBy, setSortBy] = useState<'score' | 'distance'>('score');
  const [useFilters, setUseFilters] = useState(false);
  const [minRating, setMinRating] = useState(4.0);
  const [minReviews, setMinReviews] = useState(10);
  const [minPhotos, setMinPhotos] = useState(3);
  const [categorySearch, setCategorySearch] = useState('');

  // Filtered categories based on search
  const filteredCategories = useMemo(() => {
    if (!allCategories) return [];
    if (!categorySearch.trim()) return allCategories;
    const search = categorySearch.toLowerCase();
    return allCategories.filter(cat =>
      cat.label.toLowerCase().includes(search) ||
      cat.id.toLowerCase().includes(search)
    );
  }, [categorySearch, allCategories]);

  // Fetch categories and API keys on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catsData, keysData] = await Promise.all([
          categoriesApi.list(i18n.language),
          keysApi.list()
        ]);
        setAllCategories(catsData.categories);
        setHasApiKey(keysData.keys.length > 0);
      } catch {
        setHasApiKey(false);
      }
    };
    fetchData();
  }, [i18n.language]);

  const toggleCategory = (catId: string) => {
    setCategories(prev =>
      prev.includes(catId)
        ? prev.filter(c => c !== catId)
        : [...prev, catId]
    );
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(t('jobs.form.error_location'));
      return;
    }

    setLocationLoading(true);
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
        } catch (e) {
          console.error('Geocoding error:', e);
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        }

        setLocationLoading(false);
      },
      (err) => {
        console.error('Location error:', err);
        setLocationLoading(false);
        let msg = t('jobs.form.error_location') + '. ';
        if (err.code === 1) msg += 'Permission denied. Please allow location or enter manually.';
        else if (err.code === 2) msg += 'Location unavailable.';
        else msg += 'Please enter manually.';
        alert(msg);
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

    if (!name.trim()) {
      setError(t('jobs.form.error_job_name'));
      return;
    }

    if (!lat || !lng) {
      setError(t('jobs.form.error_location'));
      return;
    }

    setLoading(true);
    setError('');

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
      // Intercept payment required error to redirect to Stripe Link checkout
      if (errorMessage.toLowerCase().includes('payment required')) {
        window.location.href = '/checkout';
        return;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* API Key Warning */}
      {hasApiKey === false && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">{t('jobs.form.error_api_key_title')}</h3>
              <p className="text-sm text-yellow-700">
                {t('jobs.form.error_api_key_desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
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
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder={t('jobs.form.name_placeholder')}
        />
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('jobs.form.location')} <span className="text-red-500">*</span>
        </label>
        <button
          type="button"
          onClick={getCurrentLocation}
          disabled={locationLoading}
          className="mb-3 flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
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
        <input
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder={t('jobs.form.location_placeholder')}
        />
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

      {/* Categories */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium text-gray-700">{t('jobs.form.business_categories')}</label>
          {allCategories && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => allCategories && setCategories(allCategories.map(c => c.id))}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                {t('jobs.form.select_all')}
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={() => setCategories([])}
                className="text-xs text-gray-500 hover:text-gray-700 font-medium"
              >
                {t('jobs.form.deselect_all')}
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder={t('jobs.form.search_categories_placeholder')}
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          disabled={!allCategories}
          className="w-full px-3 py-2 mb-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100"
        />

        {/* Categories list or skeleton */}
        <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto p-1">
          {allCategories === null ? (
            // Skeleton loader
            Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse bg-gray-200 rounded-full h-8 w-20"></div>
            ))
          ) : (
            filteredCategories.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${categories.includes(cat.id)
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))
          )}
        </div>
        {categories.length > 0 && (
          <p className="mt-2 text-sm text-gray-500">
            {t('jobs.form.categories_selected', { count: categories.length })}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || hasApiKey === false}
        className="w-full flex justify-center items-center gap-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
    </form>
  );
}
