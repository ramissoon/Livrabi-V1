# 📖 Livrabi - Guide de Publication de A à Z

Félicitations ! Ton projet **Livrabi** est prêt. Voici comment le mettre en ligne et le partager avec le monde entier.

## 🚀 Étape 1 : Configuration de Firebase (Déjà fait !)
L'application utilise Firebase pour la base de données en temps réel et l'authentification.
- **Base de données :** Firestore (Région : europe-west3)
- **Authentification :** Google Login (Simulé via pseudo/password pour la légèreté demandée)
- **Stockage :** Firebase Storage pour les illustrations des histoires.

## 🛠️ Étape 2 : Déploiement sur Cloud Run
Pour que ton application soit accessible via une URL publique stable :
1. Clique sur le bouton **"Deploy"** en haut à droite de l'interface AI Studio.
2. Choisis **"Cloud Run"**.
3. Une fois le déploiement terminé, tu recevras une URL (ex: `https://livrabi-xyz.a.run.app`).

## 🔑 Étape 3 : Gestion des Secrets
Si tu as besoin d'ajouter des fonctionnalités d'IA (comme des suggestions de titres), assure-toi que ta clé `GEMINI_API_KEY` est bien configurée dans l'onglet **"Secrets"** de AI Studio.

## 👤 Étape 4 : Devenir Administrateur
Le système est conçu pour que **le tout premier compte créé sur le site devienne automatiquement Administrateur**.
1. Va sur ton site déployé.
2. Clique sur **"Inscription"**.
3. Crée ton compte.
4. Tu verras alors un bouton ⚙️ **Admin** apparaître dans la barre de navigation.

## 📝 Étape 5 : Partager ton Projet
Une fois déployé, tu peux partager l'URL de ton application.
- Les utilisateurs non connectés peuvent **lire** les histoires.
- Les utilisateurs connectés peuvent **créer**, **contribuer** et **liker**.

---

## 💡 Rappel des fonctionnalités clés
- **Système de Paragraphes :** Chaque histoire est une suite de blocs. Le premier arrivé valide la suite "officielle".
- **Embranchements :** À tout moment, un utilisateur peut proposer une suite alternative à un paragraphe précédent, créant ainsi une nouvelle branche narrative.
- **Mode Lecture A4 :** Les histoires s'affichent dans un format élégant, proche du papier.
- **Tableau de Bord :** Statistiques en temps réel et modération complète pour l'administrateur.

---
*Développé avec ❤️ par Livrabi Team.*
