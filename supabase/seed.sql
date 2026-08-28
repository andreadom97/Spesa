-- Inserisce i pasti di default e le impostazioni per un utente.
--
-- Non serve copiare nessun uuid: l'utente viene trovato per email, quella con
-- cui hai fatto il login col magic link. Sostituisci l'indirizzo qui sotto se
-- diverso, poi esegui l'intero blocco nell'SQL Editor di Supabase.
--
-- È sicuro rieseguirlo: se i pasti ci sono già, non fa niente.

do $$
declare
  v_email text := 'andreadominici2011@gmail.com';
  v_uid uuid;
  v_pasti int;
begin
  select id into v_uid from auth.users where email = v_email;

  if v_uid is null then
    raise exception 'Nessun utente con email %. Fai prima il login col magic link.', v_email;
  end if;

  select count(*) into v_pasti from meal_slot_def where user_id = v_uid;
  if v_pasti > 0 then
    raise notice 'L''utente ha già % pasti: non tocco niente.', v_pasti;
    return;
  end if;

  insert into meal_slot_def (user_id, nome, posizione, assenze_abituali) values
    (v_uid, 'Colazione', 0, '{false,false,false,false,false,false,false}'),
    (v_uid, 'Spuntino',  1, '{false,false,false,false,false,true,true}'),
    (v_uid, 'Pranzo',    2, '{true,true,true,true,true,false,false}'),
    (v_uid, 'Cena',      3, '{false,false,false,false,false,false,false}');

  insert into settings (user_id) values (v_uid) on conflict (user_id) do nothing;

  raise notice 'Seed completato per % (uuid %).', v_email, v_uid;
end $$;
