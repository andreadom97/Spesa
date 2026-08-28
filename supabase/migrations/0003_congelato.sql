-- Il residuo di un deperibile decade: 50 g di pollo avanzati non arrivano
-- alla settimana dopo. Ma se lo congeli sì, e per mesi — quindi l'app deve
-- poterlo sapere, altrimenti l'azzeramento automatico direbbe di ricomprare
-- roba che sta nel freezer.
--
-- Sta su pantry_state e non su ingredient perché è una proprietà di quello
-- che hai in casa adesso, non del prodotto: lo stesso petto di pollo può
-- essere in frigo questa settimana e nel congelatore la prossima.

alter table pantry_state
  add column congelato boolean not null default false;

comment on column pantry_state.congelato is
  'Il residuo sta nel congelatore: la soglia di decadimento passa da giorni a mesi. Dichiarato dall''utente in /dispensa.';
