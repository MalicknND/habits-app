# Habits — Suivi d’habitudes quotidiennes

Application mobile **React Native** (Expo) pour suivre des routines quotidiennes : cocher les habitudes du jour, visualiser des séries (**streaks**), consulter un **historique** sous forme de calendrier et recevoir des **rappels locaux** à l’heure choisie.

---

## Sommaire

- [Objectifs](#objectifs)
- [Stack technique](#stack-technique)
- [Fonctionnalités](#fonctionnalités)
- [Architecture du dépôt](#architecture-du-dépôt)
- [Modèle de données](#modèle-de-données)
- [Persistance & synchronisation](#persistance--synchronisation)
- [Notifications](#notifications)
- [Thème clair / sombre](#thème-clair--sombre)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Scripts npm](#scripts-npm)
- [Lancer le projet](#lancer-le-projet)
- [Simulateur iOS (dépannage)](#simulateur-ios-dépannage)
- [Qualité & TypeScript](#qualité--typescript)
- [Limites du MVP & pistes](#limites-du-mvp--pistes)

---

## Objectifs

- Proposer une **MVP** simple : pas de backend, données en local.
- Mettre l’accent sur la **régularité** (streak) et la **visibilité** dans le temps (calendrier).
- Offrir une UX **sobre**, accessible en **clair** et en **sombre**, avec choix utilisateur (système / forcé).

---

## Stack technique

| Domaine | Technologie |
|--------|-------------|
| Framework | [Expo](https://expo.dev) SDK **54** |
| UI | [React Native](https://reactnative.dev) **0.81**, [React](https://react.dev) **19** |
| Langage | **TypeScript** (mode strict) |
| Navigation | [Expo Router](https://docs.expo.dev/router/introduction/) **6** (routes fichier) |
| Styles | [NativeWind](https://www.nativewind.dev) **4** + [Tailwind CSS](https://tailwindcss.com) **3** |
| Stockage local | [@react-native-async-storage/async-storage](https://github.com/react-native-async-storage/async-storage) |
| Date / heure | [@react-native-community/datetimepicker](https://github.com/react-native-datetimepicker/datetimepicker) |
| Rappels | [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) |
| Icônes | [@expo/vector-icons](https://docs.expo.dev/guides/icons/) (Ionicons) |

---

## Fonctionnalités

### Aujourd’hui (`Today`)

- Liste des habitudes avec **case à cocher** pour marquer la journée comme complétée.
- Affichage du **streak** (meilleure série courante parmi les habitudes), avec logique basée sur les jours **effectivement complétés** et la **date de création** de chaque habitude.
- **Appui long** sur une ligne : menu **Modifier** (écran dédié) ou **Supprimer** (avec confirmation).

### Nouvelle habitude (`New habit`)

- Saisie du **titre** et choix de l’**heure** (picker natif iOS / Android ; saisie `HH:mm` sur le web).
- Enregistrement dans AsyncStorage + **resynchronisation** des notifications planifiées.

### Historique (`History`)

- **Calendrier mensuel** (semaine commençant le **lundi**).
- Mise en évidence des jours avec **au moins une** habitude complétée.
- Sélection d’un jour : détail du nombre de complétions et liste des titres concernés.

### Réglages (`Réglages`)

- Choix d’**apparence** : **Automatique** (suit le système), **Clair**, **Sombre**.
- Préférence **persistée** ; l’UI utilise une palette **`getAppChrome()`** (styles React Native explicites) pour un rendu fiable sur `SafeAreaView`, listes et scroll.

### Édition (`Edit habit`)

- Route modale **`/habit/[id]`** : même formulaire que la création, mise à jour du titre / de l’heure, sync des notifications.

---

## Architecture du dépôt

```
habits/
├── app/                      # Expo Router (routes)
│   ├── _layout.tsx           # Provider thème racine, Stack, notifications au démarrage
│   ├── global.css            # Directives Tailwind (NativeWind)
│   ├── (tabs)/               # Navigation par onglets
│   │   ├── _layout.tsx       # Tabs + sceneStyle / en-têtes
│   │   ├── index.tsx         # Today
│   │   ├── history.tsx       # Calendrier
│   │   ├── add.tsx           # Création
│   │   └── settings.tsx      # Thème
│   └── habit/
│       └── [id].tsx          # Édition (modale)
├── context/
│   └── AppTheme.tsx          # Préférence thème + schéma résolu (light/dark)
├── lib/
│   ├── date.ts               # Dates locales YYYY-MM-DD, HH:mm
│   ├── habitsStorage.ts      # CRUD habitudes + logs + dédoublonnage
│   ├── habitNotifications.ts # Planification quotidienne par habitude
│   ├── monthGrid.ts          # Grille calendrier (lundi = 1re colonne)
│   ├── screenBackground.ts   # Palette getAppChrome() / appScreenBackground()
│   └── streak.ts             # Calcul des streaks
├── types/
│   └── index.ts              # Habit, HabitLog, alias DateYMD / TimeHHmm
├── components/               # (réservé extensions)
├── hooks/                    # (réservé extensions)
├── assets/
├── app.json                  # Config Expo (plugins : router, splash, datetimepicker, notifications)
├── babel.config.js           # expo + nativewind/babel
├── metro.config.js           # withNativeWind, entrée ./app/global.css
├── tailwind.config.js        # content app + components, darkMode: class
├── nativewind-env.d.ts       # Types NativeWind
└── tsconfig.json             # paths @/*, exclusions app-example / my-expo-app
```

---

## Modèle de données

### `Habit`

| Champ | Description |
|-------|-------------|
| `id` | Identifiant unique (chaîne) |
| `title` | Nom affiché |
| `time` | Heure cible au format **`HH:mm`** (24 h) |
| `createdAt` | Horodatage ISO 8601 (création) |

### `HabitLog`

| Champ | Description |
|-------|-------------|
| `id` | Identifiant du log |
| `habitId` | Référence à l’habitude |
| `date` | Jour civil local **`YYYY-MM-DD`** |
| `completed` | Booléen |

Règle métier : **au plus un log par couple (`habitId`, `date`)** après fusion des doublons éventuels.

---

## Persistance & synchronisation

- Clés AsyncStorage typiques : `@habits/habits`, `@habits/logs`, `@habits/notification_ids`, `@habits/theme_preference`.
- **`ensureTrackingLogsForDate`** : garantit une ligne de suivi par habitude pour un jour donné (création en `completed: false` si absent).
- **`mergeDuplicateDayLogs`** : nettoie les doublons et persiste si nécessaire.

---

## Notifications

- **Rappel quotidien** par habitude, à l’heure **`time`** (trigger type **daily** Expo).
- **Canal Android** dédié (`habits-reminders`).
- **Permission** demandée lorsqu’il existe au moins une habitude ; **aucune planification sur le web**.
- Synchronisation appelée au **démarrage** de l’app et après **ajout / modification / suppression** d’une habitude.

> Pour une build native personnalisée, le plugin **`expo-notifications`** est déclaré dans `app.json` ; un **prebuild** / build EAS peut être nécessaire selon l’environnement.

---

## Thème clair / sombre

- Racine : classe Tailwind **`dark`** + `StatusBar` selon le **schéma résolu** (`AppThemeProvider`).
- **Réglages** : préférence `system` | `light` | `dark` stockée en local.
- Les écrans principaux utilisent **`getAppChrome(resolvedScheme)`** pour les couleurs (fond liste, cartes, champs, calendrier), afin d’éviter les incohérences avec certains composants (`SafeAreaView`, `FlatList`, `ScrollView`).

---

## Prérequis

- **Node.js** (LTS recommandé)
- **npm** (ou yarn / pnpm selon votre habitude)
- Pour **iOS** : **Xcode** + simulateurs (macOS)
- Pour **Android** : **Android Studio** + émulateur ou appareil en USB

---

## Installation

```bash
git clone <url-du-depot> habits
cd habits
npm install
```

---

## Scripts npm

| Script | Action |
|--------|--------|
| `npm start` | Démarre le serveur Metro (Expo) |
| `npm run ios` | Lance sur simulateur iOS |
| `npm run android` | Lance sur émulateur / appareil Android |
| `npm run web` | Lance la version web |
| `npm run lint` | ESLint (config Expo) |
| `npm run reset-project` | Script interactif de réinitialisation du template (à utiliser avec précaution) |

---

## Lancer le projet

```bash
npx expo start
```

Options utiles :

```bash
npx expo start -c          # avec cache Metro vidé (recommandé après changement babel/metro/nativewind)
```

Puis choisir la plateforme dans le terminal ou scanner le QR code avec **Expo Go**.

---

## Simulateur iOS (dépannage)

Si vous voyez des erreurs du type **« Unable to boot device… runtime bundle »** ou **« Invalid device »** :

1. Vérifier les runtimes : `xcrun simctl list runtimes`
2. Nettoyer les simulateurs invalides : `xcrun simctl delete unavailable`
3. Installer la plateforme iOS si besoin : `xcodebuild -downloadPlatform iOS`
4. Vérifier le simulateur par défaut : préférences **`com.apple.iphonesimulator`** (`CurrentDeviceUDID`) ou choisir un appareil dans l’app **Simulator**

---

## Qualité & TypeScript

```bash
npx tsc --noEmit
```

Le `tsconfig.json` **exclut** les dossiers `app-example` et `my-expo-app` pour éviter les erreurs hors périmètre du projet principal.

---

## Limites du MVP & pistes

- Données **uniquement locales** (pas de compte cloud ni synchro multi-appareils).
- Pas d’**analytics** ni de **backup** automatique.
- Pistes possibles : export JSON, compte Supabase/Firebase, rappels intelligents, widgets, localisation complète FR/EN, tests E2E (Detox / Maestro).

---

## Licence

Projet **private** (voir `package.json`).

---

*README généré pour refléter l’état du dépôt **habits** — application de discipline et routines quotidiennes.*
