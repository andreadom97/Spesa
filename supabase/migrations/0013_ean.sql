-- Scan del codice a barre → formato confezione reale (P8,
-- spec 2026-09-07-scan-confezione-design.md §4).
--
-- ean: l'ultimo codice a barre scansionato per l'ingrediente, 8–14 cifre
-- (EAN-8, EAN-13, UPC, GTIN-14). Serve solo a riconoscere il prodotto:
-- non entra in nessun calcolo della lista né del residuo. Null se mai
-- scansionato; se si comprano due marche con formati diversi resta l'ultima
-- (limite dichiarato in spec §7).
alter table ingredient add column ean text check (ean ~ '^[0-9]{8,14}$');

-- Le letture per codice sono sempre dentro la casa: (user_id, ean). Parziale
-- perché la stragrande maggioranza degli ingredienti (fresco, banco, sfuso)
-- non avrà mai un codice.
create index ingredient_ean on ingredient (user_id, ean) where ean is not null;

-- Nessuna policy nuova: la tabella esiste già e le sue policy sono
-- `user_id = (select casa_id())` dalla 0012, che coprono anche questa colonna.

comment on column ingredient.ean is
  'Ultimo codice a barre scansionato (8-14 cifre), per riconoscere il prodotto. Null se mai scansionato.';
