
export enum UserRole {
  GUEST = 'GUEST',
  USER = 'USER',
  ADMIN = 'ADMIN'
}

export enum AppView {
  LANDING = 'LANDING',
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_ADMIN_LOGIN = 'AUTH_ADMIN_LOGIN',
  AUTH_REGISTER = 'AUTH_REGISTER',
  AUTH_VERIFY_EMAIL = 'AUTH_VERIFY_EMAIL',
  ONBOARDING_INTERESTS = 'ONBOARDING_INTERESTS',
  ONBOARDING_PREFERENCES = 'ONBOARDING_PREFERENCES',
  USER_DASHBOARD = 'USER_DASHBOARD',
  ADMIN_DASHBOARD = 'ADMIN_DASHBOARD',
  SPEED_DATE = 'SPEED_DATE',
  LIKES_YOU = 'LIKES_YOU',
  FORUM = 'FORUM',
  MESSAGES = 'MESSAGES',
  PROFILE = 'PROFILE'
}

export enum DashboardTab {
  FEED = 'FEED',
  MATCHES = 'MATCHES',
  SPEED_DATE = 'SPEED_DATE',
  LIKES_YOU = 'LIKES_YOU',
  FORUM = 'FORUM',
  VOCATION = 'VOCATION',
  MESSAGES = 'MESSAGES',
  PROFILE = 'PROFILE',
  EVENTS = 'EVENTS',
  STATS = 'STATS',
  USERS = 'USERS',
  VERIFICATION = 'VERIFICATION',
  MODERATION = 'MODERATION',
  PARISHES = 'PARISHES',
  PRIESTS = 'PRIESTS',
  SUBSCRIPTIONS = 'SUBSCRIPTIONS',
  PAYMENTS = 'PAYMENTS',
  GLOBAL_CONFIG = 'GLOBAL_CONFIG',
  INTERESTS = 'INTERESTS'
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  BANNED = 'BANNED',
  SUSPENDED = 'SUSPENDED'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  gender?: 'M' | 'F';
  lookingFor?: 'M' | 'F';
  parish?: string;
  denomination?: string;
  phone?: string;
  baptismYear?: number;
  isPremium?: boolean;
  liveness_video_url?: string;
  liveness_verified?: boolean;
  premiumExpiration?: string;
  avatarUrl?: string;
  photos?: string[];
  verificationStatus: VerificationStatus;
  interests?: string[];
  birthDate?: string;
  birth_date?: string;
  latitude?: number;
  longitude?: number;
  location?: string;
  status?: UserStatus;
  joinedDate?: string;
  lastActive?: string;
  credits?: number;
  boost_expires_at?: string;
  isInvisible?: boolean;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  baptismYear: number;
  parish: string;
  denomination?: string;
  submittedDate: string;
  verificationCode?: string;
  videoProofUrl?: string;
  documents: {
    type: 'ID' | 'BAPTISM';
    name: string;
    url: string;
  }[];
  status: VerificationStatus;
}

export interface ForumComment {
  id: string;
  author: string;
  authorId?: string;
  authorAvatar: string;
  content: string;
  timeAgo: string;
  likes: number;
  isLiked?: boolean;
  parent?: string; // ID du commentaire parent si c'est une réponse
  replies?: ForumComment[]; // Liste des réponses (pour l'affichage)
}

export interface ForumPost {
  id: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  category: string;
  title: string;
  content: string;
  imageUrl?: string;
  tags?: string[];
  likes: number;
  isLiked?: boolean;
  comments: number;
  timeAgo: string;
  commentsList?: ForumComment[];
}

export interface MatchProfile {
  id: string;
  name: string;
  age: number;
  location: string;
  parish: string;
  denomination?: string;
  bio: string;
  imageUrl: string;
  photos?: string[];
  percentage: number;
  interests?: string[];
  testimonial_audio_url?: string;
  badges?: string[];
  isInvisible?: boolean;
  isSuperLike?: boolean;
  isBoosted?: boolean;
}

export interface VocationResource {
  id: string;
  title: string;
  type: 'VIDEO' | 'ARTICLE' | 'PODCAST';
  category: 'MARIAGE' | 'PRETRISE' | 'RELIGIEUSE' | 'MINISTERE' | 'MISSION';
  duration?: string;
}

export interface AppEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  description: string;
  link?: string;
}

export interface PriestContact {
  id: string;
  name: string;
  parish: string;
  phone: string;
  availability?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text?: string;
  type: 'TEXT' | 'IMAGE' | 'AUDIO' | 'PRAYER' | 'VIDEO' | 'MENTORSHIP';
  attachmentUrl?: string;
  timestamp: string;
  isRead: boolean;
  isNsfw?: boolean;
  isFlagged?: boolean;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  contactAvatar: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  isOnline?: boolean;
}

export interface Report {
  id: string;
  reporterName: string;
  reportedUserName: string;
  reportedUserId: string;
  reason: string;
  contentSnippet?: string;
  date: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  type: 'PROFILE' | 'MESSAGE' | 'FORUM';
}

export interface Parish {
  id: string;
  name: string;
  city: string;
  memberCount: number;
}

export interface PaymentSettings {
  id?: string;
  paystack_mode?: 'SANDBOX' | 'PRODUCTION';
  paystack_public_key: string;
  paystack_secret_key: string;
  paystack_live_public_key?: string;
  paystack_live_secret_key?: string;
  currency: string;
  amount: number;
  openrouter_api_key?: string;
  openrouter_model?: string;
  deepface_api_url?: string;
  deepface_model?: string;
  deepface_detector?: string;
}

export interface PaymentTransaction {
  id: string;
  userName: string;
  amount: number;
  reference: string;
  status: string;
  gateway: string;
  date: string;
}
