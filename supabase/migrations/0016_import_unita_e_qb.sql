-- Fase 8c, il motore di Importa (spec docs/superpowers/specs/2026-10-03-importa-8c-design.md
-- §A.4, §B, §I; piano docs/superpowers/plans/2026-10-03-importa-8c.md, Task 1).
--
-- 1. dish_ingredient.quantita diventa facoltativa: null = «quanto basta» (q.b.), un valore e
--    non una dimenticanza. Il check diventa `quantita is null or quantita > 0`.
-- 2. cambia_unita_ingrediente(): un ingrediente della casa passa da pezzi a grammi o al
--    contrario, e con lui tutto quello che è scritto nella sua unità, in una transazione.
--
-- Va applicata in produzione PRIMA del merge (Vercel pubblica il merge da solo), con l'ok di
-- Andrea, e verificata con una lettura. È additiva: il codice di prima continua a funzionare
-- con la migrazione applicata (non scrive mai null e non chiama la funzione). Non è rieseguibile.
-- Il nome del check va verificato in produzione prima di applicarla (piano, Task 1 Step 5).

alter table dish_ingredient alter column quantita drop not null;
alter table dish_ingredient drop constraint dish_ingredient_quantita_check;
alter table dish_ingredient add constraint dish_ingredient_quantita_check
  check (quantita is null or quantita > 0);

-- ── cambia_unita_ingrediente() (spec §A.4) ──────────────────────────────────
--
-- p_fattore è g per pz (da pz a g) o il suo inverso (da g a pz): chi chiama lo calcola dal peso
-- medio di un pezzo. security invoker: valgono le policy di casa della 0012 (`user_id =
-- (select casa_id())`); il filtro esplicito su casa_id() dice la stessa cosa in chiaro.
-- Arrotondamenti (spec §A.3): righe dei piatti e confezione in pz al quarto (minimo 0,25), in g
-- all'intero (minimo 1), perché il check è `> 0`. Residuo, storni, acquisti e liste aperte si
-- moltiplicano e basta: sono registri che si sommano fra loro.
-- Le liste NON ancora chiuse si convertono anche loro (ruling del piano 8c, confermato da
-- Andrea): chiudiSpesa riscrive pantry_state.residuo dai numeri congelati della lista, e una
-- lista aperta in pz scriverebbe pezzi in un ingrediente ormai in grammi. «Aperta» come nella
-- 0015: la sua settimana ha stato <> 'chiusa'. Le liste chiuse e risparmio_settimana restano
-- com'erano: sono istantanee e portano la loro unità.
create function public.cambia_unita_ingrediente(p_ingrediente uuid, p_unita text, p_fattore numeric)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  casa uuid := public.casa_id();
  attuale text;
begin
  if casa is null then
    raise exception 'non autenticato';
  end if;
  if p_unita is null or p_unita not in ('g', 'pz') then
    raise exception 'unità non ammessa: %', p_unita;
  end if;
  -- 'Infinity'::numeric (Postgres ≥ 14) supera `<= 0`: il tetto di 100 kg a pezzo lo ferma su
  -- ogni versione senza citare il letterale.
  if p_fattore is null or p_fattore = 'NaN'::numeric or p_fattore <= 0 or p_fattore > 100000 then
    raise exception 'fattore non valido: %', p_fattore;
  end if;

  select unita_base into attuale
    from ingredient
   where id = p_ingrediente and user_id = casa
   for update;
  if not found then
    raise exception 'ingrediente non trovato';
  end if;
  -- Già nell'unità nuova: il secondo giro di un import interrotto non converte due volte.
  if attuale = p_unita then
    return;
  end if;
  if attuale not in ('g', 'pz') then
    raise exception 'da % a % servirebbe una densità', attuale, p_unita;
  end if;

  -- «intero» vuol dire formato 1 a pezzi: in grammi conterebbe una confezione per grammo. Passando
  -- a g diventa «porzionabile» (la confezione resta un pezzo, col suo peso). Da g a pz la classe
  -- resta: porzionabile e stima in pz sono ammessi.
  update ingredient
     set unita_base = p_unita,
         formato_confezione = case
           when p_unita = 'pz' then greatest(0.25, round(formato_confezione * p_fattore * 4) / 4)
           else greatest(1, round(formato_confezione * p_fattore))
         end,
         classe_residuo = case
           when p_unita = 'g' and classe_residuo = 'intero' then 'porzionabile'
           else classe_residuo
         end
   where id = p_ingrediente and user_id = casa;

  -- Tutte le righe dell'ingrediente: piatti del nutrizionista e propri, righe fisse e opzioni.
  update dish_ingredient
     set quantita = case
           when quantita is null then null
           when p_unita = 'pz' then greatest(0.25, round(quantita * (case when unita = 'kg' then 1000 else 1 end) * p_fattore * 4) / 4)
           else greatest(1, round(quantita * p_fattore))
         end,
         unita = p_unita
   where ingredient_id = p_ingrediente and user_id = casa;

  update pantry_state set residuo = residuo * p_fattore
   where ingredient_id = p_ingrediente and user_id = casa;

  update meal_slot_storno set delta = delta * p_fattore
   where ingredient_id = p_ingrediente and user_id = casa;

  -- Lo storico serve ai ritmi della dispensa: resta nella stessa unità dell'ingrediente.
  update purchase set quantita = quantita * p_fattore
   where ingredient_id = p_ingrediente and user_id = casa;

  -- Liste aperte come nella 0015 (cancella_dispensa): la settimana non è chiusa.
  update shopping_list_item
     set fabbisogno = fabbisogno * p_fattore,
         residuo = residuo * p_fattore,
         quantita_totale = quantita_totale * p_fattore,
         unita = p_unita
   where ingredient_id = p_ingrediente
     and user_id = casa
     and shopping_list_id in (
       select sl.id
         from shopping_list sl
         join week w on w.id = sl.week_id
        where sl.user_id = casa
          and w.stato <> 'chiusa'
     );
end $$;

revoke execute on function public.cambia_unita_ingrediente(uuid, text, numeric) from public, anon;
grant execute on function public.cambia_unita_ingrediente(uuid, text, numeric) to authenticated;

comment on function public.cambia_unita_ingrediente(uuid, text, numeric) is
  'Passa un ingrediente della casa fra g e pz moltiplicando per p_fattore tutto ciò che è scritto nella sua unità (piatti, confezione, dispensa, storni, acquisti, liste aperte), in una transazione; un ingrediente «intero» passato a g diventa «porzionabile». Fermo se è già nell''unità nuova.';
