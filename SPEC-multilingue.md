# Spec — Site multilingue (générateur) · FR / DE / IT / EN

> Objectif : maintenir le contenu **une seule fois**, générer toutes les versions de langue.
> Cible : **FR / DE / IT / EN** (Suisse complète + international). ES/PT différés.
> Approche validée : **A — générateur** (David, 15/10). Traductions DE/IT = brouillons rédigés par Claude, relecture native ensuite ; juridique = pro.

## 1. Principe

- **Source unique par page** = un **template** (`src/pages/<page>.html`) + un **dictionnaire de contenu** (`src/i18n/<page>.json` : une clé → `{fr, de, it, en}`).
- Un **générateur Node** (`generate.mjs`, sans dépendance) lit template + dictionnaire et **écrit les fichiers publics** à la racine :
  `index.html` (fr), `index-en.html`, `index-de.html`, `index-it.html`, etc.
- Le texte est **« cuit » dans le HTML** à la génération → chaque fichier est complet et correct **sans JavaScript** (bon pour le SEO et le no-JS).

## 2. Ce que le générateur fait pour chaque page × langue

1. Remplit chaque élément `data-i18n="clé"` du template avec la traduction de la langue.
2. Écrit `<html lang="xx" data-page-lang="xx" data-lang-urls='{"fr":"index.html","de":"index-de.html",...}'>`.
3. Injecte dans le `<head>` les balises **`hreflang`** (une par langue + `x-default`) → Google sert la bonne version.
4. Laisse le **header / footer** injectés par `site.js` (déjà en place), mais :
   - le **sélecteur de langue passe à 4 langues** (menu), construit depuis `data-lang-urls` ;
   - **navigation** vers le fichier de la langue choisie (déjà fait pour FR/EN).

## 3. Détection auto de la langue (sans GeoIP)

- Au 1ᵉʳ chargement : lire `navigator.languages`.
- Si une **langue dispo ≠ langue de la page** correspond mieux → afficher un **bandeau discret** « Ce site est disponible en <langue> — y passer ? » (bouton Oui / Non).
- **Mémoriser** le choix (localStorage) → ne plus redemander.
- **Jamais de redirection forcée** (mauvais pour le SEO et l'expérience). On respecte l'URL d'arrivée.

## 4. Arborescence (dépôt)

```
src/
  pages/      index.html …        # templates (data-i18n dans le corps)
  i18n/       index.json, common.json   # traductions fr/de/it/en
generate.mjs                      # le générateur
index.html, index-en.html, …      # GÉNÉRÉS (committés, c'est eux qui sont servis)
assets/ …                         # inchangé
```

- `src/`, `i18n/`, `generate.mjs`, `*.md` → **exclus du déploiement FTP** (ajout à la liste d'exclusion du workflow).
- Les fichiers **générés sont committés** (GitHub reste la source lisible + le déploiement reste simple). Le générateur tourne **en local** (plus tard, option : dans l'Action).

## 5. Garde-fous

- **Non-régression** : on régénère d'abord `index.html` + `index-en.html` et on **diff avec l'actuel** → doit être identique (à part additions voulues : hreflang, data-lang-urls).
- **Brouillons DE/IT** : marqués pour **relecture native** avant « définitif ».
- **Légal DE/IT** : traduction **juridique pro**, hors de ce chantier.

## 6. Déroulé

1. **Accueil (index) de bout en bout** : template + i18n (fr/en extraits, de/it rédigés) + générateur + sélecteur 4 langues + bandeau + hreflang. → **Validation David**.
2. Dérouler sur les autres pages marketing (studio, tracker, origin, pure), puis motion/contact.
3. Pages légales (versions EN puis DE/IT, juridique pro).

## 7. Comment tester

- Régénérer, servir en local (`python3 -m http.server`), vérifier :
  - FR/EN **identiques à avant** (diff) ;
  - DE/IT s'affichent, sélecteur 4 langues navigue correctement ;
  - bandeau auto-langue apparaît selon la langue du navigateur, et se mémorise ;
  - `hreflang` présents dans le `<head>` de chaque page.
