-- Ingredienti di base di un supermercato italiano, già classificati secondo i
-- campi che l'app usa per calcolare la lista.
--
-- Non viene da un database pubblico: nessuno espone i tre campi che qui
-- contano davvero. Open Food Facts cataloga prodotti per codice a barre
-- ("Barilla Spaghetti n.5 500g", non "Pasta"); i dataset con la corsia sono
-- statunitensi. Area, classe di residuo e formato confezione vanno decisi
-- comunque, e sono decisi qui.
--
-- COME SI USA
--   Sostituisci l'email se diversa, poi esegui l'intero blocco nell'SQL
--   Editor di Supabase. È sicuro rieseguirlo: salta gli ingredienti che hai
--   già, confrontando il nome, e non tocca mai quelli esistenti — le tue
--   correzioni non vengono sovrascritte.
--
-- COME SONO CLASSIFICATI
--   porzionabile  la confezione copre più pasti e lascia un resto che l'app
--                 riporta alla settimana dopo (pasta, olio, yogurt)
--   intero        si compra a pezzo: 3 banane sono 3 banane, niente resti
--                 frazionari. Formato sempre 1 pz — è quello che list-builder
--                 impone comunque per questa classe
--   stima         non vale la pena contarlo a grammi (sale, spezie, caffè):
--                 nessuna aritmetica, solo un controllo ogni 90 giorni
--
--   deperibile decide dove finisce la voce: true → lista top-up (il fresco),
--   false → lista base (la spesa grossa settimanale). Non ha niente a che
--   vedere con il residuo.
--
-- I formati sono quelli che si trovano davvero a scaffale. Dove il tuo
-- supermercato ne vende un altro, correggilo: da Impostazioni → Ingredienti.

do $$
declare
  v_email text := 'andreadominici2011@gmail.com';
  v_uid uuid;
  v_nuovi int := 0;
  r record;
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Nessun utente con email %. Fai prima il login.', v_email;
  end if;

  for r in
    select * from (values
      -- nome, unità, area, classe, deperibile, formato

      -- ORTOFRUTTA — a pezzo quello che si compra a pezzo, a peso il resto
      ('Banane',              'pz',  'ortofrutta',  'intero',       true,  1),
      ('Mele',                'pz',  'ortofrutta',  'intero',       true,  1),
      ('Arance',              'pz',  'ortofrutta',  'intero',       true,  1),
      ('Limoni',              'pz',  'ortofrutta',  'intero',       true,  1),
      ('Avocado',             'pz',  'ortofrutta',  'intero',       true,  1),
      ('Zucchine',            'pz',  'ortofrutta',  'intero',       true,  1),
      ('Melanzane',           'pz',  'ortofrutta',  'intero',       true,  1),
      ('Peperoni',            'pz',  'ortofrutta',  'intero',       true,  1),
      ('Broccoli',            'pz',  'ortofrutta',  'intero',       true,  1),
      ('Finocchi',            'pz',  'ortofrutta',  'intero',       true,  1),
      ('Sedano',              'pz',  'ortofrutta',  'intero',       true,  1),
      ('Pomodori',            'pz',  'ortofrutta',  'intero',       true,  1),
      ('Pomodorini',          'g',   'ortofrutta',  'porzionabile', true,  500),
      ('Insalata',            'g',   'ortofrutta',  'porzionabile', true,  200),
      ('Spinaci freschi',     'g',   'ortofrutta',  'porzionabile', true,  200),
      ('Rucola',              'g',   'ortofrutta',  'porzionabile', true,  100),
      ('Carote',              'g',   'ortofrutta',  'porzionabile', true,  500),
      ('Patate',              'g',   'ortofrutta',  'porzionabile', false, 1500),
      ('Cipolle',             'g',   'ortofrutta',  'porzionabile', false, 500),
      ('Aglio',               'g',   'ortofrutta',  'stima',        false, 100),

      -- MACELLERIA E PESCHERIA — tutto fresco, tutto in top-up
      ('Petto di pollo',      'g',   'macelleria',  'porzionabile', true,  500),
      ('Fesa di tacchino',    'g',   'macelleria',  'porzionabile', true,  300),
      ('Macinato di manzo',   'g',   'macelleria',  'porzionabile', true,  500),
      ('Salmone fresco',      'g',   'macelleria',  'porzionabile', true,  200),
      ('Filetto di merluzzo', 'g',   'macelleria',  'porzionabile', true,  300),

      -- LATTICINI, UOVA E SALUMI
      ('Uova',                'pz',  'latticini',   'porzionabile', true,  6),
      ('Latte',               'ml',  'latticini',   'porzionabile', true,  1000),
      ('Yogurt greco',        'g',   'latticini',   'porzionabile', true,  500),
      ('Yogurt bianco',       'g',   'latticini',   'porzionabile', true,  500),
      ('Mozzarella',          'g',   'latticini',   'porzionabile', true,  125),
      ('Ricotta',             'g',   'latticini',   'porzionabile', true,  250),
      ('Parmigiano',          'g',   'latticini',   'porzionabile', true,  200),
      ('Philadelphia',        'g',   'latticini',   'porzionabile', true,  150),
      ('Prosciutto crudo',    'g',   'latticini',   'porzionabile', true,  100),
      ('Prosciutto cotto',    'g',   'latticini',   'porzionabile', true,  100),
      ('Bresaola',            'g',   'latticini',   'porzionabile', true,  100),
      ('Burro',               'g',   'latticini',   'porzionabile', false, 250),

      -- PASTA, RISO E CEREALI
      ('Pasta',               'g',   'cereali',     'porzionabile', false, 500),
      ('Pasta integrale',     'g',   'cereali',     'porzionabile', false, 500),
      ('Riso',                'g',   'cereali',     'porzionabile', false, 1000),
      ('Farro',               'g',   'cereali',     'porzionabile', false, 500),
      ('Cous cous',           'g',   'cereali',     'porzionabile', false, 500),
      ('Fiocchi di avena',    'g',   'cereali',     'porzionabile', false, 500),
      ('Pane',                'g',   'cereali',     'porzionabile', true,  500),
      ('Pane in cassetta',    'g',   'cereali',     'porzionabile', true,  400),
      ('Fette biscottate',    'g',   'cereali',     'porzionabile', false, 315),
      ('Farina 00',           'g',   'cereali',     'porzionabile', false, 1000),

      -- DISPENSA E CONSERVE
      ('Olio extravergine',   'ml',  'dispensa',    'porzionabile', false, 1000),
      ('Olio di semi',        'ml',  'dispensa',    'porzionabile', false, 1000),
      ('Aceto balsamico',     'ml',  'dispensa',    'stima',        false, 500),
      ('Sale',                'g',   'dispensa',    'stima',        false, 1000),
      ('Pepe',                'g',   'dispensa',    'stima',        false, 50),
      ('Zucchero',            'g',   'dispensa',    'stima',        false, 1000),
      ('Miele',               'g',   'dispensa',    'stima',        false, 400),
      ('Caffè',               'g',   'dispensa',    'stima',        false, 250),
      ('Passata di pomodoro', 'g',   'dispensa',    'porzionabile', false, 700),
      ('Pelati',              'g',   'dispensa',    'porzionabile', false, 400),
      ('Tonno in scatola',    'g',   'dispensa',    'porzionabile', false, 240),
      ('Ceci lessati',        'g',   'dispensa',    'porzionabile', false, 400),
      ('Fagioli lessati',     'g',   'dispensa',    'porzionabile', false, 400),
      ('Lenticchie secche',   'g',   'dispensa',    'porzionabile', false, 500),
      ('Mais',                'g',   'dispensa',    'porzionabile', false, 300),
      ('Noci',                'g',   'dispensa',    'porzionabile', false, 200),
      ('Mandorle',            'g',   'dispensa',    'porzionabile', false, 200),
      ('Burro di arachidi',   'g',   'dispensa',    'porzionabile', false, 350),
      ('Cioccolato fondente', 'g',   'dispensa',    'porzionabile', false, 100),

      -- SURGELATI
      ('Spinaci surgelati',   'g',   'surgelati',   'porzionabile', false, 450),
      ('Piselli surgelati',   'g',   'surgelati',   'porzionabile', false, 450),
      ('Minestrone surgelato','g',   'surgelati',   'porzionabile', false, 450),
      ('Merluzzo surgelato',  'g',   'surgelati',   'porzionabile', false, 400),
      ('Gamberi surgelati',   'g',   'surgelati',   'porzionabile', false, 300)
    ) as t(nome, unita, area, classe, deperibile, formato)
  loop
    -- Salta quelli che ci sono già: chi ha corretto un formato o un'area non
    -- deve vederseli tornare com'erano rieseguendo il file.
    if exists (
      select 1 from ingredient
      where user_id = v_uid and lower(nome) = lower(r.nome)
    ) then
      continue;
    end if;

    insert into ingredient (user_id, nome, unita_base, area, classe_residuo, deperibile, formato_confezione)
    values (v_uid, r.nome, r.unita, r.area, r.classe, r.deperibile, r.formato);
    v_nuovi := v_nuovi + 1;
  end loop;

  -- Riga di dispensa a zero per tutti quelli che non ce l'hanno. Senza,
  -- `pantry_state` nasce solo alla prima chiusura di spesa e l'ingrediente
  -- non compare nella schermata Dispensa: non lo si potrebbe correggere
  -- proprio nel caso in cui serve, cioè dichiarare che se ne ha già in casa.
  insert into pantry_state (ingredient_id, user_id, residuo)
  select i.id, v_uid, 0
  from ingredient i
  where i.user_id = v_uid
    and not exists (select 1 from pantry_state p where p.ingredient_id = i.id);

  raise notice 'Aggiunti % ingredienti nuovi.', v_nuovi;
end $$;
