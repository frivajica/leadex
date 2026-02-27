import json

with open("public/locales/fr.json", "r") as f:
    fr = json.load(f)

# 1. Error object
fr["error"] = {
    "validation": {
        "invalid_email": "Veuillez fournir une adresse e-mail valide.",
        "password_too_short": "Votre mot de passe doit comporter au moins 8 caractères pour des raisons de sécurité.",
        "password_too_long": "Votre mot de passe est trop long. Veuillez utiliser un mot de passe de moins de 72 caractères.",
        "email_password_required": "Veuillez fournir votre e-mail et votre mot de passe pour vous connecter.",
        "api_key_required": "Veuillez fournir une clé API à enregistrer."
    },
    "auth": {
        "invalid_credentials": "Nous n'avons pas pu trouver de compte avec cet e-mail, ou le mot de passe était incorrect.",
        "email_already_registered": "Cet e-mail est déjà enregistré. Veuillez vous connecter à la place.",
        "user_not_found": "Nous n'avons pas pu trouver de compte avec cet e-mail. Veuillez vérifier les fautes de frappe ou vous inscrire.",
        "uses_magic_link": "Ce compte utilise un lien magique pour se connecter. Veuillez utiliser l'option de lien magique à la place.",
        "invalid_password": "Le mot de passe que vous avez saisi est incorrect. Veuillez réessayer.",
        "invalid_magic_link": "Ce lien de connexion a expiré ou n'est pas valide. Veuillez en demander un nouveau.",
        "not_authenticated": "Veuillez vous connecter pour effectuer cette action."
    },
    "job": {
        "not_found": "Nous n'avons pas pu trouver ce travail. Il a peut-être été supprimé.",
        "not_completed": "Les résultats ne sont pas encore prêts. Veuillez attendre que le travail soit terminé.",
        "no_results": "Aucun prospect n'a été trouvé pour les critères de ce travail.",
        "delete_failed": "Nous avons rencontré un problème lors de la suppression de votre travail. Veuillez réessayer.",
        "not_running": "Ce travail n'est pas en cours d'exécution actuellement.",
        "cancel_failed": "Nous n'avons pas pu annuler le travail pour le moment. Veuillez réessayer.",
        "cannot_restart": "Seuls les travaux qui ont échoué ou ont été annulés peuvent être redémarrés."
    },
    "keys": {
        "not_found": "Nous n'avons pas pu trouver de clé API à supprimer."
    },
    "payment": {
        "insufficient_credits": "Vous avez besoin de plus de crédits pour exécuter ce travail. Veuillez mettre à niveau votre forfait ou ajouter une clé API personnelle.",
        "payment_required": "Veuillez configurer un mode de paiement ou ajouter une clé API personnelle pour créer un travail.",
        "invalid_tier": "Le forfait d'abonnement sélectionné n'est pas valide. Veuillez essayer une autre option.",
        "session_failed": "Un problème est survenu lors de la génération du lien de paiement.",
        "missing_signature": "En-tête de sécurité de signature de paiement manquant.",
        "invalid_payload": "Charge utile de paiement reçue non valide.",
        "invalid_signature": "Vérification de la signature de paiement non valide."
    },
    "generic": "Un problème est survenu. Veuillez réessayer."
}

fr["auth"]["send_magic_link"] = "Envoyer un lien magique"

fr["jobs"]["form"].update({
    "filters": {
        "no_website": "Uniquement les entreprises SANS site web",
        "no_website_desc": "Ignorer les entreprises qui ont déjà un site web dédié lié à leur profil Google.",
        "no_social": "Uniquement les entreprises SANS profil social",
        "no_social_desc": "Ignorer les entreprises qui renvoient vers une page de réseau social (Facebook, Instagram) au lieu d'un site web.",
        "require_phone": "Nécessite un numéro de téléphone",
        "require_phone_desc": "Ignorer les entreprises qui n'ont pas de numéro de téléphone public.",
        "require_address": "Nécessite une adresse physique",
        "require_address_desc": "Ignorer les entreprises qui n'ont pas d'emplacement physique indiqué.",
        "min_rating": "Note minimale",
        "min_rating_desc": "Ignorer les entreprises avec une note inférieure à votre valeur (0,0 à 5,0).",
        "min_reviews": "Avis minimum",
        "min_reviews_desc": "Ignorer les entreprises avec moins d'avis que votre valeur.",
        "min_photos": "Photos minimum",
        "min_photos_desc": "Ignorer les entreprises avec moins de photos que votre valeur."
    },
    "process_choice": "Comment souhaitez-vous traiter l'extraction?",
    "use_personal_key": "Clé personnelle",
    "personal_key_desc": "Ajoutez votre clé dans les Paramètres pour extraire gratuitement.",
    "use_managed_api": "Forfait API inclus",
    "starts_at": "Dès $5",
    "managed_api_desc_full": "Aucune configuration. Payez via Stripe."
})

fr["jobs"].update({
    "total_leads": "Total des leads",
    "avg_score": "Score moyen",
    "search_leads": "Rechercher des leads...",
    "with_website": "Avec site web",
    "without_website": "Sans site web",
    "no_website": "Pas de site web",
    "no_leads_found": "Aucun lead trouvé",
    "table_score": "Score",
    "table_name": "Nom de l'entreprise",
    "table_type": "Type",
    "table_rating": "Note",
    "table_distance": "Distance",
    "table_website": "Site Web",
    "table_actions": "Actions",
    "progress": "Progression",
    "error_load": "Échec du chargement des détails de la tâche",
    "error_not_found": "Tâche non trouvée",
    "error_delete": "Échec de la suppression de la tâche",
    "error_restart": "Échec du redémarrage de la tâche",
    "delete_confirm": "Êtes-vous sûr de vouloir supprimer cette tâche ?",
    "export_failed": "L'exportation a échoué",
    "export_failed_desc": "Échec de l'exportation des résultats. Veuillez réessayer."
})

fr["common"].update({
    "free": "Gratuit",
    "visit": "Visiter",
    "maps": "Mapas",
    "restart": "Redémarrer",
    "all": "Tout",
    "export_csv": "Exporter CSV",
    "export_json": "Exporter JSON"
})

fr["settings"]["desc"] = "Gérez votre compte et vos clés API"

with open("public/locales/fr.json", "w") as f:
    json.dump(fr, f, indent="\t", ensure_ascii=False)
