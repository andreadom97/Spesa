-- Il procedimento del piatto, dove sta il valore che un elenco di ingredienti
-- non porta: quanto cuoce il farro, che il tofu va strizzato dieci minuti
-- prima o non diventa croccante, che i ceci si schiacciano con la forchetta
-- perché non c'è il frullatore.
--
-- Sta su `dish` e non altrove perché è una proprietà della ricetta, non della
-- settimana in cui la cucini. Facoltativo: un piatto senza descrizione resta
-- valido, e l'aritmetica della lista non la guarda mai.

alter table dish add column descrizione text;

comment on column dish.descrizione is
  'Procedimento della ricetta, testo libero. Non entra in nessun calcolo.';
