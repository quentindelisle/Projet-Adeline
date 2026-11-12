/* Site public : accueil, parcours par activité, quiz Valable / Faute */
(() => {
  const { esc, initiales, TYPES, urlIntegree, urlOnglet } = JAJJ;
  const app = document.getElementById('app');
  let DATA = null;
  const COUL = ['', 'e1', 'e2', 'e3', 'e4', 'e5'];


  const icone = s => s.icone ? `assets/icones/${encodeURIComponent(s.icone)}.png` : '';
  const imgIcone = (s, cls = '') => s.icone ? `<img class="${cls}" src="${icone(s)}" alt="" loading="lazy">` : `<span class="ini ${cls}" aria-hidden="true">${esc(initiales(s.nom))}</span>`;

  /* ---------- Accueil ---------- */
  function accueil() {
    document.title = DATA.titre;
    document.body.classList.add('accueil');
    const tri = [...DATA.sports].sort((a, b) => (a.actif === false) - (b.actif === false) || a.nom.localeCompare(b.nom, 'fr'));
    app.innerHTML = `
      <div class="banniere"><img src="assets/bandeau.webp" srcset="assets/bandeau-1024.webp 1024w, assets/bandeau.webp 2048w" sizes="(max-width: 1200px) 100vw, 1150px" alt="Jeunes juges et jeunes arbitres UNSS — Académie de Nantes" fetchpriority="high"></div>
      <div class="hero-ligne">
        <div><h1>${esc(DATA.titre)}</h1>
        <p>${esc(DATA.accroche || 'Choisis ton activité, puis suis les cinq étapes du parcours pour devenir jeune juge ou jeune arbitre certifié.')}</p></div>
        <label class="sr" for="cherche">Rechercher une activité</label>
        <input id="cherche" class="recherche" type="search" placeholder="Rechercher une activité…" autocomplete="off">
      </div>
      <div class="grille tuiles" id="grille">
        ${tri.map(s => tuile(s)).join('')}
      </div>`;
    const champ = document.getElementById('cherche');
    champ.addEventListener('input', () => {
      const v = JAJJ.slug(champ.value);
      document.querySelectorAll('#grille .tuile').forEach(c => { c.hidden = v && !c.dataset.cle.includes(v); });
    });
  }
  function tuile(s) {
    const actif = s.actif !== false;
    const inner = `${imgIcone(s)}<b>${esc(s.nom)}</b>${actif ? '' : '<span class="bientot">Bientôt</span>'}`;
    return actif
      ? `<a class="tuile" href="#/s/${esc(s.id)}" data-cle="${esc(JAJJ.slug(s.nom))}">${inner}</a>`
      : `<div class="tuile inactif" data-cle="${esc(JAJJ.slug(s.nom))}" aria-disabled="true" title="Bientôt disponible">${inner}</div>`;
  }

  /* ---------- Page d'une activité : mise en page d'origine (5 images) ---------- */
  function pageSport(id) {
    const s = DATA.sports.find(x => x.id === id);
    if (!s) return introuvable();
    document.title = s.nom + ' — ' + DATA.titre;
    const E = DATA.etapes;
    const img = e => {
      const items = s[e.cle] || [];
      const n = items.length;
      const label = n ? (n === 1 ? '1 ressource' : n + ' ressources') : 'Bientôt';
      const direct = n === 1 && items[0].type !== 'quiz' && urlIntegree(items[0]);
      const href = !n ? '' : direct ? '' : `href="#/s/${esc(s.id)}/${e.cle}"`;
      const tag = n && !direct ? 'a' : 'button';
      return `<${tag} class="etape-img${n ? '' : ' vide'}" ${href} ${direct ? `data-direct="${e.cle}"` : ''} ${!n ? 'aria-disabled="true" disabled style="border:0;padding:0;cursor:default"' : tag === 'button' ? 'style="border:0;padding:0;cursor:pointer"' : ''} aria-label="Étape ${e.num} : ${esc(e.titre)} (${label})">
        <img src="${esc((!n && e.imageVide) || e.image || '')}" alt="Étape ${e.num} — ${esc(e.titre)}"${!n && e.imageVide ? ' style="filter:none;opacity:1"' : ''}>${!n && e.imageVide ? '' : `<span class="nb">${label}</span>`}</${tag}>`;
    };
    app.innerHTML = `
      <p class="fil"><a href="#/">Activités</a> › ${esc(s.nom)}</p>
      <div class="cadre-sport"><div class="hub">
        <a class="retour-rond" href="#/" aria-label="Retour aux activités">←</a>
        <div class="col">${img(E[0])}${img(E[1])}</div>
        <div class="centre">
          <img class="logo-hub" src="assets/logo-unss-nantes.png" alt="UNSS Académie de Nantes">
          ${img(E[2])}
          <div class="nom-sport${s.nom.length > 13 ? ' long' : ''}">${s.icone ? `<img src="${icone(s)}" alt="">` : ''}<h1>${esc(s.nom)}</h1></div>
        </div>
        <div class="col">${img(E[3])}${img(E[4])}</div>
      </div></div>`;
    app.querySelectorAll('[data-direct]').forEach(b => b.addEventListener('click', () => ouvrir(s[b.dataset.direct][0])));
  }

  /* ---------- Page d'une étape ---------- */
  function pageEtape(id, cle) {
    const s = DATA.sports.find(x => x.id === id);
    const e = DATA.etapes.find(x => x.cle === cle);
    if (!s || !e) return introuvable();
    document.title = e.titre + ' — ' + s.nom;
    const items = s[cle] || [];
    let html = '', groupe = null;
    items.forEach((it, i) => {
      if ((it.groupe || null) !== groupe) { groupe = it.groupe || null; if (groupe) html += `<li class="groupe-titre">${esc(groupe)}</li>`; }
      html += `<li>${bouton(it, cle, i)}</li>`;
    });
    const autres = DATA.etapes.filter(x => x.cle !== cle && (s[x.cle] || []).length);
    app.innerHTML = `
      <p class="fil"><a href="#/">Activités</a> › <a href="#/s/${esc(s.id)}">${esc(s.nom)}</a> › ${esc(e.titre)}</p>
      <div class="tete-etape" style="--c:var(--e${e.num})">
        ${e.image ? `<img class="ill" src="${esc(e.image)}" alt="">` : ''}
        <div style="flex:1"><h1>${esc(e.titre)}</h1><p>${esc(s.nom)}${e.desc ? ' — ' + esc(e.desc) : ''}</p></div>
        ${s.icone ? `<img class="icone-sport" src="${icone(s)}" alt="">` : ''}
      </div>
      <section class="etape" style="--c:var(--e${e.num})">
        ${items.length ? `<ul class="items" style="padding-top:14px">${html}</ul>` : '<p class="vide" style="padding-top:16px">Contenu en préparation.</p>'}
      </section>
      <div class="nav-etapes"><a class="btn prim" href="#/s/${esc(s.id)}">← Retour au parcours ${esc(s.nom)}</a>
        ${autres.map(x => `<a class="btn-etape e${x.num}" href="#/s/${esc(s.id)}/${x.cle}">${x.image ? `<img src="${esc(x.image)}" alt="">` : ''}<span>${x.num}. ${esc(x.titre)}</span></a>`).join('')}</div>`;
    app.querySelectorAll('[data-ouvrir]').forEach(b => b.addEventListener('click', () => {
      const [k, i] = b.dataset.ouvrir.split(':');
      ouvrir(s[k][+i]);
    }));
  }
  const SVG = {
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 12h6M10 15.5h6M10 19h4"/>',
    slides: '<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M12 16v4M8 20h8"/><path d="M10 8.5l4 1.8-4 1.8z"/>',
    sheet: '<rect x="4" y="4" width="16" height="16" rx="1.5"/><path d="M4 10h16M4 15h16M10 4v16"/>',
    quiz: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.6 2.6L16.5 9"/>',
    video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
    wayground: '<path d="M7 8h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L14 13h-4l-1.6 1.8A3 3 0 0 1 3 13v-1a4 4 0 0 1 4-4z"/><path d="M7.5 10.5v3M6 12h3M15.5 11.5h.01M17.5 13h.01"/>',
    sharepoint: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    lien: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  };
  const icoSvg = type => `<span class="ico ${esc(type)}" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${SVG[type] || SVG.lien}</svg></span>`;
  function bouton(it, cle, i) {
    const t = TYPES[it.type] || TYPES.lien;
    const ico = icoSvg(it.type);
    const txt = `<span class="t">${esc(it.titre)}</span><span class="sr">(${esc(t.nom)})</span>`;
    if (it.type === 'quiz') return `<a class="item" href="#/q/${esc(it.quiz)}">${ico}${txt}</a>`;
    if (urlIntegree(it)) return `<button class="item" data-ouvrir="${cle}:${i}">${ico}${txt}</button>`;
    return `<a class="item" href="${esc(urlOnglet(it))}" target="_blank" rel="noopener">${ico}${txt}<span class="ext" aria-hidden="true">↗</span><span class="sr">(nouvel onglet)</span></a>`;
  }

  /* ---------- Visionneuse ---------- */
  const dlg = document.getElementById('vision');
  const cadre = document.getElementById('vision-cadre');
  function ouvrir(it) {
    document.getElementById('vision-titre').textContent = it.titre;
    document.getElementById('vision-ext').href = urlOnglet(it);
    cadre.src = urlIntegree(it);
    cadre.title = it.titre;
    dlg.showModal();
  }
  document.getElementById('vision-fermer').addEventListener('click', () => dlg.close());
  dlg.addEventListener('close', () => { cadre.src = 'about:blank'; });
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

  /* ---------- Quiz ---------- */
  async function pageQuiz(id) {
    app.innerHTML = '<p>Chargement du quiz…</p>';
    let q;
    try { q = await JAJJ.chargerQuiz(id); } catch (e) { return introuvable(); }
    const s = DATA.sports.find(x => x.id === q.sport);
    const et = s && DATA.etapes.find(e => (s[e.cle] || []).some(it => it.quiz === q.id));
    const lienEtape = s && et ? `#/s/${s.id}/${et.cle}` : s ? `#/s/${s.id}` : '#/';
    document.title = q.titre + ' — Quiz';
    const etat = { melange: false, extrait: 0 };

    function construire() {
      let themes = q.themes.map(t => ({ nom: t.nom, questions: t.questions.slice() }));
      if (etat.melange || etat.extrait) {
        let toutes = themes.flatMap(t => t.questions);
        for (let i = toutes.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [toutes[i], toutes[j]] = [toutes[j], toutes[i]]; }
        if (etat.extrait) toutes = toutes.slice(0, etat.extrait);
        themes = [{ nom: '', questions: toutes }];
      }
      const total = themes.reduce((a, t) => a + t.questions.length, 0);
      let n = 0;
      app.innerHTML = `
        <p class="fil"><a href="#/">Activités</a> › ${s ? `<a href="#/s/${esc(s.id)}">${esc(s.nom)}</a> › ` : ''}${et ? `<a href="${esc(lienEtape)}">${esc(et.titre)}</a> › ` : ''}Quiz</p>
        <div class="quiz-tete">
          ${q.entete ? `<div class="sur">${esc(q.entete)}</div>` : ''}
          <h1>${esc(q.titre)}</h1>
          <p>${esc(q.sousTitre || '')}${q.sousTitre ? ' · ' : ''}${total} situations à juger : <b>Valable</b> ou <b>Faute</b> ?</p>
          <div class="options-quiz">
            <button class="btn petit" data-opt="ordre">Ordre d'origine</button>
            <button class="btn petit" data-opt="melange">Mélanger</button>
            <button class="btn petit" data-opt="10">10 questions au hasard</button>
            <button class="btn petit" data-opt="20">20 questions au hasard</button>
          </div>
        </div>
        <div class="score" role="status" aria-live="polite">
          <span>Répondu : <b id="sc-rep">0</b>/<b>${total}</b></span>
          <div class="barre" aria-hidden="true"><i id="sc-barre"></i></div>
          <span>Bonnes réponses : <b id="sc-ok">0</b></span>
        </div>
        <div id="questions">
          ${themes.map(t => `${t.nom ? `<h2 class="theme-titre">${esc(t.nom)}</h2>` : ''}${t.questions.map(x => carteQ(x, ++n)).join('')}`).join('')}
        </div>
        <div id="bilan"></div>`;
      let rep = 0, ok = 0;
      app.querySelectorAll('.q').forEach(c => {
        c.querySelectorAll('.choix button').forEach(b => b.addEventListener('click', () => {
          const bonne = c.dataset.r, choisi = b.dataset.r, juste = bonne === choisi;
          c.querySelectorAll('.choix button').forEach(x => { x.disabled = true; });
          b.classList.add('pris');
          c.classList.add(juste ? 'juste' : 'faux');
          const e = c.dataset.e;
          c.insertAdjacentHTML('beforeend', `<div class="retour"><b>${juste ? '✔ Bonne réponse' : '✘ Réponse incorrecte'} — c'est « ${bonne === 'valable' ? 'Valable' : 'Faute'} ».</b>${esc(e)}</div>`);
          rep++; if (juste) ok++;
          document.getElementById('sc-rep').textContent = rep;
          document.getElementById('sc-ok').textContent = ok;
          document.getElementById('sc-barre').style.width = (rep / total * 100) + '%';
          if (rep === total) bilan(ok, total);
        }));
      });
      app.querySelectorAll('[data-opt]').forEach(b => b.addEventListener('click', () => {
        const o = b.dataset.opt;
        etat.melange = o === 'melange'; etat.extrait = /^\d+$/.test(o) ? +o : 0;
        construire(); window.scrollTo({ top: 0, behavior: 'smooth' });
      }));
    }
    function carteQ(x, n) {
      return `<article class="q" data-r="${esc(x.r)}" data-e="${esc(x.e || '')}">
        <span class="num">${String(n).padStart(2, '0')}</span>
        <p>${esc(x.q)}</p>
        <div class="choix"><button data-r="valable">Valable</button><button data-r="faute">Faute</button></div>
      </article>`;
    }
    function bilan(ok, total) {
      const pct = Math.round(ok / total * 100);
      const msg = pct >= 90 ? 'Excellent ! Tu maîtrises le règlement.' : pct >= 70 ? 'Très bien ! Encore quelques détails à revoir.' : pct >= 50 ? 'Pas mal : relis les fiches pour progresser.' : 'Reprends les fiches de l\'étape 2 avant de recommencer.';
      document.getElementById('bilan').innerHTML = `<div class="bilan"><div class="gros">${ok}/${total}</div><p>${pct} % de bonnes réponses — ${msg}</p>
        <div class="options-quiz" style="justify-content:center"><button class="btn prim" id="refaire">Recommencer</button><a class="btn" href="${esc(lienEtape)}">Retour aux quiz</a></div></div>`;
      document.getElementById('refaire').addEventListener('click', () => { construire(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
      document.getElementById('bilan').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    construire();
  }

  function introuvable() {
    app.innerHTML = `<p class="fil"><a href="#/">Activités</a></p><h1>Page introuvable</h1><p>Ce contenu n'existe pas ou a été déplacé.</p><p><a class="btn prim" href="#/">Revenir aux activités</a></p>`;
  }

  /* ---------- Routeur ---------- */
  function route() {
    if (dlg.open) dlg.close();
    const h = location.hash.replace(/^#\/?/, '').split('/');
    document.body.classList.remove('accueil');
    if (h[0] === 's' && h[1] && h[2]) pageEtape(decodeURIComponent(h[1]), h[2]);
    else if (h[0] === 's' && h[1]) pageSport(decodeURIComponent(h[1]));
    else if (h[0] === 'q' && h[1]) pageQuiz(decodeURIComponent(h[1]));
    else accueil();
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  JAJJ.chargerDonnees().then(d => {
    DATA = d;
    document.getElementById('titre-site').textContent = d.titre;
    document.getElementById('sous-titre-site').textContent = d.sousTitre || '';
    document.getElementById('pied').innerHTML = `${esc(d.titre)}${d.sousTitre ? ' — ' + esc(d.sousTitre) : ''}${d.contact ? ' · Contact : ' + esc(d.contact) : ''}${d.maj ? ' · Mise à jour : ' + esc(new Date(d.maj).toLocaleDateString('fr-FR')) : ''}`;
    if (JAJJ.enApercu()) document.getElementById('bandeau').innerHTML = '<div class="apercu">Aperçu des modifications non publiées — <a href="index.html">voir le site publié</a></div>';
    window.addEventListener('hashchange', route);
    route();
  }).catch(e => { app.innerHTML = `<h1>Erreur de chargement</h1><p>${esc(e.message)}</p>`; });
})();
