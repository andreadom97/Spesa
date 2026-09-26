-- Fase 5, le Impostazioni (spec 2026-09-25-impostazioni-design.md §E.1, §E.2).
--
-- 1. settings.giorni_controllo: ogni quanti giorni la Lista chiede di uno
--    staple a stima («Olio: ne hai ancora?»). Tre valori, come il segmento
--    delle Impostazioni: 30 (ogni mese), 60 (ogni 2 mesi), 90 (ogni 3 mesi).
--    Il default 90 è la cadenza fissa di prima (GIORNI_CONTROLLO_STAPLE fino
--    alla fase 4): chi non la tocca non vede nessuna differenza.
-- 2. cancella_dispensa(): la dispensa della casa torna a zero, piatti e
--    piano restano. Più sotto, con le decisioni D1 e D2.
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

-- ── cancella_dispensa() (spec §E.2) ─────────────────────────────────────────
--
-- «Tutto quello che risulta in casa torna a zero, anche le confezioni in
-- congelatore e i pronti. Piatti e piano restano.» Cosa c'è in casa sta in
-- pantry_state (residuo, date, congelato, scadenza a mano) e in
-- porzione_pronta (i lotti dei Pronti). Si CANCELLANO le righe invece di
-- azzerarle: gli ingredienti tornano «mai comprati», come prima del primo
-- acquisto, e la Dispensa mostra il suo stato vuoto. purchase è lo storico e
-- resta; risparmio_settimana resta.
--
-- security invoker: valgono le policy di casa della 0012 (`user_id =
-- (select casa_id())`), quindi un membro cancella la dispensa della casa in
-- cui sta, come oggi può già cambiarla. Il filtro esplicito su casa_id() dice
-- la stessa cosa in chiaro. Tutto in una transazione: o tutto o niente.
--
-- Oltre alle due tabelle, due ritocchi perché il resto regga (piano fase 5,
-- Task 4, decisioni D1 e D2):
-- (D1) i pasti di oggi e dei giorni dopo «dai pronti» tornano pasti normali:
--      la porzione che avevano preso dal lotto non c'è più. I pasti passati
--      no: sono porzioni già mangiate, e il ledger degli storni ne tiene conto.
--      Il filtro è la data e non lo stato della settimana: una settimana
--      `chiusa` (spesa fatta) ha spesso giorni ancora davanti.
-- (D2) le liste delle settimane non ancora chiuse tengono il residuo di prima,
--      congelato in shopping_list_item: chiudiSpesa lo riscriverebbe in
--      pantry_state. Va a zero anche lì.
-- porzioni_preparate non si tocca: è il piano («cucina N in più»), e il piano
-- resta.
create function public.cancella_dispensa()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  casa uuid := public.casa_id();
begin
  if casa is null then
    raise exception 'non autenticato';
  end if;

  -- (D1)
  update meal_slot
     set da_pronti = false
   where user_id = casa
     and da_pronti
     and data >= current_date;

  -- (D2)
  update shopping_list_item
     set residuo = 0
   where user_id = casa
     and residuo <> 0
     and shopping_list_id in (
       select sl.id
         from shopping_list sl
         join week w on w.id = sl.week_id
        where sl.user_id = casa
          and w.stato <> 'chiusa'
     );

  delete from porzione_pronta where user_id = casa;
  delete from pantry_state   where user_id = casa;
end $$;

revoke execute on function public.cancella_dispensa() from public, anon;
grant execute on function public.cancella_dispensa() to authenticated;

comment on function public.cancella_dispensa() is
  'Cancella la dispensa della casa (pantry_state e porzione_pronta); i pasti di oggi e dopo dai pronti tornano normali, e le liste non chiuse perdono il residuo congelato. Piatti, piano e storico restano.';
