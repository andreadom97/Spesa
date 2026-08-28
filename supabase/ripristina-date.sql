-- Annulla simula-lunedi.sql: riporta avanti di 7 giorni le date.
--
-- LEGGERE PRIMA DI ESEGUIRE. Non è un semplice inverso: fra la simulazione e
-- adesso l'app ha creato una settimana nuova, quindi le settimane sono due.
-- Spostandole entrambe avanti, la più vecchia finisce sulla data della più
-- recente e viola `unique (user_id, data_inizio)` — per questo le due
-- settimane si spostano una alla volta, dalla più recente.
--
-- Effetto finale: la settimana chiusa torna a 24-30 agosto, e quella creata
-- durante la prova finisce a 31 agosto - 6 settembre, cioè la settimana
-- prossima. Non sparisce: se la vuoi via, la parte in fondo la elimina.

do $$
declare
  v_email text := 'andreadominici2011@gmail.com';
  v_uid uuid;
  r record;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Nessun utente con email %.', v_email;
  end if;

  update meal_slot set data = data + interval '7 days' where user_id = v_uid;
  update purchase set data = data + interval '7 days' where user_id = v_uid;
  update pantry_state
     set ultimo_acquisto = ultimo_acquisto + interval '7 days'
   where user_id = v_uid and ultimo_acquisto is not null;

  -- Dalla più recente alla più vecchia: così ogni riga trova libero il posto
  -- in cui si sposta.
  for r in
    select id, data_inizio from week where user_id = v_uid order by data_inizio desc
  loop
    update week set data_inizio = r.data_inizio + interval '7 days' where id = r.id;
  end loop;

  raise notice 'Date riportate avanti di 7 giorni.';
end $$;

select data_inizio, stato from week order by data_inizio;

-- ---------------------------------------------------------------------------
-- FACOLTATIVO, e irreversibile: elimina la settimana nata durante la prova,
-- con le sue liste e le sue spunte. Gli acquisti registrati e i residui NON
-- vengono toccati (`purchase.week` non esiste; `shopping_list` va in cascata).
-- Togliere il commento solo se si vuole tornare a una settimana sola.
--
-- delete from week
--  where user_id = (select id from auth.users where email = 'andreadominici2011@gmail.com')
--    and data_inizio = '2026-08-31';
