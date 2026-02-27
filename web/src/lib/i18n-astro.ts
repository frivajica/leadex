import en from '../../public/locales/en.json';
import es from '../../public/locales/es.json';
import fr from '../../public/locales/fr.json';

const resources: any = { en, es, fr };

export function getT(lang: string = 'en') {
	// Use first two chars in case of 'en-US' etc.
	const shortLang = lang.split('-')[0];
	const translations = resources[shortLang] || resources.en;

	return (key: string, variablesOrDefault?: Record<string, string | number> | string) => {
		const value = key.split('.').reduce((acc, part) => acc && acc[part], translations);

		if (typeof value !== 'string') {
			if (typeof variablesOrDefault === 'string') return variablesOrDefault;
			return key;
		}

		let result = value as string;

		if (variablesOrDefault && typeof variablesOrDefault === 'object') {
			Object.entries(variablesOrDefault).forEach(([k, v]) => {
				result = result.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
			});
		}
		return result;
	};
}

export function getLangFromCookies(cookies: any) {
	const cookieLang = cookies.get('i18next')?.value;
	if (cookieLang && ['en', 'es', 'fr'].includes(cookieLang)) {
		return cookieLang;
	}
	return 'en';
}
