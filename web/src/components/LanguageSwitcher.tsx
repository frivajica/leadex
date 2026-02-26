import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import "../lib/i18n";

interface LanguageSwitcherProps {
	locale?: string;
}

export default function LanguageSwitcher({ locale }: LanguageSwitcherProps) {
	const { i18n } = useTranslation();
	const [activeLanguage, setActiveLanguage] = useState(locale || '');

	const languages = [
		{ code: "en", name: "English", flag: "🇺🇸" },
		{ code: "es", name: "Español", flag: "🇲🇽" },
		{ code: "fr", name: "Français", flag: "🇫🇷" },
	];

	useEffect(() => {
		setActiveLanguage(i18n.language?.split("-")[0] || "en");
	}, [i18n.language]);

	const changeLanguage = async (code: string) => {
		await i18n.changeLanguage(code);

		document.cookie = `i18next=${code};path=/;max-age=31536000;SameSite=Lax`;

		window.dispatchEvent(
			new CustomEvent("localeChange", { detail: { lang: code } }),
		);
	};

	return (
		<div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-200">
			<div className="flex gap-1">
				{languages.map((lang) => (
					<button
						key={lang.code}
						onClick={() => changeLanguage(lang.code)}
						className={`w-8 h-8 flex items-center justify-center rounded-full transition-all hover:bg-white hover:shadow-sm ${activeLanguage === lang.code
							? "bg-white shadow-sm ring-1 ring-primary-500/20"
							: "opacity-50 grayscale hover:opacity-100 hover:grayscale-0"
							}`}
						title={lang.name}
					>
						<span className="text-lg leading-none">{lang.flag}</span>
					</button>
				))}
			</div>
		</div>
	);
}
