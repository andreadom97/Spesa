-- Inserisce i 4 pasti di default e le impostazioni per un utente.
-- Uuid in Supabase > Table Editor > auth.users (colonna id): sostituirlo qui sotto al posto di SOSTITUISCI_CON_UUID_UTENTE, poi eseguire l'intero blocco.

do $$
declare
  v_uid uuid := 'SOSTITUISCI_CON_UUID_UTENTE'::uuid;
begin
  insert into meal_slot_def (user_id, nome, posizione, assenze_abituali) values
    (v_uid, 'Colazione', 0, '{false,false,false,false,false,false,false}'),
    (v_uid, 'Spuntino',  1, '{false,false,false,false,false,true,true}'),
    (v_uid, 'Pranzo',    2, '{true,true,true,true,true,false,false}'),
    (v_uid, 'Cena',      3, '{false,false,false,false,false,false,false}');

  insert into settings (user_id) values (v_uid);
end $$;
