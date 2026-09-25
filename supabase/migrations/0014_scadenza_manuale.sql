-- La scadenza scritta a mano dalla Dispensa (spec 2026-09-25-dispensa-design.md §E).
--
-- Null = vale la stima: ultimo_acquisto + la soglia dell'area (GIORNI_FRESCO) o del
-- congelatore (GIORNI_CONGELATO), calcolata in src/domain/pantry.ts. Una data qui
-- vince sulla stima in residuoUtilizzabile, quindi anche nella lista della spesa.
-- La cancella il codice: residuo a 0, entrata (0 → più di 0), cambio del
-- congelatore, chiusura della spesa sulle voci comprate.
--
-- Va applicata PRIMA del deploy del codice che la scrive. Non è rieseguibile.
alter table pantry_state add column scadenza_manuale date;

-- Nessuna policy nuova: pantry_state ha già `user_id = (select casa_id())` dalla 0012.

comment on column pantry_state.scadenza_manuale is
  'Scadenza scritta a mano dalla Dispensa; null = vale la stima. Vince sulla stima nel calcolo del residuo utilizzabile.';
