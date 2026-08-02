-- =========================================================================
-- 225 CHRÉTIEN : SCRIPT DE MISE À JOUR (Monétisation Éthique & Croissance)
-- À exécuter dans l'éditeur SQL de Supabase
-- =========================================================================

-- 1. Ajout du système de "Crédits" et "Boost / Spotlight" aux profils
ALTER TABLE "public"."profiles"
ADD COLUMN IF NOT EXISTS "credits" INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS "boost_expires_at" TIMESTAMP WITH TIME ZONE;

-- Optionnel : Offrir 5 crédits de bienvenue à tous les utilisateurs existants
UPDATE "public"."profiles" SET "credits" = 5 WHERE "credits" = 0;

-- 2. Ajout du flag "Super-Like" à la table des likes
-- (Si un like d'un Premium est envoyé via le bouton étoile 🌟)
ALTER TABLE "public"."likes"
ADD COLUMN IF NOT EXISTS "is_super_like" BOOLEAN DEFAULT false;

-- Notifications temps réel (Optionnel si vous voulez notifier le frontend quand un super like arrive)
-- Assurez-vous que la table 'likes' broadcast ses inserts dans la publication supabase_realtime.
