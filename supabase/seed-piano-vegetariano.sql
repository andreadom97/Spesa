-- Il piano alimentare vegetariano di Andrea, 31 agosto — 13 settembre 2026,
-- tradotto in piatti per l'app. Trentatré piatti: una colazione fissa, due
-- spuntini, due dopocena, quattordici pranzi e quattordici cene su due
-- settimane che ruotano.
--
-- RICHIEDE LE MIGRAZIONI 0004 (settimana_ciclo, giorno_ciclo) E 0005
-- (descrizione), e richiede che i pasti si chiamino Colazione, Spuntino,
-- Pranzo, Cena, Dopocena. Fallisce con un errore esplicito se manca qualcosa.
--
-- COSA HO DECISO IO, dove il piano non poteva dirlo (rivisto e approvato da
-- Andrea il 28/08/2026):
--   - le quantità sono il centro degli intervalli del piano ("pasta 80-100 g"
--     diventa 90 g). Su una settimana l'errore si annulla: quattro giorni
--     sopra e tre sotto.
--   - le spezie, il sale, il brodo, l'amido e la salsa di soia NON sono nei
--     piatti. Sono classificati "a stima", non fanno aritmetica: metterli
--     allungherebbe ogni ricetta di cinque righe senza cambiare la lista.
--   - i mezzi limoni si scrivono 0.5: l'app arrotonda all'insù sommando la
--     settimana, quindi sei mezzi limoni diventano tre limoni in lista.
--   - pesce surgelato e non fresco, perché nel piano sta nella lista del
--     freezer. Conseguenza voluta: non è deperibile, quindi va nella spesa
--     base e il suo residuo non decade.
--   - due spuntini distinti (allenamento / riposo) e due dopocena, da
--     scegliere quando si assegna la settimana.
--
-- È sicuro rieseguirlo: cancella e ricrea solo i piatti di questo piano,
-- riconosciuti per nome. Non tocca gli altri, né gli ingredienti, né le
-- settimane già pianificate.

do $$
declare
  v_email text := 'andreadominici2011@gmail.com';
  v_uid uuid;
  v_dish uuid;
  v_mancanti text;
  r record;

  -- nome, pasto, settimana del ciclo (null = tutte), giorno (0 = lunedi), ricetta
  piatti constant text[][] := array[
    ['Porridge con banana', 'Colazione', null, null,
     'Fiocchi d''avena e latte al microonde 2 minuti a piena potenza, mescola, altri 40 secondi. Fuori dal microonde aggiungi lo yogurt greco, la banana a rondelle e la frutta secca. Cannella se ti va. Tre minuti in tutto, e nessuna decisione da prendere alle sette del mattino.'],

    ['Pane con miele e uva', 'Spuntino', null, null,
     'Lo spuntino dei giorni di allenamento, verso le 17:30. Pane con miele e un grappolo d''uva: carboidrati che arrivano in tempo senza pesare sullo stomaco. Se hai mangiato tardi a pranzo, sostituisci con 150 g di skyr e un cucchiaino di miele.'],
    ['Frutta e frutta secca', 'Spuntino', null, null,
     'Lo spuntino dei giorni di riposo: frutta di stagione con venti grammi di mandorle o tre noci.'],

    ['Yogurt greco con frutta', 'Dopocena', null, null,
     'Il dopocena dei giorni di allenamento: chiude la giornata e copre il fabbisogno proteico.'],
    ['Due quadretti di fondente', 'Dopocena', null, null,
     'Il dopocena dei giorni di riposo. Due quadretti, non la tavoletta.'],

    -- SETTIMANA 1
    ['Farro con ceci, zucchine e pomodorini', 'Pranzo', '1', '0',
     'Farro perlato in acqua salata 18 minuti. Intanto zucchine a cubetti e pomodorini in padella con aglio, 10 minuti a fuoco vivo. Unisci i ceci scolati e sciacquati, salta 3 minuti, spegni e spremi mezzo limone: è la vitamina C che serve al ferro dei ceci.'],
    ['Merluzzo con patate e fagiolini', 'Cena', '1', '0',
     'Patate a spicchi in friggitrice a 200 °C per 20 minuti, scuoti a metà. Negli ultimi 10 minuti aggiungi i filetti di merluzzo scongelati, asciugati bene con carta, olio e paprika. Fagiolini lessati 8 minuti e saltati in padella con aglio.'],

    ['Pasta con sugo di peperoni e ricotta', 'Pranzo', '1', '1',
     'Peperone a striscioline in padella con cipolla, 12 minuti coperto finché non si sfalda. Fuori dal fuoco mantechi con la ricotta e un mestolo di acqua di cottura: cremoso senza frullare nulla.'],
    ['Frittata di patate e cipolla', 'Cena', '1', '1',
     'Patate a fette sottili e cipolla in padella con coperchio, 15 minuti. Versa le uova sbattute, coperchio, 5 minuti per lato. Servi con pomodorini saltati a parte.'],

    ['Cous cous con lenticchie e carote al curry', 'Pranzo', '1', '2',
     'Carote a rondelle in padella con cipolla e un cucchiaino di curry, 10 minuti. Unisci le lenticchie scolate. Cous cous coperto con acqua bollente pari volume, 5 minuti, sgrana con la forchetta. Limone sopra.'],
    ['Tofu croccante con peperoni e pane', 'Cena', '1', '2',
     'Il tofu va strizzato bene tra due strati di carta con un peso sopra per 10 minuti — riposo passivo, fallo appena rientri: se resta bagnato non diventa croccante. Poi a cubetti, un cucchiaio di amido di mais, 15 minuti in friggitrice a 200 °C. Peperoni in padella 12 minuti.'],

    ['Riso con borlotti, funghi e parmigiano', 'Pranzo', '1', '3',
     'Funghi champignon a fette in padella con aglio, 10 minuti a fuoco vivo senza toccarli troppo. Unisci i borlotti scolati. Riso lessato a parte, mescola tutto, parmigiano grattugiato sopra.'],
    ['Uova al pomodoro con pane tostato', 'Cena', '1', '3',
     'Cipolla in padella, passata di pomodoro, paprika e origano, 10 minuti. Fai tre incavi nel sugo, rompici dentro le uova, coperchio, 6-7 minuti finché l''albume è rappreso e il tuorlo no. Pane tostato in padella.'],

    ['Patate e fagiolini con uova sode', 'Pranzo', '1', '4',
     'Patate a cubetti in friggitrice a 200 °C per 20 minuti, ultimi 8 minuti coi fagiolini già lessati. Uova sode, 8 minuti dal bollore. Olio, origano, limone.'],
    ['Salmone con riso e zucchine', 'Cena', '1', '4',
     'Salmone scongelato e asciugato, 12 minuti a 190 °C in friggitrice. Riso lessato. Zucchine a mezzelune in padella con aglio, 10 minuti.'],

    ['Pasta e ceci', 'Pranzo', '1', '5',
     'Cipolla, un cucchiaio di passata, i ceci scolati. Schiaccia con la forchetta metà dei ceci direttamente in pentola: è quello che rende il piatto cremoso senza frullatore. Acqua a coprire, butta la pasta corta dentro e portala a cottura lì. Limone alla fine.'],
    ['Polpette di ceci con pomodorini', 'Cena', '1', '5',
     'Ceci scolati e schiacciati con la forchetta, un uovo, pangrattato, cipolla tritata fine, cumino. Palline schiacciate, 15 minuti a 190 °C girandole a metà. Pomodorini saltati in padella 8 minuti con aglio e origano. Pane a fianco.'],

    ['Farro con zucca e feta', 'Pranzo', '1', '6',
     'Zucca a cubetti, olio e paprika, 20 minuti a 190 °C in friggitrice. Farro lessato 18 minuti in parallelo. Unisci, feta sbriciolata sopra, pepe.'],
    ['Zuppa di lenticchie e carote', 'Cena', '1', '6',
     'Carote, cipolla e sedano in pentola con olio, 8 minuti. Lenticchie scolate, brodo vegetale a coprire, 15 minuti. Schiaccia un terzo delle lenticchie con la forchetta contro il bordo per addensare. Crostini di pane tostato in padella, limone nel piatto.'],

    -- SETTIMANA 2 — stessi ingredienti, abbinamenti diversi
    ['Cous cous con ceci, piselli e pomodorini', 'Pranzo', '2', '0',
     'Piselli surgelati direttamente in padella con cipolla, 8 minuti. Pomodorini, poi i ceci. Cous cous reidratato 5 minuti. Limone.'],
    ['Frittata di spinaci e feta con patate', 'Cena', '2', '0',
     'Patate a cubetti in friggitrice a 200 °C, 20 minuti. Spinaci surgelati in padella finché non perdono l''acqua, poi le uova sbattute e la feta a pezzetti, coperchio, 5 minuti per lato.'],

    ['Riso con frittata di zucchine', 'Pranzo', '2', '1',
     'Zucchine a cubetti in padella 10 minuti, le uova, cuoci come una frittata alta e taglia a quadrotti. Mescola col riso lessato e parmigiano. È il pranzo che regge meglio in contenitore.'],
    ['Spaghetti con tofu, funghi e piselli', 'Cena', '2', '1',
     'Tofu strizzato (10 minuti passivi) e rosolato in padella finché non si stacca da solo. Funghi, piselli surgelati, salsa di soia. Spaghetti scolati al dente e saltati dentro un minuto.'],

    ['Pasta con crema di cannellini e spinaci', 'Pranzo', '2', '2',
     'Cannellini scolati in padella con aglio, schiacciati con la forchetta e allungati con acqua di cottura e ricotta finché non diventa una crema. Spinaci surgelati dentro, 5 minuti. Limone e pepe.'],
    ['Zucca e ceci speziati con uova sode', 'Cena', '2', '2',
     'Zucca a cubetti e ceci ben asciugati, olio, paprika e cumino, 20 minuti a 190 °C — i ceci diventano croccanti. Feta sopra, uova sode a fianco.'],

    ['Farrotto ai funghi', 'Pranzo', '2', '3',
     'Farro perlato risottato come un risotto: cipolla, farro tostato un minuto, brodo caldo un mestolo alla volta per 20 minuti. Funghi rosolati a parte e uniti a metà. Parmigiano fuori dal fuoco. Stessa tecnica del risotto, più fibra e non serve girare in continuazione.'],
    ['Merluzzo con pomodorini in padella', 'Cena', '2', '3',
     'Pomodorini in padella con aglio, origano e un pizzico di peperoncino, 8 minuti finché non si spaccano. Adagia i filetti sopra, coperchio, 8-10 minuti. Pane per raccogliere il fondo.'],

    ['Patate, peperoni e ceci speziati', 'Pranzo', '2', '4',
     'Tutto a cubetti nello stesso cestello, olio, paprika e cumino, 22 minuti a 200 °C scuotendo due volte. Yogurt greco con limone e sale come salsa: sostituisce lo tzatziki e non richiede frullatore.'],
    ['Burger di cannellini con fagiolini', 'Cena', '2', '4',
     'Cannellini schiacciati con la forchetta, un uovo, pangrattato, cipolla, origano. Due dischi spessi, 18 minuti a 190 °C girandoli a metà. Fagiolini lessati e saltati con aglio. Pane a fianco.'],

    ['Pasta con ceci schiacciati, pomodorini e feta', 'Pranzo', '2', '5',
     'Pomodorini in padella con aglio, 8 minuti finché non si spaccano e fanno il loro sugo. Unisci i ceci scolati e schiacciane metà con la forchetta direttamente in padella: si sfaldano e legano la pasta senza panna e senza frullatore. Manteca con un mestolo di acqua di cottura, feta sbriciolata a fuoco spento, limone.'],
    ['Salmone con zucchine e pane', 'Cena', '2', '5',
     'Zucchine a mezzelune in padella 10 minuti. Salmone dalla parte della pelle a fuoco medio-alto 5 minuti, poi 3 dall''altro lato. Limone.'],

    ['Cous cous con lenticchie, zucca e limone', 'Pranzo', '2', '6',
     'Zucca a cubetti in friggitrice 18 minuti. Lenticchie scaldate in padella con cipolla e cumino. Cous cous reidratato. Scorza e succo di limone.'],
    ['Zuppa di ceci e spinaci', 'Cena', '2', '6',
     'Cipolla e aglio, ceci scolati, un cucchiaio di passata, brodo a coprire, 12 minuti. Spinaci surgelati negli ultimi 5. Schiaccia una parte dei ceci per addensare. Crostini e limone.']
  ];

  -- piatto, ingrediente, quantita, unita
  righe constant text[][] := array[
    ['Porridge con banana','Fiocchi di avena','50','g'],
    ['Porridge con banana','Latte','250','ml'],
    ['Porridge con banana','Yogurt greco','150','g'],
    ['Porridge con banana','Banane','1','pz'],
    ['Porridge con banana','Noci','20','g'],

    ['Pane con miele e uva','Pane','60','g'],
    ['Pane con miele e uva','Uva','150','g'],
    ['Pane con miele e uva','Mele','1','pz'],

    ['Frutta e frutta secca','Mele','1','pz'],
    ['Frutta e frutta secca','Pere','1','pz'],
    ['Frutta e frutta secca','Mandorle','20','g'],

    ['Yogurt greco con frutta','Yogurt greco','150','g'],
    ['Yogurt greco con frutta','Pere','1','pz'],

    ['Due quadretti di fondente','Cioccolato fondente','20','g'],

    ['Farro con ceci, zucchine e pomodorini','Farro','90','g'],
    ['Farro con ceci, zucchine e pomodorini','Ceci lessati','150','g'],
    ['Farro con ceci, zucchine e pomodorini','Zucchine','1','pz'],
    ['Farro con ceci, zucchine e pomodorini','Pomodorini','150','g'],
    ['Farro con ceci, zucchine e pomodorini','Limoni','0.5','pz'],
    ['Farro con ceci, zucchine e pomodorini','Olio extravergine','10','ml'],

    ['Merluzzo con patate e fagiolini','Merluzzo surgelato','175','g'],
    ['Merluzzo con patate e fagiolini','Patate','275','g'],
    ['Merluzzo con patate e fagiolini','Fagiolini','200','g'],
    ['Merluzzo con patate e fagiolini','Olio extravergine','10','ml'],

    ['Pasta con sugo di peperoni e ricotta','Pasta','90','g'],
    ['Pasta con sugo di peperoni e ricotta','Peperoni','1','pz'],
    ['Pasta con sugo di peperoni e ricotta','Cipolle','60','g'],
    ['Pasta con sugo di peperoni e ricotta','Ricotta','100','g'],
    ['Pasta con sugo di peperoni e ricotta','Olio extravergine','10','ml'],

    ['Frittata di patate e cipolla','Uova','3','pz'],
    ['Frittata di patate e cipolla','Patate','250','g'],
    ['Frittata di patate e cipolla','Cipolle','80','g'],
    ['Frittata di patate e cipolla','Pomodorini','150','g'],
    ['Frittata di patate e cipolla','Olio extravergine','10','ml'],

    ['Cous cous con lenticchie e carote al curry','Cous cous','90','g'],
    ['Cous cous con lenticchie e carote al curry','Lenticchie lessate','150','g'],
    ['Cous cous con lenticchie e carote al curry','Carote','200','g'],
    ['Cous cous con lenticchie e carote al curry','Cipolle','60','g'],
    ['Cous cous con lenticchie e carote al curry','Limoni','0.5','pz'],
    ['Cous cous con lenticchie e carote al curry','Olio extravergine','10','ml'],

    ['Tofu croccante con peperoni e pane','Tofu','125','g'],
    ['Tofu croccante con peperoni e pane','Peperoni','1','pz'],
    ['Tofu croccante con peperoni e pane','Pane','70','g'],
    ['Tofu croccante con peperoni e pane','Olio extravergine','10','ml'],

    ['Riso con borlotti, funghi e parmigiano','Riso','90','g'],
    ['Riso con borlotti, funghi e parmigiano','Borlotti lessati','150','g'],
    ['Riso con borlotti, funghi e parmigiano','Funghi champignon','200','g'],
    ['Riso con borlotti, funghi e parmigiano','Parmigiano','18','g'],
    ['Riso con borlotti, funghi e parmigiano','Olio extravergine','10','ml'],

    ['Uova al pomodoro con pane tostato','Uova','3','pz'],
    ['Uova al pomodoro con pane tostato','Passata di pomodoro','200','g'],
    ['Uova al pomodoro con pane tostato','Cipolle','60','g'],
    ['Uova al pomodoro con pane tostato','Pane','70','g'],
    ['Uova al pomodoro con pane tostato','Olio extravergine','10','ml'],

    ['Patate e fagiolini con uova sode','Patate','275','g'],
    ['Patate e fagiolini con uova sode','Fagiolini','200','g'],
    ['Patate e fagiolini con uova sode','Uova','2','pz'],
    ['Patate e fagiolini con uova sode','Limoni','0.5','pz'],
    ['Patate e fagiolini con uova sode','Olio extravergine','10','ml'],

    ['Salmone con riso e zucchine','Salmone surgelato','175','g'],
    ['Salmone con riso e zucchine','Riso','90','g'],
    ['Salmone con riso e zucchine','Zucchine','1','pz'],
    ['Salmone con riso e zucchine','Olio extravergine','10','ml'],

    ['Pasta e ceci','Pasta','90','g'],
    ['Pasta e ceci','Ceci lessati','150','g'],
    ['Pasta e ceci','Cipolle','60','g'],
    ['Pasta e ceci','Passata di pomodoro','30','g'],
    ['Pasta e ceci','Limoni','0.5','pz'],
    ['Pasta e ceci','Olio extravergine','10','ml'],

    ['Polpette di ceci con pomodorini','Ceci lessati','150','g'],
    ['Polpette di ceci con pomodorini','Uova','1','pz'],
    ['Polpette di ceci con pomodorini','Pangrattato','30','g'],
    ['Polpette di ceci con pomodorini','Cipolle','50','g'],
    ['Polpette di ceci con pomodorini','Pomodorini','200','g'],
    ['Polpette di ceci con pomodorini','Pane','70','g'],
    ['Polpette di ceci con pomodorini','Olio extravergine','10','ml'],

    ['Farro con zucca e feta','Farro','90','g'],
    ['Farro con zucca e feta','Zucca','250','g'],
    ['Farro con zucca e feta','Feta','40','g'],
    ['Farro con zucca e feta','Olio extravergine','10','ml'],

    ['Zuppa di lenticchie e carote','Lenticchie lessate','150','g'],
    ['Zuppa di lenticchie e carote','Carote','150','g'],
    ['Zuppa di lenticchie e carote','Cipolle','60','g'],
    ['Zuppa di lenticchie e carote','Sedano','1','pz'],
    ['Zuppa di lenticchie e carote','Pane','70','g'],
    ['Zuppa di lenticchie e carote','Limoni','0.5','pz'],
    ['Zuppa di lenticchie e carote','Olio extravergine','10','ml'],

    ['Cous cous con ceci, piselli e pomodorini','Cous cous','90','g'],
    ['Cous cous con ceci, piselli e pomodorini','Ceci lessati','150','g'],
    ['Cous cous con ceci, piselli e pomodorini','Piselli surgelati','120','g'],
    ['Cous cous con ceci, piselli e pomodorini','Pomodorini','150','g'],
    ['Cous cous con ceci, piselli e pomodorini','Cipolle','50','g'],
    ['Cous cous con ceci, piselli e pomodorini','Limoni','0.5','pz'],
    ['Cous cous con ceci, piselli e pomodorini','Olio extravergine','10','ml'],

    ['Frittata di spinaci e feta con patate','Uova','3','pz'],
    ['Frittata di spinaci e feta con patate','Spinaci surgelati','150','g'],
    ['Frittata di spinaci e feta con patate','Feta','40','g'],
    ['Frittata di spinaci e feta con patate','Patate','275','g'],
    ['Frittata di spinaci e feta con patate','Olio extravergine','10','ml'],

    ['Riso con frittata di zucchine','Riso','90','g'],
    ['Riso con frittata di zucchine','Uova','3','pz'],
    ['Riso con frittata di zucchine','Zucchine','1','pz'],
    ['Riso con frittata di zucchine','Parmigiano','18','g'],
    ['Riso con frittata di zucchine','Olio extravergine','10','ml'],

    ['Spaghetti con tofu, funghi e piselli','Pasta','90','g'],
    ['Spaghetti con tofu, funghi e piselli','Tofu','125','g'],
    ['Spaghetti con tofu, funghi e piselli','Funghi champignon','200','g'],
    ['Spaghetti con tofu, funghi e piselli','Piselli surgelati','120','g'],
    ['Spaghetti con tofu, funghi e piselli','Olio extravergine','10','ml'],

    ['Pasta con crema di cannellini e spinaci','Pasta','90','g'],
    ['Pasta con crema di cannellini e spinaci','Cannellini lessati','150','g'],
    ['Pasta con crema di cannellini e spinaci','Ricotta','80','g'],
    ['Pasta con crema di cannellini e spinaci','Spinaci surgelati','150','g'],
    ['Pasta con crema di cannellini e spinaci','Limoni','0.5','pz'],
    ['Pasta con crema di cannellini e spinaci','Olio extravergine','10','ml'],

    ['Zucca e ceci speziati con uova sode','Zucca','250','g'],
    ['Zucca e ceci speziati con uova sode','Ceci lessati','150','g'],
    ['Zucca e ceci speziati con uova sode','Uova','2','pz'],
    ['Zucca e ceci speziati con uova sode','Feta','40','g'],
    ['Zucca e ceci speziati con uova sode','Olio extravergine','10','ml'],

    ['Farrotto ai funghi','Farro','90','g'],
    ['Farrotto ai funghi','Funghi champignon','250','g'],
    ['Farrotto ai funghi','Cipolle','60','g'],
    ['Farrotto ai funghi','Parmigiano','18','g'],
    ['Farrotto ai funghi','Olio extravergine','10','ml'],

    ['Merluzzo con pomodorini in padella','Merluzzo surgelato','175','g'],
    ['Merluzzo con pomodorini in padella','Pomodorini','250','g'],
    ['Merluzzo con pomodorini in padella','Pane','70','g'],
    ['Merluzzo con pomodorini in padella','Olio extravergine','10','ml'],

    ['Patate, peperoni e ceci speziati','Patate','275','g'],
    ['Patate, peperoni e ceci speziati','Peperoni','1','pz'],
    ['Patate, peperoni e ceci speziati','Ceci lessati','150','g'],
    ['Patate, peperoni e ceci speziati','Yogurt greco','100','g'],
    ['Patate, peperoni e ceci speziati','Limoni','0.5','pz'],
    ['Patate, peperoni e ceci speziati','Olio extravergine','10','ml'],

    ['Burger di cannellini con fagiolini','Cannellini lessati','150','g'],
    ['Burger di cannellini con fagiolini','Uova','1','pz'],
    ['Burger di cannellini con fagiolini','Pangrattato','30','g'],
    ['Burger di cannellini con fagiolini','Cipolle','50','g'],
    ['Burger di cannellini con fagiolini','Fagiolini','200','g'],
    ['Burger di cannellini con fagiolini','Pane','70','g'],
    ['Burger di cannellini con fagiolini','Olio extravergine','10','ml'],

    ['Pasta con ceci schiacciati, pomodorini e feta','Pasta','90','g'],
    ['Pasta con ceci schiacciati, pomodorini e feta','Ceci lessati','150','g'],
    ['Pasta con ceci schiacciati, pomodorini e feta','Pomodorini','200','g'],
    ['Pasta con ceci schiacciati, pomodorini e feta','Feta','40','g'],
    ['Pasta con ceci schiacciati, pomodorini e feta','Limoni','0.5','pz'],
    ['Pasta con ceci schiacciati, pomodorini e feta','Olio extravergine','10','ml'],

    ['Salmone con zucchine e pane','Salmone surgelato','175','g'],
    ['Salmone con zucchine e pane','Zucchine','1','pz'],
    ['Salmone con zucchine e pane','Pane','70','g'],
    ['Salmone con zucchine e pane','Limoni','0.5','pz'],
    ['Salmone con zucchine e pane','Olio extravergine','10','ml'],

    ['Cous cous con lenticchie, zucca e limone','Cous cous','90','g'],
    ['Cous cous con lenticchie, zucca e limone','Lenticchie lessate','150','g'],
    ['Cous cous con lenticchie, zucca e limone','Zucca','250','g'],
    ['Cous cous con lenticchie, zucca e limone','Cipolle','50','g'],
    ['Cous cous con lenticchie, zucca e limone','Limoni','1','pz'],
    ['Cous cous con lenticchie, zucca e limone','Olio extravergine','10','ml'],

    ['Zuppa di ceci e spinaci','Ceci lessati','150','g'],
    ['Zuppa di ceci e spinaci','Spinaci surgelati','150','g'],
    ['Zuppa di ceci e spinaci','Cipolle','60','g'],
    ['Zuppa di ceci e spinaci','Passata di pomodoro','30','g'],
    ['Zuppa di ceci e spinaci','Pane','70','g'],
    ['Zuppa di ceci e spinaci','Limoni','0.5','pz'],
    ['Zuppa di ceci e spinaci','Olio extravergine','10','ml']
  ];
begin
  select id into v_uid from auth.users where email = v_email;
  if v_uid is null then
    raise exception 'Nessun utente con email %.', v_email;
  end if;

  -- Meglio fermarsi subito che creare mezzo repertorio: un ingrediente
  -- mancante qui diventa un piatto senza quella riga, e la lista sbaglia in
  -- silenzio per settimane.
  select string_agg(distinct t.nome, ', ') into v_mancanti
  from (select righe[i][2] as nome from generate_subscripts(righe, 1) as i) t
  where not exists (
    select 1 from ingredient ing where ing.user_id = v_uid and ing.nome = t.nome
  );
  if v_mancanti is not null then
    raise exception 'Ingredienti non in catalogo: %. Esegui prima seed-ingredienti.sql.', v_mancanti;
  end if;

  select string_agg(distinct t.nome, ', ') into v_mancanti
  from (select piatti[i][2] as nome from generate_subscripts(piatti, 1) as i) t
  where not exists (
    select 1 from meal_slot_def d where d.user_id = v_uid and d.nome = t.nome
  );
  if v_mancanti is not null then
    raise exception 'Pasti non configurati: %.', v_mancanti;
  end if;

  -- Cancella solo i piatti di questo piano, riconosciuti per nome. dish_ingredient
  -- va in cascata; se un piatto è già in una settimana pianificata, meal_slot.dish_id
  -- ha `on delete set null` e quel pasto torna senza piatto.
  delete from dish
   where user_id = v_uid
     and nome in (select piatti[i][1] from generate_subscripts(piatti, 1) as i);

  for i in 1 .. array_length(piatti, 1) loop
    insert into dish (user_id, nome, slot_def_id, fonte, attivo, settimana_ciclo, giorno_ciclo, descrizione)
    select v_uid, piatti[i][1], d.id, 'nutrizionista', true,
           piatti[i][3]::int, piatti[i][4]::int, piatti[i][5]
      from meal_slot_def d
     where d.user_id = v_uid and d.nome = piatti[i][2]
    returning id into v_dish;

    insert into dish_ingredient (user_id, dish_id, ingredient_id, quantita, unita)
    select v_uid, v_dish, ing.id, righe[j][3]::numeric, righe[j][4]
      from generate_subscripts(righe, 1) as j
      join ingredient ing on ing.user_id = v_uid and ing.nome = righe[j][2]
     where righe[j][1] = piatti[i][1];
  end loop;

  raise notice 'Caricati % piatti.', array_length(piatti, 1);
end $$;

select d.nome, s.nome as pasto, d.settimana_ciclo, d.giorno_ciclo,
       count(di.id) as ingredienti
  from dish d
  join meal_slot_def s on s.id = d.slot_def_id
  left join dish_ingredient di on di.dish_id = d.id
 group by d.id, d.nome, s.nome, d.settimana_ciclo, d.giorno_ciclo
 order by d.settimana_ciclo nulls first, d.giorno_ciclo nulls first, s.posizione;
