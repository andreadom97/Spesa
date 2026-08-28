-- Rotazione su più settimane.
--
-- Un piano alimentare vero non è una settimana che si ripete: sono N settimane
-- che girano (il piano di Andrea ne ha due, "stessi ingredienti, abbinamenti
-- diversi"). Prima di questa migrazione l'app conosceva un repertorio piatto,
-- e il planner ruotava sull'indice del giorno dentro la settimana — che
-- ricomincia da zero ogni lunedì, quindi con 14 pranzi ne usava sempre 7.
--
-- Due livelli, entrambi facoltativi:
--   settimana_ciclo  a quale settimana del ciclo appartiene il piatto (1..4).
--                    NULL = va bene in tutte, com'era prima.
--   giorno_ciclo     a quale giorno di quella settimana (0 = lunedì).
--                    NULL = lo decide il planner, com'era prima.
--
-- Chi non usa il ciclo (settimane_ciclo = 1, il default) non vede differenza:
-- tutte le colonne restano NULL e il comportamento è quello di prima.

alter table settings
  add column settimane_ciclo int not null default 1
    check (settimane_ciclo between 1 and 4),
  -- Il lunedì della settimana 1 del ciclo: serve a sapere, data una settimana
  -- qualunque, a che punto del giro siamo. NULL finché il ciclo non si usa.
  add column ciclo_origine date;

alter table dish
  add column settimana_ciclo int check (settimana_ciclo between 1 and 4),
  add column giorno_ciclo int check (giorno_ciclo between 0 and 6);

comment on column settings.settimane_ciclo is
  'Quante settimane compongono il piano prima di ricominciare. 1 = nessuna rotazione.';
comment on column settings.ciclo_origine is
  'Lunedì della settimana 1 del ciclo. Da qui si deriva a che settimana del giro appartiene una data.';
comment on column dish.settimana_ciclo is
  'Settimana del ciclo a cui appartiene il piatto (1..4). NULL = tutte.';
comment on column dish.giorno_ciclo is
  'Giorno della settimana del ciclo, 0 = lunedì. NULL = lo sceglie il planner.';
