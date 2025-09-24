# CheckBadges

Nouvelle implémentation simplifiée de l'outil de contrôle "CheckBadges". L'application fonctionne entièrement dans le navigateur
et se concentre sur l'essentiel : comparer deux listes de participants (bon de commande et production badges) pour détecter les
manquants, les doublons et les entrées en trop.

## Pourquoi cette réécriture ?

La version précédente reposait sur une architecture complexe (OCR, parsing PDF/Excel, store global, workers…) difficile à mettre
en place dans un environnement verrouillé. Cette nouvelle mouture mise sur :

- une base React + Vite très légère ;
- un seul point d'entrée (`src/App.tsx`) lisible et facilement extensible ;
- l'utilisation de CSV standards ou de PDF textuels (accents et casse ignorés automatiquement) ;
- aucune dépendance lourde ni traitement asynchrone côté serveur.

## Installation et lancement

```bash
npm install
npm run dev
```

Puis ouvrez http://localhost:5173/ dans votre navigateur. L'outil peut également être déployé en statique via `npm run build`.

## Déploiement

- Pousser sur `main` → site en ligne automatiquement.

## Format attendu

- Chaque fichier peut être un CSV (ou TSV) avec prénom et nom dans les deux premières colonnes, ou un PDF textuel contenant un tableau avec ces colonnes.
- Les en-têtes sont recommandés. Les accents, espaces superflus et différences de casse sont automatiquement ignorés.
- Vous pouvez exporter depuis Excel/Sheets ("Enregistrer sous… CSV"), tout CRM générant un tableau texte, ou déposer directement le bon de commande PDF si les noms y figurent dans un tableau.

## Fonctionnement

1. Importez le bon de commande et la liste de badges grâce aux deux champs de sélection.
2. L'application analyse localement les fichiers (bibliothèque `papaparse`).
3. Une normalisation simple (suppression des accents, mise en minuscules) permet de comparer les noms.
4. Les résultats sont affichés dans un tableau unique avec les compteurs suivants :
   - **Manquant** : présent dans la commande mais absent des badges ;
   - **En trop** : présent dans les badges mais pas dans la commande ;
   - **Doublon** : plusieurs occurrences du même nom dans la commande ;
   - **Correspondance** : tout est cohérent.

## Limitations volontaires

- Les PDF doivent contenir du texte (pas de scan/image) et un tableau clair avec les colonnes prénom et nom.
- Pas d'OCR ni de "mode Novotel" automatique : l'objectif est la simplicité et la fiabilité.
- Le traitement se fait entièrement dans le navigateur ; aucun fichier n'est envoyé vers un serveur externe.

Vous pouvez adapter le code à vos besoins : le cœur de l'algorithme se trouve dans `src/App.tsx` et tient en quelques fonctions
pures faciles à tester.
