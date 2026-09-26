-- Fase 5, le Impostazioni (spec 2026-09-25-impostazioni-design.md §E.1, §E.2).
--
-- 1. settings.giorni_controllo: ogni quanti giorni la Lista chiede di uno
--    staple a stima («Olio: ne hai ancora?»). Tre valori, come il segmento
--    delle Impostazioni: 30 (ogni mese), 60 (ogni 2 mesi), 90 (ogni 3 mesi).
--    Il default 90 è la cadenza fissa di prima (GIORNI_CONTROLLO_STAPLE fino
--    alla fase 4): chi non la tocca non vede nessuna differenza.
-- 2. cancella_dispensa(): più sotto.
--
-- Va applicata PRIMA del deploy del codice che la legge: leggiImpostazioni
-- chiede la colonna per nome, e senza la colonna ogni pagina che legge le
-- impostazioni fallisce. È additiva: il codice di prima continua a
-- funzionare con la migrazione applicata. Non è rieseguibile.

alter table settings
  add column giorni_controllo int not null default 90
    check (giorni_controllo in (30, 60, 90));

-- Nessuna policy nuova: settings ha già `user_id = (select casa_id())` dalla 0012.

comment on column settings.giorni_controllo is
  'Ogni quanti giorni la Lista chiede di uno staple a stima: 30, 60 o 90. Il conto parte dal più recente fra ultimo acquisto e ultimo «sì» (serveControllo).';
