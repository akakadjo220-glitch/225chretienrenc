import { ForumPost, MatchProfile, VocationResource, Conversation, Message, VerificationRequest, User, Report, Parish } from './types';

export const AVAILABLE_INTERESTS = [
  '📖 Lecture Biblique',
  '🎵 Chorale & Chantres',
  '🙌 Louange & Adoration',
  '🕊️ Retraite Spirituelle',
  '✝️ Théologie & Évangélisation',
  '🚶 Pèlerinage (Yamoussoukro / Rome)',
  '⛪ Bénévolat Paroissial',
  '🤝 Action Caritative & Sociale',
  '📜 Étude des Psaumes',
  '👶 École du Dimanche',
  '⚽ Football & Sport',
  '✈️ Voyage & Découverte',
  '🍳 Cuisine Ivoirienne & Pâtisserie',
  '🎬 Cinéma & Médias Chrétiens',
  '📚 Lecture & Développement',
  '🌿 Nature & Randonnée',
  '📸 Photographie & Art Sacré',
  '🎸 Guitare, Piano & Musique',
  '⛺ Scoutisme & Mouvements',
  '💼 Entrepreneuriat & Leadership',
  '🎓 Enseignement & Éducation'
];

// DONNÉES RÉELLES UNIQUEMENT (Données démo supprimées à 100%)
export const MOCK_FORUM_POSTS: ForumPost[] = [];
export const MOCK_MATCHES: MatchProfile[] = [];
export const MOCK_VOCATION_RESOURCES: VocationResource[] = [];
export const MOCK_CONVERSATIONS: Conversation[] = [];
export const MOCK_MESSAGES: Record<string, Message[]> = {};
export const MOCK_VERIFICATION_REQUESTS: VerificationRequest[] = [];
export const MOCK_USERS: User[] = [];
export const MOCK_REPORTS: Report[] = [];
export const MOCK_PARISHES: Parish[] = [];
