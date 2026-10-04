# Community gratuita | Morris

Landing statica mobile-first per il percorso TikTok → browser esterno → WhatsApp. HTML, CSS e JavaScript senza dipendenze runtime, font esterni, cookie o analytics. Compatibile con GitHub Pages anche in sottocartella.

## Comportamento

- **TikTok iOS/Android:** schermata dedicata a tutto viewport, senza header, brand, footer o CTA WhatsApp. Grande freccia animata in alto a destra, titolo “APRI NEL BROWSER”, tre passaggi e “Ci vogliono 3 secondi.” Nessun redirect automatico.
- **Safari iOS / Chrome Android e browser mobili riconosciuti:** dopo 650 ms, un solo tentativo verso il link HTTPS `wa.me`, che può aprire l’app installata.
- **Pulsante manuale da browser mobile:** tenta `whatsapp://send` dopo il tocco; dopo 1,8 secondi passa a `wa.me` se la pagina è ancora visibile. Nascondere/lasciare la pagina annulla il timer.
- **Desktop, browser sconosciuto o altra webview:** pulsante HTTPS, senza avvio automatico.
- **Ritorno o refresh:** CTA disponibile senza nuovi redirect. Protezione con sessionStorage, history.state e Navigation Timing; nessun parametro di navigazione aggiunto.
- **JavaScript disabilitato:** link HTML funzionante. La guida adattiva richiede JavaScript.

Il tentativo automatico usa il collegamento universale HTTPS: i custom scheme senza gesto dell’utente possono essere bloccati. Il deep link esplicito è riservato al pulsante manuale. Non è possibile certificare dall’interno della pagina che WhatsApp sia installato o che sia stato aperto.

## File

```text
index.html             HTML, metadata e fallback senza JavaScript
config.js              Numero, messaggio, testi, tempi
script.js              Detection e navigazione protetta
styles.css             Responsive, safe area, reduced motion
favicon.svg            Icona originale
.nojekyll              Pubblicazione statica GitHub Pages
tools/sync.mjs         Sincronizza il fallback HTML dalla configurazione
tools/serve.mjs        Server locale, solo per sviluppo
tests/logic.test.mjs   Test logici con Node
tests/browser.mjs      Test Playwright e screenshot
.github/workflows/test.yml   Test automatici su push e pull request
TEST-REPORT.md         Risultati e limiti della verifica
```

## Modificare numero, messaggio e testi

Modificare **solo `config.js`** per numero, messaggio e testi dinamici. Il numero deve contenere soltanto cifre internazionali, senza `+` o spazi. Il testo viene codificato con `encodeURIComponent` senza aggiunte UTM.

Dopo ogni modifica eseguire `node tools/sync.mjs`: aggiorna il collegamento statico utilizzato senza JavaScript. Titolo SEO e descrizione sociale si modificano in `index.html`.

## Colori

Modificare le variabili `--background`, `--ink`, `--muted`, `--green`, `--blue` all’inizio di `styles.css`. Mantenere un contrasto accessibile con il testo; il pulsante è alto almeno 60 px. Nessun font visibile inferiore a 16 px. Le animazioni rispettano `prefers-reduced-motion`.

## Avvio e test

Richiede Node.js 22+; nessuna installazione serve per visualizzare il sito:

```sh
node tools/serve.mjs
```

Aprire `http://127.0.0.1:4173`. Non aprire direttamente `file://`, perché i moduli JavaScript richiedono un server HTTP.

```sh
node --check script.js
node --check config.js
node tools/sync.mjs
node --test tests/logic.test.mjs
npm install
npx playwright install chromium
npm run test:browser
```

In alternativa usare `pnpm install --frozen-lockfile` con il lockfile incluso. `PLAYWRIGHT_MODULE` e `BROWSER_PATH` consentono di usare Playwright e Chrome già installati. I test browser intercettano `wa.me` e non inviano alcun messaggio. Screenshot e report automatici sono salvati in `test-results/`, esclusa da Git.

## Deploy GitHub Pages

Il repository locale è già inizializzato sul branch `main`. Se necessario autenticarsi con `gh auth login`, poi dalla cartella del progetto:

```sh
gh repo create morris-whatsapp-redirect --public --source=. --remote=origin --push
gh api --method POST repos/OWNER/morris-whatsapp-redirect/pages -f 'source[branch]=main' -f 'source[path]=/'
gh api repos/OWNER/morris-whatsapp-redirect/pages
```

Sostituire `OWNER` con il login restituito da `gh api user --jq .login`. Se il repository esiste già, verificarne prima proprietà e contenuto; non sovrascriverlo. L’alternativa grafica è **Settings → Pages → Deploy from a branch → main → / (root)**. Il sito sarà `https://OWNER.github.io/morris-whatsapp-redirect/` dopo il completamento del build Pages. Verificare risposta HTTP e flusso sul dispositivo prima di mettere il link in bio.

Per aggiornamenti: eseguire i test, `git add .`, `git commit`, `git push`. Il workflow CI verifica il progetto; con Pages da branch la pubblicazione è separata dalla CI e non ne attende l’esito.

## Cambiare dominio

In Settings → Pages configurare **Custom domain**, impostare i record DNS secondo la documentazione GitHub Pages e attivare HTTPS. Aggiungere un file `CNAME` alla root con il solo dominio. Gli asset usano percorsi relativi; non occorre modificare JavaScript. Eventuali `og:url` e canonical vanno aggiunti a `index.html` soltanto dopo aver conosciuto il dominio pubblico definitivo.

## Parametri URL e privacy

La pagina mantiene query string e frammento mentre segna il tentativo nella cronologia. Aprendo la stessa URL nel browser esterno, i parametri rimangono disponibili se TikTok li conserva. Non vengono inviati a WhatsApp, salvati in analytics né aggiunti al messaggio. I contenitori TikTok e Safari/Chrome hanno storage separati: uscire da TikTok permette il primo tentativo nel browser normale.

## Limiti reali

User-agent detection è euristica: un’app può cambiare o nascondere il proprio identificatore. Non esiste un’API web che garantisca l’identificazione di TikTok o l’uscita forzata dalla sua webview. Menu, posizione e diciture dipendono dalla versione. La freccia è una guida grafica, non un controllo del browser. Le safe area sono rispettate dove il browser le espone.

Il sistema operativo può richiedere un tocco/conferma o impedire l’apertura automatica. Il browser non consente di verificare in modo affidabile l’installazione di WhatsApp: il fallback è best effort. Non viene inviato automaticamente alcun messaggio. Il numero deve avere un account WhatsApp attivo, cosa non verificata dai test.

Le simulazioni Chromium non equivalgono a test su Safari/WebKit reale, TikTok reale o telefoni fisici. Prima del lancio verificare iPhone e Android con WhatsApp installato e assente, ritorno alla pagina, menu TikTok e trasferimento della URL completa.

Fonti: [Click to chat WhatsApp](https://faq.whatsapp.com/5913398998672934), [restrizioni Android sui link app](https://developer.chrome.com/docs/android/intents).

## Diagnostica TikTok

Aprire la stessa URL con `?debug=1` (oppure `&debug=1` se esiste già una query). In fondo compaiono Device, TikTok browser, User Agent e Referrer. Nessuna informazione viene trasmessa o salvata; senza parametro il pannello è nascosto. Il debug non cambia la detection né disabilita il flusso normale.

`isTikTokInAppBrowser()` controlla case-insensitive TikTok, musical_ly, musical.ly, Bytedance, BytedanceWebview, trill, musically e altri identificatori. Un referrer con hostname tiktok.com o un suo sottodominio rafforza il riconoscimento di webview anonime iOS/Android. Il referrer **non basta da solo**: Safari/Chrome esterni con referrer TikTok devono poter proseguire verso WhatsApp. Un UA completamente indistinguibile dal browser esterno non è riconoscibile con certezza.

Il contenuto principale resta invisibile durante l’inizializzazione per evitare un flash della landing nella webview TikTok. Con JavaScript disabilitato è disponibile il fallback statico.
