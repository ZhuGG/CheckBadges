# CheckBadges OCR

Application web 100 % front-end pour contrôler la cohérence entre un bon de commande et des amalgames badges directement dans le navigateur. L'import, l'analyse (OCR compris) et les exports se font localement : aucun serveur requis.

## Installation

```bash
npm install
npm run dev
```

Pour construire la version déployable :

```bash
npm run build
```

Le dossier `dist/` peut ensuite être déposé tel quel sur Netlify, Vercel ou GitHub Pages.

## Utilisation

1. Ouvrez l'application (`npm run dev` puis http://localhost:5173/).
2. Glissez-déposez un bon de commande (CSV/XLS/XLSX ou PDF) ainsi qu'un ou plusieurs amalgames (PDF).
3. Ajustez les seuils de similarité et la tolérance aux accents si besoin.
4. Consultez le tableau filtrable (correspondances, manquants, en trop, coquilles, inversions).
5. Exportez les résultats au format CSV ou un rapport PDF structuré.

Des fichiers d'exemple sont fournis dans `public/samples/` (dont le scénario Novotel) et un rapport type dans `docs/sample-report.pdf`.

## Fonctionnalités clés

- OCR local via `tesseract.js` (Web Worker) avec fallback automatique pour les PDF scannés.
- Parsing PDF (`pdfjs-dist`), Excel/CSV (`xlsx`), normalisation et fuzzy matching (Jaro/Damerau).
- Détection du format « Novotel » (prénoms / noms / passions) et fusion automatique des fragments.
- Ignoration des lignes de cartouche (ex. "Leeroy"/"Jordan" en header/footer) et détection d'inversions prénom/nom.
- Export CSV & PDF, logs de parsing, indicateur de progression, support 2k lignes.

## Limites connues

- L'OCR peut être lent pour de gros PDF scannés (prévoir plusieurs secondes pour >100 pages).
- Les heuristiques Novotel reposent sur des distributions de tokens et peuvent nécessiter un ajustement sur des formats très atypiques.
- L'application n'effectue pas de sauvegarde côté serveur : pensez à télécharger vos exports.

## Confidentialité

Tous les traitements (lecture de fichiers, OCR, comparaison, exports) sont exécutés côté navigateur. Aucun fichier n'est envoyé sur un serveur externe.
