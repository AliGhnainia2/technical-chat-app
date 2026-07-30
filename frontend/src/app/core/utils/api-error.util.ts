import { ApiError, isApiError } from '../models/api-error.model';

export function getUserFacingError(error: unknown): string {
  if (!isApiError(error)) {
    return 'Une erreur inattendue est survenue. Veuillez réessayer.';
  }

  if (error.status === 0) {
    return 'Le serveur est injoignable. Vérifiez votre connexion puis réessayez.';
  }

  if (error.status === 401) {
    return 'Adresse e-mail ou mot de passe incorrect.';
  }

  if (error.status === 409) {
    return conflictMessage(error);
  }

  if (error.status === 400 && error.validationErrors.length > 0) {
    return validationMessage(error.validationErrors[0].field);
  }

  if (error.status === 400) {
    return 'Les informations envoyées ne sont pas valides.';
  }

  if (error.status === 403) {
    return 'Vous n’êtes pas autorisé à effectuer cette action.';
  }

  if (error.status === 404) {
    return 'La ressource demandée n’est plus disponible.';
  }

  if (error.status >= 500) {
    return 'Le service rencontre un problème temporaire. Veuillez réessayer plus tard.';
  }

  return 'La demande n’a pas pu être traitée.';
}

function conflictMessage(error: ApiError): string {
  const message = error.message.toLowerCase();
  if (message.includes('email') || message.includes('e-mail')) {
    return 'Un compte utilise déjà cette adresse e-mail.';
  }
  if (message.includes('username')) {
    return 'Ce nom d’utilisateur est déjà utilisé.';
  }
  return 'Ces informations sont déjà utilisées par un autre compte.';
}

function validationMessage(fieldPath: string): string {
  const field = fieldPath.split('.').at(-1);
  switch (field) {
    case 'username':
      return 'Le nom d’utilisateur doit contenir entre 3 et 30 caractères.';
    case 'email':
      return 'Saisissez une adresse e-mail valide.';
    case 'password':
      return 'Le mot de passe doit contenir au moins 8 caractères.';
    default:
      return 'Certaines informations ne sont pas valides.';
  }
}
