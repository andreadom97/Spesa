-- Fa diventare passata la settimana corrente, per vedere oggi quello che
-- succederebbe lunedì: l'app non trova più la settimana di questo lunedì,
-- ne crea una nuova, e la lista si ricostruisce sul residuo accumulato.
--
-- Sposta indietro di 7 giorni tutto ciò che ha una data. NON tocca i residui:
-- sono il punto della prova.
--
-- NON è una migrazione: è uno strumento per provare il modello prima di
-- avere due settimane di storia vera. Eseguibile più volte (ogni volta
-- sposta di altri 7 giorni).
--
-- PER TORNARE INDIETRO, se serve, rieseguirlo con - 7 sostituito da + 7.

do $$
declare
  v_email text := 'andreadominici2011@gmail.com';
  v_uid uuid;
  v_settimane int;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Nessun utente con email %.', v_email;
  end if;

  -- I pasti prima delle settimane: leggono le date proprie, non quelle della
  -- week, ma tenerli allineati evita una settimana i cui slot cadono fuori
  -- dai suoi sette giorni.
  update meal_slot
     set data = data - interval '7 days'
   where user_id = v_uid;

  update week
     set data_inizio = data_inizio - interval '7 days'
   where user_id = v_uid;
  get diagnostics v_settimane = row_count;

  -- Lo storico acquisti e la data dell'ultimo acquisto: servono a far
  -- invecchiare davvero il fresco, che decade sulla distanza da qui.
  update purchase
     set data = data - interval '7 days'
   where user_id = v_uid;

  update pantry_state
     set ultimo_acquisto = ultimo_acquisto - interval '7 days'
   where user_id = v_uid
     and ultimo_acquisto is not null;

  raise notice 'Spostate indietro di 7 giorni % settimane. I residui non sono stati toccati.', v_settimane;
end $$;

-- Come stanno le cose adesso.
select i.nome, p.residuo, i.unita_base, p.ultimo_acquisto, i.deperibile, i.area
  from pantry_state p
  join ingredient i on i.id = p.ingredient_id
 where p.residuo > 0
 order by i.nome;
