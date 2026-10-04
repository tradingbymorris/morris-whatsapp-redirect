# Verifica — 4 ottobre 2026

## Esito locale

- Validazione sintassi `script.js` e `config.js`: PASS.
- Node test runner: **11 test passati**, zero fallimenti.
- Playwright 1.62.1 con Google Chrome installato su Windows: **50 controlli passati** (48 combinazioni + JavaScript disabilitato + debug/animazione).
- 6 user agent: TikTok iOS, TikTok Android, Safari iOS, Chrome Android, Chrome desktop, sconosciuto.
- Viewport per ciascuno: 320×568, 360×800, 375×667, 390×844, 393×852, 412×915, 430×932, 1440×900.
- Nessun errore console o eccezione JavaScript nei controlli browser.
- Nessun overflow orizzontale; font visibili almeno 16 px; CTA almeno 44 px; animazione disabilitata con reduced motion.
- TikTok: guida e grande freccia visibili, nessuna navigazione automatica. Verificata assenza nel testo visibile di Morris, Community gratuita, Continua su WhatsApp, APRI WHATSAPP e del vecchio slogan. Freccia almeno 180×170 px, ancorata in alto a destra.
- Browser mobili: navigazione HTTPS intercettata alla destinazione esatta; ritorno e refresh non ripetono il redirect.
- Desktop/sconosciuto: pulsante visibile, nessun redirect automatico.
- JavaScript disabilitato: fallback HTML visibile e URL corretto.
- Test logici: parametri UTM preservati nella URL di origine, messaggio esatto, encoding, userAgentData, iPad, webview alternative, storage bloccato, custom scheme e fallback, annullamento al cambio app, back-forward cache.
- Screenshot del nuovo flusso ispezionati: iOS TikTok 320×568 e Android TikTok 390×844. Freccia grande in alto a destra, nessun elemento commerciale, titolo APRI NEL BROWSER, passaggi leggibili.
- Detection combinato: tutti i token richiesti, referrer TikTok con webview anonima, referrer vuoto o ostile. Safari/Chrome normali con referrer TikTok sono correttamente esclusi.
- Debug nascosto normalmente e visibile con debug=1; verificati valori diagnostici. Animazione attiva normalmente e assente con reduced motion.

La versione Playwright usata localmente è quella preinstallata nell’ambiente; il progetto include una versione di sviluppo fissata e un lockfile per installazioni riproducibili. Nessuna dipendenza viene caricata dal sito pubblico.

## Limiti della verifica

I test usano Chromium con user agent simulati, non Safari reale né l’app TikTok. `wa.me` è intercettato nei test: sono verificati destinazione ed encoding, non l’attivazione dell’account o l’apertura di un’app WhatsApp fisica. Il fallback temporizzato è verificato con una simulazione della navigazione. Safe area e menu dell’app devono essere confermati sui telefoni reali. Nessun messaggio è stato inviato.

## Pubblicazione

GitHub CLI ufficiale scaricata nel workspace. `gh auth status` conferma che nessun host è autenticato. Repository remoto, push, attivazione GitHub Pages e verifica HTTP pubblica **non eseguiti**. Richiesto accesso interattivo dell’utente; nessun URL pubblico dichiarato come attivo.

Il commit iniziale usa l’identità locale tecnica `Codex <codex@localhost>` perché non esisteva un’identità Git configurata. Non è stata modificata la configurazione globale dell’utente.
