-- Sostituire :uid con l'uuid dell'utente, leggibile da auth.users.
insert into meal_slot_def (user_id, nome, posizione, assenze_abituali) values
  (:'uid', 'Colazione', 0, '{false,false,false,false,false,false,false}'),
  (:'uid', 'Spuntino',  1, '{false,false,false,false,false,true,true}'),
  (:'uid', 'Pranzo',    2, '{true,true,true,true,true,false,false}'),
  (:'uid', 'Cena',      3, '{false,false,false,false,false,false,false}');

insert into settings (user_id) values (:'uid');
