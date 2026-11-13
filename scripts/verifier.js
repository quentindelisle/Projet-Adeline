// Vérifie que les fichiers de données sont valides avant la mise en ligne.
// Lancement : node scripts/verifier.js
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..', 'site', 'data');
const erreurs = [], avert = [];
const lire = f => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { erreurs.push(`${path.relative(racine, f)} : JSON invalide (${e.message})`); return null; }
};

const data = lire(path.join(racine, 'data.json'));
const quizDispo = new Set(fs.readdirSync(path.join(racine, 'quiz')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)));
for (const id of quizDispo) {
  const q = lire(path.join(racine, 'quiz', id + '.json'));
  if (!q) continue;
  if (!Array.isArray(q.themes)) erreurs.push(`quiz/${id}.json : champ « themes » manquant`);
  else q.themes.forEach((t, i) => (t.questions || []).forEach((x, j) => {
    if (!['valable', 'faute'].includes(x.r)) erreurs.push(`quiz/${id}.json : réponse invalide (thème ${i + 1}, question ${j + 1})`);
  }));
}
if (data) {
  if (!Array.isArray(data.sports) || !Array.isArray(data.etapes)) erreurs.push('data.json : « sports » ou « etapes » manquant');
  for (const e of data.etapes || []) if (e.image && !fs.existsSync(path.join(racine, '..', e.image))) avert.push(`étape ${e.num} : illustration introuvable (${e.image})`);
  const ids = new Set();
  for (const s of data.sports || []) {
    if (ids.has(s.id)) erreurs.push(`data.json : identifiant d'activité en double « ${s.id} »`);
    ids.add(s.id);
    if (s.icone && s.icone.includes('/') && !fs.existsSync(path.join(racine, '..', s.icone))) avert.push(`${s.nom} : icône introuvable (${s.icone})`);
    for (const e of data.etapes || []) for (const it of s[e.cle] || []) {
      if (it.type === 'quiz' && !quizDispo.has(it.quiz)) erreurs.push(`data.json : ${s.nom} › ${e.titre} : quiz « ${it.quiz} » introuvable`);
    }
  }
}

if (avert.length) console.warn('Attention :\n- ' + avert.join('\n- '));
if (erreurs.length) {
  console.error('Problèmes détectés :\n- ' + erreurs.join('\n- '));
  process.exit(1);
}
console.log(`Données valides : ${data.sports.length} activités, ${quizDispo.size} quiz.`);
