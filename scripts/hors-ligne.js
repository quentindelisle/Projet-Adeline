// Regroupe toutes les données dans site/data/hors-ligne.js pour pouvoir ouvrir
// le site en double-cliquant sur index.html (sans serveur web).
// Lancement : node scripts/hors-ligne.js
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..', 'site', 'data');
const data = JSON.parse(fs.readFileSync(path.join(racine, 'data.json'), 'utf8'));
const quiz = {};
for (const f of fs.readdirSync(path.join(racine, 'quiz')).filter(f => f.endsWith('.json')).sort()) {
  quiz[f.slice(0, -5)] = JSON.parse(fs.readFileSync(path.join(racine, 'quiz', f), 'utf8'));
}
const contenu = '/* Fichier généré automatiquement par scripts/hors-ligne.js : ne pas modifier à la main. */\n'
  + 'window.JAJJ_HORS_LIGNE = ' + JSON.stringify({ genere: new Date().toISOString(), data, quiz }) + ';\n';
fs.writeFileSync(path.join(racine, 'hors-ligne.js'), contenu);
console.log(`hors-ligne.js : ${data.sports.length} activités, ${Object.keys(quiz).length} quiz.`);
