import { parseText } from './src/parser/parser';

// The user's ACTUAL full data
const realData = `10/14/25 Mid-range unusual whites, reds


Delille Chaleur White 2022 $40 (3)
11/13/25:  8.5. big viscous tart honey, tart bitter finish. Bit of oak & cedar? Clean elegant.  Light smooth finish.
//
We're fans of Smith Haut Lafitte's white wine, but at $100+ a bottle, it's a luxury. The new Chaleur Blanc has a mild herbal note and some oak. Dry. //

Quivira Fig Tree 2022 $29 (3)
2/1/26: 8. Light mineral nose.  Light weight Burgundian. Lightly tart. Mineral. Great for sauv blanc. A little tropical but too covered by acid.
10/24/25: 7. Tart light nose. Floral almost bitter start. Interesting tart finish. Soil.. Best California sav blanc? But just ok. Good with food as planned.
10/25/25: same
//
From a special site in Sonoma's Dry Creek Valley, this has a bit of the aromatic "musqué" clone of Sauvignon. Lime, mildly herbal, a hint of wood. //

Velenosi Pecorino 2024 $20 (3)

//
Le Marche is off the beaten path for many, but it's a top source for good, well-priced wines such as this stellar dry white. Exotic fruit, no oak, fresh. //

Vietti Roero Arneis 2023 $29 (3)
11/22/25: 8. nice fruity tropical nose. peach, floral, pineapple, tropical.  Slightly Effervescent. Maybe too candy-like. Nice lingering candy tart finish.
10/24/25:  8. light fruit nose. Tons of unusual berries, peach. Tropical, not tart. Honey. Like an adult punch. Nice peach apricot finish. Unusual.

//
Vietti is a leader Arneis producer, making a floral and dry white wine. This sets up reds beautifully and is a delicious seafood or cocktail white. //

Cru Chardonnay 2023 $47 (2)
//
A ringer for top French white Burgundy! Toasty, creamy, dry, and very complex. These guys know what they're doing. This is exceptional. Lightly oaked. //

Green & Red Chiles Canyon Zinfandel 2021 $32 (2)
//
The Chiles Canyon bottling of Zin from this vintage caught our attention. Mildly spicy notes with a nice woodsy tone. Showy in its youth through 2030. //

Toma Mendo Pinot Noir 2021 $40 (2)
//
A tiny Pinot specialist making wines in fog-affected sites (Tomaq is an Indian word for fog). Medium-bodied with great red fruit and some sweet oak. Fine. //

Titus Napa Cabernet 2022 $55 (4)
1/8/26: 8. Red fruit, alc nose. Tart tannins. Med body.    Red candied cherries—a bit too much. Soft texture. Rich and varied
//
The 2021 Titus is a showy Napa Cabernet with dark blackberry-like fruit and sweet French oak fragrances. Drinkable now, can be kept 5–10 years if you like. //

Pintas Character 2021 $40 (2)
10/24/25: 8. light deep dark fruit earthy nose.  Moderately Big, light tannin, dark fruit, chocolate. Nice.
//
From 30-year-old vines, this is a top Douro Valley field-blend red: Touriga Franca, Touriga Nacional, Tinta Roriz. Big, plummy, mildly woodsy, dark fruit. //



4/4/25 EU Tariff order
Cellar worthy reds
5/17/25 after Napa: 9. Medium cooked blueberries and strawberries, nose. Alcohol, tannin, cooked blueberries, dark cherry. Long, lingering Tanic dark fruit finish. Very big overall and good.
Larkmead Cabernet 2021 $100 (Regular $125)
The 2021 Larkmead is already a showy wine & it can age a bit, too. Medium-bodied. It's got currants & tobacco. Light wood.

Nino Negri Sfursat 5stelle 2018 $99 (Regular $110)
Few American wine connoisseurs know this special bottling from Italy's Valtellina region. It's the opus one of Sfursat wines. Mildly oaked Nebbiolo. Now–2035+.

San Polino Brunello Monta 2016 $100 (Regular $115)
—

Shypoke Cabernet 2019 $65 (Regular $65)
1/22/26: 8.4. nice dark fruit cinnamon nose.  earth cedar leather earth. Light to medium body. Lingering earthy leather finish.
1/8/26: 8.5. dark earthy leather. A little one note, but a good note.
11/29/25: 8.5. medium leather, dark fruit, alcohol, nose. Hot high alcohol, lots of leather, barnyard, dark fruit, soil. Light lingering earthy finish.
From a small vineyard parcel in northern Napa, Calistoga. There's a light touch of oak to the full-bodied red. Balanced & drinkable. Now–2035+.

Alion Ribera del Duero 2019 $125 (Regular $140)
9/25: 7.5.   Dusty medium red and dark fruit nose. Tart, sharp, dark fruit, dust, cedar wood, tannin. Opens to softer bigger flavors in glass.
Alion is a stellar red from the Vega Sicilia crew in Ribera del Duero. '19 is as intense as a good cabernet, with lots of dark plum & some cedary oak.

Hashima Gevrey Chambertin 2021 $100 (Regular $115)
9/25: 8.5. Light Pinot noir fruit nose. Super soft body, tannin, dark red fruit (cherry?), light wood, light good acid, slight expansiveness. Lingering red and dark dusty fruit finish.
Vigneron Mark Hashima hails from Australia & is making some brilliant French reds. A dark cherry fruit, front & center with a whiff of oak in the back. Elegant.

Paradigm Napa Cabernet 2019 $90 (Regular $100)
From an exceptional estate in Napa's Oakville area. This is a classic cab with dark fruit, moderate tannin & a touch of wood. Best now–2025+.

Roty Gevrey Chambertin 2020 $87 (Regular $110)
Roty makes grand red Burgundies. This is a mildly smoky Gevrey, showing medium body and dark cherry pinot fruit with a hint of oak. Very fine. Now–2030+.

Saint Pierre St Julien 2019 $85 (Regular $95)
7/26/25:8. medium solid low dark fruit nose. Big, tannin, leather, medium alcohol. Not as expansive as last time. Nice moderate dark fruit finish.
7/5/25: 9. Little nose (cold). Giant, expansive, soft, balanced, leather, soul, dark fruit, wood. Slightly tart big dark fruit lingering finish.  (Balance great but may seem thinner later)
Saint Pierre has been making some rather flashy cabernet-based wines and this '19 is excellent. Dark berry fruits and some wood spice notes. Drinkable now–2040.

Paitin Barbaresco RSVG 2016 $100 (Regular $125)
The Pasquero family make excellent wines in the Barbaresco area. This is an old vines bottling. Exceptional. From the famed Serraboella site. Now–2035+.

Roc de Cames 2020 $85 (Regular $95)
Roc de Cames is perhaps the top estate in the Cotes de Bourg (across the river from Fronsac). Merlot-based and nicely oaked. Very showy. Best now–2032+.

Areitta Quartet 2022 $90 (Regular $100)
Cool climate vineyards in southern Napa produce nice elegant cabernet fruit for this Bordeaux-styled blend. A nice touch of cedary oak adds complexity.

Italian/Iberian
Pojer & Sandri Rosso F 2017 $54 (Regular $60)
5/25: 7. Bright red fruit nose. Light to medium body tart, red and dark fruit. some wood.  Probably wouldn't get again.
A showy Trentino rendition of a Bordeaux blend, but the twist is the addition of the local grape Lagrein. Nice oak. Competes well with local Cabernets. Yum!

Velenosi Ninfa Rosso 2021 $31 (Regular $35)
5/25: 7.5. Mild but heavy dark nose. Medium almost viscous body, dark fruit, ending tannin. Light tartness. Cedar. Simple. Brief good finish. Good Value?
This is a great introduction to Italian wines for California palates. It's a blend featuring Montepulciano with Cab, Merlot & Syrah. Nice oak, too! Delicious.

Rioja Alta Ardanza 2016 $40 (Regular $45)
La Rioja Alta is one of the benchmark estates in Rioja. Ardanza is a special bottling showing lovely woodsy, oak notes. Best now–2030, or so. Very fine.

Pintas Character 2021 $80 (Regular $90)
5/25: 8. light alcohol and dark fruit nose. Big, dark fruit, leather, light wood, tannin. Light body. Soft, easy to drink.  Light nice dark fruit tan, and finish.
From 30 year old vines, this is a top Douro Valley field blend red: Touriga Franca, Touriga Nacional, Tinta Roriz… Big, plummy, mildly woodsy/dark fruit.

La Vigna di San Martino 2020 $45 (Regular $50)
6/25: 8.5. Big earthy, dark fruit nose. Giant expensive dark fruit flavors good balance. Delicious. Bit of tartness detracts. Big tannins. Long tart red fruit finish.
Made by a fellow who's a consulting winemaker, he has maybe a hectare of Sangiovese to produce this stellar Chianti Riserva. Very fine! Now–2033+

Esporão Reserva Red 2020 $23 (Regular $26)
2021 6/25: 7.5.  Light red fruit nose. Light but flavorful, red fruit, soil, oak, light tannin, nice balance. Simple good.  Light lingering finish. .
Modern winemaking in Portugal. Team Esporão's dynamic red is nicely oaked and a medium-full bodied wine able to stand up to grilled or roasted meats.

Quinta Bacalhôa CSM 2017 $32 (Regular $36)
This famous estate south of Lisbon grows Cabernet and Merlot. This is a top quality Portuguese red… deep and rich. Decant & air for an hour… Now–2028+

Rampolla Chianti 2019 $38 (Regular $42)
This is a famous estate in Panzano and their Chianti wines are noted for having good structure and cellarability. This is nice now–2032+. Red meats.

Pradihnos (sic, Pradinhos) Grande Reserva 2015 $45 (Regular $50)
7/20/25: 8.5. Big dark fruit, leathery nose. Taste follows nose. Earthy deep, dark fruit leather, cedar. Medium body medium alcohol pleasant tartness.  almost expansive. Big tannin. Lingering ok tart earthy cedar finish.
Beautifully robust with lots of dark fruit (Cabernet & Touriga Nacional). This was matured in small oak barrels with the wood giving a cedary note. Fine.

Baricci Rosso di Montalcino 2022 $40 (Regular $48)
The Mongioli hill in Montalcino is regarded as a Grand Cru site. Baricci, a small estate, makes an unusually good Rosso. 2022 being excellent.

LaVigna Taurasini 2019 $29 (Regular $33)
Made entirely of Aglianico. I preferred this to their more costly Taurasi. Aged in small oak, medium-full bodied & ready to drink. Mild tannins. Red meats?

EU Whites
Collet Chablis Butteaux 2020 $40 (Regular $45)
From an organic vineyard planted in 1972. This site has lots of limestone giving the wine a good chalky, minerally character. Delicious. Appley.

Pommier Chablis 2022 $37 (Regular $41)
It's a bit risky trying to farm organically in Chablis, but this mom & pop team do a good job in the vineyards & cellar. Aged on the lees. Nice!

Raffaitin-Planchon Sancerre 2022 $27 (Regular $30)
Showing a ripe, peachy character on the nose with good, citrusy Sauvignon flavor. This comes from a tiny domaine in the town of Sancerre. Very fine.

Pascal Chablis 1er Cru 2022 $40 (Regular $45)
From the premier cru site of Fourchaume, this is a dry, crisp, appley Chablis. A hint of citrus and some stony notes. Plus a sensible price makes this a buy!

Grande Maison Sancerre 2023 $22 (Regular $25)
A small estate in Sancerre. This is a crisp, bone dry Sauvignon Blanc. Best with seafood or goat cheese. Serve lightly chilled.

Crochet Sancerre Croq' RY 2022 $40 (Regular $45)
Crochet blends fruit from a few sites to make his most intense Sancerre. South-east facing vineyards. No oak & bottled after a year in tank. Dry & crisp.

Bailly Sancerre 2023 $27 (Regular $30)
Bone dry, crisp, minerally Sancerre with textbook Sauvignon Blanc aromas and flavors. Bailly is a smallish, family-run estate… Good quality/price.

Mellot Sancerre Moussai 2023 $33 (Regular $37)
Mellot is a famous Sancerre producer. This 2023 is a delight, classic in style with crisp acidity and no oak. Citrusy & stoney. Best lightly chilled.

Jacot Pouilly-Fuissé 1er 2021 $54 (Regular $60)
A surprisingly serious French white Burgundy from a premier cru site in the Macon region. Far more serious of a Chardonnay, mildly toasty & dry.

Niot Viré-Clessé Chardonnay 2022 $33 (Regular $37)
From a tiny cellar in Burgundy's Côte Chalonnaise, here's a lightly oaked Chardonnay with a hint of toastiness. Dry, crisp and profound for this area.

Rebourgeon Bourgogne B 2022 $27 (Regular $30)
4/25: 7.5. bright mineral, sand. Light body. Tart but goes away quickly. Interesting balance.  Light mineral finish.
From vines within Pommard & Meursault, this is a surprisingly complex Bourgogne Blanc. Mildly toasty, dry. About 500 new cases. Tiny production. Thoughtful.

Château de Chamilly Chablis 2022 $27 (Regular $30)
From a family domaine just north of the town of Chablis. Here's a bright, fresh, dry, non-oaked white. Lovely apple-like fruit. Best with seafood. Light chill.

EU Reds
Here's the cleaned and correctly formatted extract for this final (fourth) receipt image, with accurate prices, vintages, and descriptions, in your preferred word processor format:


Deauratus Cabernet Paso Robles  2023 $43 (Regular $47)
4/25: 5. light red fruit cherry nose. Hits hard with tart red fruit strawberry cranberry. Light med body. Later in glass, less tart, more soil and cedar; still high red fruit.  Lingering tart red fruit finish. Almost candy like.
A rare Paso Robles red that gets our attention. Hits the mark with ripe, but not jammy fruit and a nice touch of American oak. Good now–2030+.

Combier Crozes Hermitage 2021 $31 (Regular $35)
6/25: 6. Killer nose, big, dark fruit. Thin, sour, sort of dirty. Disappointing. May be what Gerald means by "olive notes," but not crazy about it. Simple, ok finish.
Laurence Combier's Syrah shows lots of spice and olive notes. Classic Northern Rhône red, drinkable now. Best at cool cellar temp.

Abadia Retuerta 2021 $45 (Regular $50)
1/16/26: 7.5. Light nose, red fruit. Big, expansive. Cooked, jammy Red fruit/raspberry, but grounded by high alcohol, tannin.
Much in the style of really fine red Bordeaux. A blend of Tempranillo with Cabernet and Syrah. Nicely oaked, very refined and elegant. Now–2030.

Honig Napa Cabernet 2021 $50 (Regular $60)
Honig makes stellar Napa Cabernet, mostly from Rutherford-area fruit. It's big, full-bodied and yet drinkable now. Dark fruit, nice oak. Now–2028+.

Buehler Napa Cabernet 2021 $36 (Regular $40)
2021 4/25: 8. not much nose. cooked red fruit. Cedar, pencil lead. Light Tannin.  Tart medium body. Medium tannin dark fruity finish.
2018: 8, good, soft nose; big, expansive, super soft, leather, tannin, cedar. Lots of great flavors that are all pretty light.

Buehler is a family-operated winery in the eastern hills of Napa. This is a medium-bodied, fairly supple Cabernet with a touch of oak. Drink now–2030+.

Ch. Petit Serin Margaux 2020 $45 (Regular $80)
8/25: 6.5. very light nose. Simple, light to medium body, dark fruit, soil. Brief similar ending.
This is the smallest estate in Margaux, owned by a fellow who is actually a carpenter. Entirely Cabernet Sauvignon. Light touch of wood.

Le Marquis de Calon 2020 $50 (Regular $55)
A flashy red from a famous Bordeaux winery. I prefer this to their $200 bottles. Dark fruit and some sweet oak, plus some mouth-drying tannin. Now–2040.

Grand Montmirail Gigondas 2022 $27 (Regular $32)
7/25: 7.5. White very dark low earthy fruit nose.  Earthy, leather, low dark fruit. Sharp tannins that soften quickly. Light lingering dark fruit finish.

Importer Charles Neal and winemaker Yves Cheron both have daughters named Juliette, so this 80% Grenache cuvée is named for them. Berries and spice. Yum.

Crous St Martin Châteauneuf-du-Pape 2022 $40 (Regular $50)
Based on Grenache with 10% each of Syrah and Mourvèdre. There's a purity of fruit and a touch of spice to this remarkably drinkable red. Best now–2030+. Very fine.

Rioja Alta Arana Reserva 2016 $55 (Regular $62)
We've routinely found this Viña Arana to be a classic Tempranillo with lots of American oak. The 2016 is beautifully drinkable now 'til maybe 2034+. Excellent.

Le Galantin Bandol 2016 $27 (Regular $32)
4/25: Big but simple, tons of tannin, a bit of dark fruit and soil.
Mourvèdre is the grape of Bandol, in France's Provence. They're usually a bit expensive, but this one is a bargain. Drinkable now–2027. Lamb/duck.

Ch. Beauséjour Puisseguin $27 (Regular $30)
A special bottling made without the addition of sulfites! Surprisingly good. It's entirely Cabernet Franc. Some red fruit notes. No oak.



3/26/24
HESS CABERNET ALLOMI 2021 $30 (12)

4/26/23: Big, dark fruit, alcohol, tannin, leather, cedar (oak?). Longish  "dry" tanic dark fruit finish
WE INCLUDED THIS IN A BLIND-TASTING OF
2021 CABERNETS...IT BEAT OUT FAR MORE COSTLY WINES AND WAS EXCELLENT, SHOWING DARK FRUIT & SOME CEDARY OAK. NOW-2030+



3/21/24 Order

Top Reds
Vieux Telegraphe Châteauneuf-du-Pape 2019 $100

 One of the more well-known estates in Châteauneuf, Vieux Telegraphe is nice now and will age well for several more years. Spicy & medium-full.

Shafer Napa Valley Red Blend TD9 $75

 Shafer's new blend replaces their Merlot bottling. Named after an old tractor, TD-9, it's nicely woodsy and cedary. Very showy. Best now-2027, or so.

Nino Negri Sfursat 5 Stelle 2015 $100

 Few American wine connoisseurs know this special bottling from Italy's Valtellina region. It's the Opus One of Sfursat wines, richly oaked Nebbiolo.

Peirson Meyer Cabernet Sauvignon, Kenefick Ranch 2017 $108
 7/24: 8.5. black fruit and skill nose; big, tart, tannic, cider, cherry, mint. Med/full body, alcohol. Dusty, tannic, fruity lingering finish.
10-24 8.5,: good light nose; instant big start, tenons, soil, soft, long, black fruit finish
 From the Kenefick Ranch vineyards in Calistoga, Robbie Meyer makes an elegant, beautifully balanced Cabernet. New oak gives complexity. 7 barrels produced.


Lyndenhurst Cabernet 2020 $81
 4/25: 8.5. good medium dark fruit nose. big, jammy, dark fruit. Soft tannins. Long lingering good slightly tart finish
 From the Spotteswoode winery, this comes from estate-grown grapes plus some that they buy from friends. Elegantly Spottswoode style. Red fruits. Best now-2030.

Montevertine Rosso MV 2020 $100

 The 2020 Montevertine is a stellar rendition of old-school Tuscan Sangiovese. Snappy, cherry & red fruit notes with a mildly tannic bite.

Dal Forno Valpolicella 2017 $120

 Romano Dal Forno is a perfectionist winemaker in Italy's Veneto. His Valpolicella is like no other: dark, full, lavishly oaked... Bordeaux/Cab-like.
2015: 7/24: 8.7. Light earthy, red/black fruit nose.   Big, high flavors but not tart — maybe slightly vegetal but good .. Like new oak? Red fruit. medium body but stirring "backbone" of structure. Long finish.
2013: 9, super balanced, fantastic. (11/21: 3rd glass from bottle over a couple mo and not as good. Tart. But otherwise same)


Vietti Barbera Vecchia 2020 $90
9/24: 7: tart, big.
5/24: 7.6; red fruit, light to medium body, tannin, light cedar, just slightly too tart; lingering red fruit finish.
 The old vines below the Vietti winery are planted in a Barolo site, but they still make an intense Barbera from these shy-bearing vines. Blackberry notes.

Alion Ribera Del Duero 2015 $125

 Alion is a stellar red from the Vega Sicilia crew in Ribera del Duero. It's as intense as a good Cabernet, with lots of dark fruit and some cedary oak. Tops!

Gaja Brunello 2018 $100

 Gaja's Brunello is as showy as their Piemontese reds. Intense Sangiovese with a hint of wood, dark cherry notes. Now through 2035+. Best decanted.

Roc de Cambes 2020 $85

 Roc de Cambes is perhaps the top estate in the Côtes de Bourg. Merlot-based and nicely oaked. Very showy. Best now-2035+.

Arietta Quartet 2021 $81

 Called Quartet as the musical team at Napa's Arietta blended Cabernet, Merlot, Cab Franc & Petit Verdot. Lovely oak notes harmonize with the dark red fruit.



Medium Body Reds
Poe Pinot Meunier 2019 $34
 10/25: 6. Lights bright nose. Bright, solid dusty earthy red fruit. Fine, but don't love it. Light finish.
 From Sonoma Mountain's Van der Kamp Vineyard, this is entirely Pinot Meunier (a grape used in sparkling wine). Bright red fruits. Best served cooled.

Roty Marsannay St Etienne 2020 $59

 Roty has exceptional vineyards in Gevry-Chambertin, but also in neighboring Marsannay. Similar wine, lower price. Cherries & forest floor. Light oak.

Laboureau Volnay 1er Crus 2020 $76
4/25: 8.5. Balanced. Red and dark fruit nose. Red and dark fruit. Light tannin. Lightly tart. Light to medium body. Easy drinking.  Lingering red fruit, tannic finish
 4/25: 8. Light nice mostly red fI'veruit nose. light medium body, light tannin, tart red cherry, Big and round, cedar. Long, red fruit and cedar finish.
 Stellar Volnay from the Les Lurets Cru. Young winemaker who's making some really top wines. Classic Burgundy with good cherry fruit & a touch of wood.

Dom Colette Fleurie 2022 $20

 Jacky Gauthier is a stellar Beaujolais grower. His 2022 Fleurie is remarkably deep/dark with wonderful black cherry & strawberry fruit. Best now-2025+.

Ojai SB Pinot Noir 2022 $40
 10/25: 8. earthy dark fruit nose. Earthy, wood (cedar?), dark almost cooked cherry fruit, light body but big flavor. Nice lingering dark fruit slightly tart finish.
 Winemaker Adam Tolmach is a fan of French Burgundy. His own Pinot Noir is routinely soulful. Nice dark cherry notes & some beet-root tones. Now-2030+.

Esmonin Gevrey Chamb 2021 $55

 Esmonin prices his wines to sell, thank you! This is a marvelous entry-level Gevrey Chambertin at a silly (low) price. Cherries, light oak. Now-2028+.

Waldgries Sta Magdalene 2021 $24
 3/24: 7.5, light, red fruit, nose; strawberries, cherries, little bit tart, good backbone, some tannin, better than it's description. Lingering red fruit balanced finish.
 Santa Magdalener is a blended red based on the Schiava grape with a boost from the Lagrein variety. This one is tops, super fruity & berryish. Best cool.

Papapietro Perry Pinot 21 $59

11/28/25: 7. light dark fruit nose. Big, tannic, mostly dark fruit, light body, alcohol, slight tart. Lightly tart lingering, dark and red fruit finish. Cherry. Light mint and cedar.
11/22/25: 8. big, rich, red and dark fruit, light chocolate, leather. Pinot noir characteristic. Light red fruit lingering finish.
 Papapietro & Perry used to help out at their friends Williams & Selyem's winery before launching their own brand. Mild beet root/cherry notes. Very fine.

Tomaq Mendo Pinot Noir 21 $39
 4/25: 7. very light red fruit nose. strawberries and raspberries. Some oaky tannin. Long tart dusty finish.
 A tiny Pinot specialist making wines in fog-affected sites (Toma is an Indian word for fog). Medium-bodied with great red fruit & some sweet oak. Fine!!

Janin Moulin-a-Vent 2018 $35
 7/24: 7.5. red fruit nose; Red fruits but lots more like kumquat and citrus peel, but good. Opens to soft heavy almost Tabasco with lots of alcohol.  heavier than expected from nose. Tannin. in glass, big, but  simpler tannic alc. Lingering tannic, dark fruit finish.
7/24: 7.5. Alcohol & red fruit nose. Red fruit, but varied and with body.Good acid, tannin. Lingering tart red & dark fruit finish.
 From a patch of really old vineyards of Gamay (80-100 years old), dark in color and beautifully berryish & intense. Best now-2028 or so. Cellar temp.

La Gerla Birba Rosso 2019 $37
 3/24: 7.5. red fruit nose. Tart, tannic, medium body, oaky leather lingering finish.
 Birba was an experiment for aging Sangiovese in French oak. Pretty much it's Brunello, but left in wood for a shorter period. 2019 is excellent!

Marotti Campi Rubico Lacrima di Morro d'Alba 2020 $29
 3/24: 8. Light dark fruit nose. Light-med body, dark fruit, dusty leather, soil, dark cherry.
 Lacrima di Morro d'Alba comes not from Alba in Piemonte, but from Le Marche. Fabulously floral, mildly oaked red. Best lightly cooled. Pasta perfect!


Value Full Reds
Des Louis Crozes Hermitage 2019 $34
 11/24: 7.5.  light nose. Simple, tannic, leather, spice, alcohol,  dark fruit. Expands to long tannic leather finish.
2/25: 8.3, light nose. light body.  stone, tannic, dark fruit. Expanding. Lingering dark fruit, leather finish.
 The first vintage from a new vigneron who planted empty parcels of his family vineyards with Syrah. Robust & youthful with a touch of spice. Best now-2030+.

Blackbird Arise 2019 $40
 11/24: 7.8. simple, full, low tastes (almost an oddly half wine with the higher flavors missing, not necessarily acid) with dark fruit, tannin, leather, light cedar. More full with the dark fruit lingering finish.
 From a Bordeaux blend specialist in Napa, we have a Cab blend with black fruit and a touch of a cedary note from the oak. Drinkable immediately.

Rioja Alta Ardanza 2016 $40
 2/25, 2015: 8.5. Delicious balance. Red and dark fruit. Light, soft tannin. Med body. Leather. Big, but subtle. Just right tartness at end. Lingering slightly tart dark fruit finish.
 La Rioja Alta is one of the benchmark estates in Rioja. Ardanza is a special bottling showing lovely woodsy, oak notes. Best now-2030, or so. Very fine.

Saddleback Zinfandel 2021 $40
 8/25: 8. big spicy dark fruit nose. Alcohol, tannin, dark fruit, cloves. Lingering light spicy earthy finish.
 Old vines tend to produce a smaller crop of greater intensity, so you'll find beautiful berry & mild brambly Zin spice notes in this limited bottling Napa red.

Rioja Alta Arana Reserva 2015 $46

 We've routinely found this Vina Arana to be a classic Tempranillo with lots of American oak. The 2015 is beautifully drinkable now till maybe 2034+. Excellent.

Li Veli Susumaniello 2021 $23
 7/24: 6: light raspberry nose. Tart, big, full bodied, a little vegetal. Lingering dark fruit, sharp tart finish. Not great but solid for the price.
 The Susumaniello grape comes from Puglia where it makes this remarkably charming & soft red wine. Dark cherry fruit. Ready to drink.

Altavigna Taurasini Elio 2018 $27
 3/24: 7.5, rustic, full, dark fruit, leather, tannin. Dry tannic finish.
 Made entirely of Aglianico, we preferred this to their more costly Taurasi. Aged in small oak, medium-full bodied & ready to drink. Mild tannins. Red meats?

La Storia Petite Sirah 2021 $28

 From the Trentadue vineyards in Sonoma's Geyserville area, this is a deep, dark red with a touch of spice. Perfect for grilled meats/ribs, etc. Best now-2028.
7/24: 8. nice dusty dark fruit nose;     big soft tannic, alcohol, tons of dark fruit; body medium to light. Nice    lingering cedar finish

Combier Crozes-Hermitage 2021 $31

 Laurence Combier's Syrah shows lots of spice and olive notes... Classic Northern Rhone red. Drinkable now, 100. And best at cool cellar temp.

Pacletti Piccolo Cru 2019 $33
 11/24: 6.5. Sweet red fruit nose. Cherries, tannin, cider, alcohol, leather. Medium leather finish. Lighter than expected from the write up. Then: 8? improves. softens, "thickens" and less tart later.
 In a blind tasting in May of 2019, this was my top pick (and it was tasted along side far more costly Napa Cabs). Deep black fruit & some sweet oak. Delicious!

Sandrone Barbera 2020 $42
 3/25: 7. big dark fruit soil nose, promising. Immediately tart, almost lemon. Red fruit. Light tannins. Less tart in glass, but not ideal.
 The 2020 Barbera from Sandrone shows lots of dark fruit notes and just a touch of wood. Complete on the palate, being dry and crisp. Cellar temp.

Masetti Montepulciano, quaranta cinque,  Montepulciano d'Abruzzo 2020 $55

Pre-22: not much nose; hard to identify fruit:     cooked cherries, rhubarb, earthy; lots of tannin. Long finish of earth with no fruit. Super interesting (3/3/22 '17, 7.5 first taste is tart juicy raspberry; tannin then earthy, long good tart finish. Same rating.)(3/22, '17: 8, super big, still tart but deep cooked fruit. Still interesting)
11/24: 8. medium light and dark fruit nose. light & dark fruit, leather, light tannin, cedar, light body with big flavor.  Expanding but tight. Lingering leather finish.

 From a new winery owned by a young guy in Abruzzo, here's a full-throttle, dark, intense Montepulciano. Very deep, teeth-staining. Needs red meat/cheese.



Portuguese Wines
Pintas Character 2019 $40 (Quantity: 2)

 From 30 year old vines, this is a top Douro Valley field blend red; Touriga Franca, Touriga Nacional, Tinta Roriz. Big, plummy. Less oak than the 2017.

Quinta Bacalhoa CS/M 2017 $35 (Quantity: 2)
 4/18/24: 7, dirty, bright, red fruit, tannin. Spicy food might wreck tasting. Tart lingering finish.
4/19/24: earthy, tart, dark fruit tannins. Tart lingering fruity finish.
11:24: 7.5. earthy, red/dark fruit, tannin, big finish. A little too tart, but ok.  Lingering tannic, tart finish.
 This famous estate south of Lisbon grows Cabernet and Merlot. This is a top quality Portuguese red. Deep and rich. Decant & air for an hour. Now-2028+.

Poerinho Bairrada Baga 2016 $45

 Famous winemaker Dirk Niepoort has a small vineyard in Bairrada where Baga is a prominent red grape. Medium-bodied, like Pinot Noir... Hint of spice.
3/25: 7. light red fruit nose. Burnt candied red fruit, spice. Medium sweet finish ending with dry tannins.
3/25 (2): 6.5. dusty oxidized early nose. Dusty, mineral, burnt or oxidized red fruit. Light body. Tart tannins.

Portal Douro Reserve 2017 $26

 A classic Douro red blend, this is a muscular, dark red with a bit of a bite to it. Needs some aeration to show off its dark fruit and spice notes. Steak?

Esporao Red Reserva 2019 $26

 Modern winemaking in Portugal! Yes! Esporao's dynamite red is nicely oaked and a medium-full bodied wine able to stand up to grilled or roasted meats.

Soalheiro Granit Alvar 2022 $28

 Nicely stony Portuguese white from our friends at Soalheiro. It's a special bottling of Alvarinho grown on granite soils. Minerally & bone dry.
6/24: 8, No nose; slight effervescence, minerals, super light and pleasant for summer

Soalheiro Alvarinho 2022 $25 (Quantity: 2)

 Soalheiro is a bit of a Vinho Verde specialist and this is a dynamite example of Alvarinho, a great seafood white. Very fine. Chilled.


Esporao Reserva White $24 (Quantity: 2)
5/24: 7, deep yellow, viscous, bitter/a little harsh, tart, lemon. Lingering bitter, tart finish.
3/24: 7.5. not much nose. Deep yellow.  Bitter oaky, dry, honey at first. A little odd. Lightly tart in a good minerally way.  A slight creaminess like a Chardonnay. Good as a daily option?
 If you've been looking for a nicely oaked white wine made of mystery grapes, this is it! Styled like a local Chardonnay, but dry, this is a treat. Best chilled.





2/12/23 order

20694 LA HONDA SC MINS CAB 2020 29
3/26/23: 7.5,  soft, simple, very good, fruit forward, lingering finish, tannin, good value.
FROM SOME LITTLE BACKYARD VINEYARDS, EVEN IN NEARBY HILLSBOROUGH! THIS IS AN ELEGANT, MEDIUM-BODIED CAB SHOWING DARK FRUIT. NOT MUCH WOOD. BEST NOW-2028+
20689 HART'S DESIRE CABERNET 2016 25
4/1/23: 6, solid, big, cloying, dark fruit, tannin, medium body, lingering finish, good value
JOHN HART MAKES A GOOD, MEDIUM BODIED AND FAIRLY READY-TO-DRINK CABERNET.
NICE FRUIT, MILDLY HERBAL.
...OAK IS NOT
SO NOTICEABLE. BEST NOW-2026+.
20770 GREEN + RED CHILES MILL 2017 33

GREEN + RED, IN THE HILLS OF THE EASTERN NAPA VALLEY, MAKES A BRIARY, BERRYISH ZIN WITH A HINT OF BROWN SPICES. IT'S SMOOTH & GENTLE. BEST NOW-2026+.
24502 ACRE NAPA ZINFANDEL 2019 27
2/23: 7: fresh very tart Cherry; tannin; cloves, less tart w/food.
FROM LINCOLN CREEK VINEYARD IN OAKVILLE, A SMALL PLANTING. BEAUTIFULLY BERRYISH AND WITH SOME PEPPER SPICES WITH A HINT OF OAK. VERY CHARMING.
23395 HARPER OAK CABERNET 2021 26

FROM SONOMA COUNTY'S ALEXANDER VALLEY THIS IS A SURPRISINGLY SMOOTH, SUPPLE CABERNET WITH A TOUCH OF OAK. MADE BY SOME FORMER DUCKHORN CELLAR HANDS.
11014 POST SCRIPTUM DOURO 2019 26

THE SECOND LABEL OF CHRYSEIA, WE FREFER THIS "PS" SECOND LABEL TO THE MORE COSTLY FIRST LABEL. BORDEAUX MEETS THE DOURO. NICE FRENCH OAK & DARK FRUIT.
10821 CH MONTMIRAIL GIGONDAS 18
1 0 24.99 2.50 22.49 T
THOUGH LOCATED IN VACQUEYRAS, THIS MODEST-SIZED ESTATE MAKES A RATHER BIG AND LEATHERY GIGONDAS, WORTHY OF A.
WELL-SEASONED LAMB OR DUCK DINNER.
12553 BERTHOUMIEUX MADIRAN 2016 23
4/1/23: 7.5, big, medium body, wood, light tannin, dark fruit, tiny bit of green but ok, raspberry, blackberry
 BERTHOUMIEU 'S SPECIAL 'CHARLES DE BATZ' MADIRAN, 90% TANNAT, IS A MARVELOUSLY CEDARY, WOODSY RED ALONG THE LINES OF A GOOD CABERNET OR BORDEAUX. BEST NOW-2030
15174 FINCA MARTELO
2014
1 @ 39.99
4.00
35.99 T
LAVISHLY OAKED, OLD-SCHOOL RIOJA, THIS IS A MEDIUM+ BODIED TEMPRANILLO THAT SEES MOSTLY AMERICAN OAK WITH A BIT OF FRENCH. PERFECT FOR GRILLED MEATS.
20512 MIRO PETITE SIRAH RSV 20
1 @ 29.99
S
29.99 Т
REGULAR
38.00
PETITE SIRAH ON ITS OWN (IT'S TYPICALLY A BLENDING VARIETY USED FOR COLOR CAN MAKE A SPICY, ROBUST RED. MIRO'S SHOWS NICE CEDARY, WOODSY TONES, TOO. STEAK?
12868 COMBIER CROZES PURPLE 20
1 0 24.99
2.50
22.49 T
COMBIER IS ONE OF THE TOP GROWERS IN THE CROZES HERMITAGE APPELLATION. HIS 2020
IS A READY-TO-DRINK SYRAH WITH BERRIES & SPICE. BEST AT COOL CELLAR TEMP. NOW.
23019 PEJU NAPA MERLOT
2018
1 0 34.99
S
34.99 T
REGULAR 60.00
WE ASKED THE WINERY REP IF THEY HAD A NEW WINEMAKER AS THIS 2018 IS FAR BETTER THAN WE'VE EVER TASTED FROM PEJU. MILDLY WOODSY & READY TO DRINK. VERY FINE!!
14708 RIOJA ALTA ARANA RSVA 14
6 0 44.99
4.50
242.94 T
WE'VE ROUTINELY FOUND THIS VINA ARANA TO BE A CLASSIC TEMPRANILLO WITH LOTS OF AMERICAN OAK. THE 2014 IS BEAUTIFULLY DRINKABLE NOW TIL MAYBE 2034+. EXCELLENT
14041 PENFOLDS BIN 389 CAB/SH
8/28/23:
6 0 59.99 REGULAR 75.00
FAMOUS AUSSIE RED. SOMEWHAT OF A BENCHMARK FOR CABERNET BLENDED WITH SHIRAZ.
2018 IS LAVISHLY-OAKED. BEST WITH RED MEATS. NOW-2030+

22117 RIMBAUER CHARDONNAY ZUZ!
4 0 37.99
3.80
136.76 T
ROMBAUER 'S NAPA CHARDONNAY COMES FROM CARNEROS. THIS VINTAGE SPORTS A TON OF WOOD AND IT'S SLIGHTLY SWEET. AS A RESULT, IT'S BEEN AMAZINGLY POPULAR.
23314 LLOYD CHARDONNAY
2021
3 @ 34.99
S
104.97 T
REGULAR
45.00
ROBERT LLOYD WORKED NUMEROUS VINTAGES AT ROMBAUER AND PRODUCES A CHARDONNAY OF SIMILARLY FLASHY STYLE... NICE OAK &
LOADS OF FRUIT...STYLISH!
23155 FRANK FAMILY CHARDONNAY20
3 0 39.99
S
119.97 T
REGULAR
45.00
FRANK FAMILY OFFERS A BIG, ROLY-POLY STYLE OF CALIFORNIA CHARDONNAY... FAIRLY OAKY AND WITH RIPE PEACH/APRICOT SORT OF FRUIT... IMMENSELY POPULAR THESE DAYS...
15503 CRU CHARDONNAY
2017
1 @ 39.99
4.00
35.99 T
A RINGER FOR TOP FRENCH WHITE BURGUNDY!
TOASTY, CREAM, DRY AND VERY COMPLEX.
WISH THEY MADE MORE..
13868 BOUCHARD FINLAYS CHARD14
11/24: tropical fruity nose. Viscous, low fruit. Good, but too old?
1 @ 26.99 HAVING BEEN IN OAK BARRELS FOR 8 MONTHS, THIS LOVELY CHARDONNAY SHOWS NICELY TOASTY NOTES, A CREAMY CHARACTER & IT'S DRY AND NICELY CRISP. SEAFOOD?
15279 BONDAR CHARDONNAY
2020
1 @ 31.99
3.20
28.79 T
FROM A COOL CLIMATE SITE IN AUSTRALIA, THIS IS A SURPRISINGLY BURGUNDIAN VERSION OF CHARDONNAY. TOASTY & COMPLEX WITH DEEP FLAVORS. DRY. VERY FINE.
60219 DUDOGNON RESERVE COGNAC
1 0 49.99
S
49.99 T
REGULAR 55.00
DUDOGNON IS A SMALL MOM & POP COGNAC GROWER/DISTILLER. THEIR COGNACS ARE FOUND IN TOP STARRED RESTAURANTS AROUND FRANCE. NO CARAMEL/SWEETENERS. 10-15 YRS
15490 APATSAGI FURMINT
2018
2 @ 26.99
2.70
48.58 T
FROM HUNGARY'S SMALLEST WINE REGION, SOMLO, COMES THIS REMARKABLY COMPLEX DRY WHITE WITH EXOTIC HONEY AROMAS, ZESTY LIME & CITRUS FRUITS...
VERY FINE.
40395 VITTEAUT ALBERTI AGNES 24
2/23: 7.5, light, solid, tart start but good. Small bubbles. Lingering tart finish.
THE BURGUNDY TOWN OF RULLY HAS HAD A LONG HISTORY OF MAKING CHAMPAGNE-STYLED BUBBLY. CUVEE AGES IS A TOP EXAMPLE, MILDLY TOASTY/YEASTY AND DRY. VERY FINE
40528 VON WINNING EX BRUT
1 0 29.99
3.00
26.99 T
VON WINNING, A STELLAR ESTATE IN THE RHEINPFALZ, MAKES A REALLY DRY, CRISP SPARKLER. RIESLING. DRY. GOOD ACIDITY.
40520 GUY DE FOREZ BRUT
1 @ 39.99
S
39.99 Т
REGULAR 50.00
FROM THE AUBE REGION IN SOUTHERN CHAMPAGNE, THIS IS A DRY, MILDLY TOASTY BUBBLY BASED ON PINOT NOIR. LES RICEYS IS A WELL-KNOWN CHAMPAGNE AREA. DRY.
40562 DOM DES RONCES CREMANT
1 0 29.99
3.00
26.99 T
REPLICATING GOOD BLANC DE BLANCS
CHAMPAGNE, BUT COMING FROM THE FRENCH ALPS. MILDLY STONY & A TOUCH OF THE YEASTY NOTES OF GOOD CHAMPAGNE

12247 CH VALANDRAUD STEM 2019 180
1 0 179.99
S
179.99 T
REGULAR 200.00
THE 'BAD BOY' OF BORDEAUX, JEAN-LUC THUNEVIN MAKES SOME REMARKABLE WINES.
) .
THE JEWEL IN THE CROWN IS VALANDRAUD, A RICH, COMPLEX, MERLOT-BASED RED.
14344 IL POGGIONE. PAGANELLI 16 120
1 0 119.99
S
119.99 T
REGULAR 135.00
FROM IL POGGIONE'S OLDEST VINES, THEY PRODUCE THIS ONLY IN TOP VINTAGES. THIS IS A RARITY. FRENCH OAK AGED. RATHER FULL. BEST DECANTED 1-2 HOURS AHEAD.
13155 ALION RIBERA DE DUERO 18 125
4/1/23:

ALION IS A STELLAR RED FROM VINEYARDS NEIGHBORING VEGA SICILIA (SAME OWNERS).
TEMPRANILLO WITH FRENCH OAK. VERY FINE.
DARK FRUIT/CEDAR. BEST NOW-2035+
23396 QUENCH + TEMPER CH IV 19 55
1 @ 59.99
6.00
53.99 T
A BIG, MASSIVE RED BLEND OF GRENACHE & GRACIANO...DARK FRUIT, SORT OF CREAMY & ROBUST.
MADE BY A TURLEY WINERY
CELLAR GUY. TINY PRODUCTION.




6/22/22 Order
    Number    Price range    Comment

Whites you recommend. Ideally, minerally, big, LOW acid (including for spicy food)    9    25-35    I DID like the backbone of the La Taille aux Loups Chenin Blanc, but it was too tart for me to want again.
Sancerre    3    30-40
12 Frank family/Rombauer Chardonnay (butter, oak, viscous/big body, low acid). If there are 2-3 you prefer in this style, please mix them in.    12    40?    With and without food (and often at drunk at room temperature)
Veedercrest 2009-type Cabernet. For me, this "type" and what I'm looking for: big flavors with some oak, chocolate, leather and just enough fruit at a daily drinking price    12    30-45    With and without food
2 LBV Port    2    50
Reds you recommend. Variety is ideal, but in general I tend to like wines that seem "big" for the grape.    10    Avg of $40. A big range is a plus ($30-$100?)    The only nose/flavor that turns me off in reds is green vegetable
     48    TOTAL: ~$2000?

STONY WHITES
15140 MELLOT SANCERRE 2020 35
14479 CHOTARD SANCERRE 2020 27
CRISP, MILOLY FRUITY, STONY, LIGHTLY CITRUSY SANCERRE. ..CRISP, DRY AND PERFECT FOR OYSTERS OR OTHER SEAFOOD. FISH & CHIPS, PERHAPS? BEST CHILLED.
11201 H BOURGEOIS SANCERRE 2020 40
THE MONTS DAMNES SITE IS REGARDED BY MANY AS A TCP HILLSIDE FOR SAUVIGNON IN SANCERRE. THIS IS A BRACINGLY DRY AND NICELY CRISP WHITE. SEAFOOD?
13681 TRAMIN STOAN BLEND 2019 33
1/25: 8.6.  light mineral nose. Creamy, mineral, stone. Lingering tropical fruit flavors. A steely light delicious for casual situations.
WINEMAKER MILLI STURTZ MAKES THIS 4 GRAPE BLEND TO MAKE THIS STELLAR ALTO ADIGE WHITE. AROMATIC. FULL-FLAVORED. BEST WITH WELL-SEASONED FOOOS.
11379 DROIN CHABLIS 2020 32
DROIN'S 2020 CHABLIS IS A WONDERFUL EXPRESSION CF CHARDONNAY. IT'S VERY DRY AND NICELY ZESTY ON THE PALATE. AROMAS OF GRANNY SMITH APPLES. SEAFOOD/AFERITIF
11435 COLTERENZIO LAFOA S8 2019 45
LAFOA SAUVIGNON IS A DELUXE BOTTLING FROM COLTERENZIO. MILDLY HERBAL WITH A TOUCH OF LEMONGRASS...DRY, SHOWY. FRENCH CLONES OF SAUVIGNON! VERY FINE.
12493 PINSON CHABLIS 2020 28
CHABLIS WINES ARE HIGHLY PRIZED FOR THE STONY AND MINERALLY ASPECTS OF THE WINE. THE PINSON BROTHERS MAKE A STELLAR ENTRY LEVEL BOTTLING, LIGHT & ELEGANT. NCH-2027
12907 TROUSELLE HAUTES COTES 20 25
FROY SUSTAINABLY-FARMED VINEYAROS NEAR ST AUBIN & ST ROVAIN, HERE"S A REALLY CLASSIC, TASTY, MEURSAULT-LIKE WHITE. A BIT OF NEX HOOD. VERY ELEGANT.
13603 GRAILLOT CROZES BLANC 2020 38
GRAILLOT FERMENTED HALF THE BATCH IN STAINLESS. THIS MARSANNE/ROUSSAYNE BLEMI DISPLAYS APRICOT & HONEYEO NOTES. SCARCE
11712 TERLANO SAUV BLNC WINKL2020 28
8/25: 6.8. nice light tropical citrus nose. Grapefruit pit, slightly effervescent, good viscous almost creamy body, lemony finish. Light ripe citrus finish.
BEAUTIFUL INTENSE "MOUNTAIN," COOL-CLIMATE SAUVIGNON BLANC! AGED ON THE LEES FOR 6+ MONTHS WITH 20% SEEING LARGE WOOD VATES. NO OAK SHOWING THOUGH. TOPS!
14351 SOALHEIRO PRIMEIRA ALV 20 33
6/22:6.5,  effervescent, big, bitter lemon tart, mineral "structure" feel, agree on "peachy".
7/22: 6, same, despite the interesting mineral backbone, probably too tired to buy again
VINO VERDE IS NOT TYPICALLY A PROFOUND WINE, BUT THIS IS NOT TYPICAL ALVARINHO OLD VINES,  BEAUTIFULLY INTENSE AND PEACHY/STONY. NOW. BEST CHILLED.
10668 SOPLHEIRO ALVARINHO 2020 24
SOALHEIRO IS A BIT OF A VINHO VERDE SPECIALIST AND THIS IS A DYNAMITE EXAMPLE OF ALVARINHO, A GREAT SEAFOOD WHITE. VERY FINE. CHILLED.


CHARDONNAY
23155 FRANK FAMILY CHARDONNAY 20  36
2019: 8 3/22: 8, no>light nose; cedar, mineral, good body. Not like the 2018.
2018: 9, Big, soft, almost sweet, lots of oak, peach, non-tart finish. In the glass, I got more tart and the oak was accentuated almost a little too much. Even better week later (coravin).    Despite Gerald's dismissive "rolly-Polly" description, I like it.
FRANK FAMILY OFFERS A BIG, ROLY-POLY STYLE OF CALIFORNIA CHARDONNAY...FAIRLY OAKY AND WITH RIPE PEACH/APRICOT SORT OF FRUIT. IMMENSELY POPULAR THESE DAYS...
22117 ROMBAUER CHARDONNAY 20 36
ROMBAUER"S NAPA CHARDONNAY COMES FROM CARNEROS. THIS VINTAGE SPORTS A TON OF OOD AND IT'S SLIGHTLY SHEET. AS A RESULT, IT'S BEEN AMAZINGLY POPULAR.
20349 PATZ & HALL SC CHARD 2018 40
7/22 (room temp): 6.5, tart, lemon, slight effervescence, viscous (but slightly sharp too), a little wood?, pretty good mineral/tart finish
11/22: 8,  apple, pears, lemon but NOT overly tart. More like lemon flavored slightly butter mineral. Really nice. Like a version what I don't like in a variation I like.
2018: 8, Cotton candy, caramel on nose and taste. A bit tart but worth it.
2/23: 7.5 mineral, light lemon (but too tart), expansive, cedar, pears, lingering tart woody finish.

PAT & HALL OFFERS THIS LOVELY, CREAMY. DRY, LIGHTLY Woodsy CHARDONNAY. VERY DISTINCTIVE. ONE OF CALIFORNIA"S BEST. LIGHTLY CHILLED IS IDEAL. SHOWY.
22847 SADDLEBACK CHARDONNAY 19 33
USING SEVERAL CHARDONNAY CLONES, THIS IS A MAGNIFICENTLY TOASTY, CREAMY DRY WHITE FROM AN OLD VINTNER IN NAPA. PEAR & RIPE APPLE FRUIT & A BIT OF OAK... VERY FINE
23314 LLOYD CHARDONNAY 2020 40
2019: 5/21, 7-8: tart, mineral, Cedarwood, butter. Too tart finish. Later in glass: Burgundian, less acid, more mineral (head-to-head beat Frank Family later in glass when Frank became tart and cloying)
6/22: mineral, lemon but not too tart, dry, lite toast, viscous
7/22: 7.5,
2018: 7, minerals, Steel, light tart peach and tropical
ROBERT LLOYD WORKED NUMEROUS VINTAGES AT ROMBAUER AND PRODUCES A CHARDONNAY SIMILAR FLASHY STYLE. NICE OAK AND LOADS OF FRUIT...STYLISH!


CABERNET
20482 NOVELTY HILL WASH CAB 18 25
2018: 7/22: 7.5 chocolate, red and dark fruit, soft, medium body, soft tannin finish
2016: 7/20: 7.5, then 8, really great first taste. Tons of chocolate, cedar and leather. Soft. Dark fruit.
2016: 8/20: Good weeks later. Same description but a bit more sharpness.
2016: 3/21: off? Worse after a while in glass

WE INCLUDED THIS IN A BLIND TASTING SOME YEARS AGO & IT WAS EXCELLENT! THIS NEW 2018 IS REMARKABLY GOOD WITH BEAUTIFULLY CEDARY NOTES FROM THE OAK. BEST BUY!
22558 BUEHLER NAPA CABERNET 18 35
BUEHLER IS A FAMILY-OPERATED WINERY IN THE EASTERN HILLS OF NAPA. THIS IS A MEDIUM-BODIED, FAIRLY SUPPLE CABERNET WITH A TOUCH OF OAK. DRINK NOW-2028+
24004 CHAPPELLET MOUNTAIN CUVEE 2019 43
CHAPPELLET PRODUCES THIS BORDEAUX BLEND WHICH THIS VINTAGE IS 33% MERLOT, 44% CABERNET WITH THE OTHER USUAL SUSPECTS MEDIUM-FULL, DRY, MILDLY OAKED. NICE!
10/22: 6.5, good Bordeaux, like earthy, dark fruit nose, taste, is a little weird with good tannin, dark fruit, big flavors, but a bit of cloying  flavor that may seem a little like green bell pepper?, maybe a bit too much red fruit in the nose and taste.
21928 L'ECOLE COLUMBIA CAB 18 29
L'ESCOLE 41 IS ONE OF THE ORIGINAL PIONEERING WALLA WALLA WINERIES. THEIR 2018 CABERNET IS QUITE GOOD, SHOWING A MILDLY CEDARY TONE & DARK FRUIT.
22213 TITUS NAPA CABERNET 2019 58
*WE INCLUDED THIS IN A BLIND-TASTING OF CABERNETS AND IT WAS THE RUN-AWAY TOP WINE. DARK IN COLOR & NICELY OAKED, IT'S DRINKABLE NOW-2035+. WELL-PRICED, TOO.
2019: 6/25, 8+, solid, dark, fruit, robust nose. Instantly big with a lot of alcohol, expansive, dark fruit, light wood (cedar?), leather. Simple but lingering dark fruit finish.
2018: 2/22, 8, Good light nose. Soft in a way that's almost viscous . Tons of cedar. Tannin. Light red and baked fruit.
2018: 3/5/22 about same. 8+ Big dark fruit; lots of tannin, earthy)
2019: 10/22, 8+, Big cedar, tannin dark fruit leather. Long tannic lingering finish.

22789 HONIG NAPA CABERNET 'XX 55
HONIG MAKES STELLAR NAPA CABERNET, MOSTLY FROM RUTHERFORD-AREA FRUIT. IT'S BIG, FLLL-BODIED AND YET DRINKABLE NOW.. DARK FRUIT, NICE OAK. NOW-2023+.
20712 BLACKBIRD ARISE 18 43
7/22/22: 8.5, delicious, dark fruit, cedar, soft tannin, right acid, lingering dark fruit   finish
FROM A BORDEAUX BLEND SPECIALIST IN NAPA WE HAVE A CAB BLEND WITH BLACK FRUIT AND A TOUCH OF A CEDARY NOTE FROM THE OAK. DRINKABLE IMMEDIATELY.
13034 PAGO FLORENTINO TINTO 16 24
8/22: 7.5, great nose, too-tart starting taste becomes earthy tannin, leather, tobacco; lingering good simple tannin fish
THE RIBERA CEL DUERO PRODUCER, ARZUAGA, HAS A NEW PROPERTY IN LA MANCHA CALLED PAGO FLORENTINO. MILDLY COFFEE-ISH WITH A TOUCH OF WOOD. NOW-NEXT YEAR.
21259 TREFETHEN CABERNET 2018 53
FROM THE OAK KNOLL REGION OF NAPA COMES THIS DELIGHTFULLY ELEGANT CABERNET. IT'S A CLASSICALLY-STYLED RED, MILDLY OAKED & DRINKABLE NCW-2030+. GOOD VALUE, TOO.
1/23: 8, dry feeling leather and tannin, earth, dark dark fruit. A little thin. Not much nose, but good dark fruit. .
24001 OBSIDIAN LAKE CTY CAB 19 35
6/22: 8, tart (but thankfully less as sits in glass), tannin, tobacco, leather, soft)
7/22: 8, Big, tannin, leather, earth, wood, long lingering finish, soft, and oddly a little bit thin
NAPA WINERIES OFTEN BUY LAKE COUNTY GRAPES. LESS COSTLY & OF GOOD QUALITY. OBSIDIAN RIDGE IS A MEDIUM-BODIED CAB WITH A TOUCH OF OAK. BEST NOW-2028+.
23019 PEJU NAPA MERLOT 2018 ~50
9/5/22:8,  big tart, tannin, leather, dark fruit, soft, long dark fruit finish
8/9/22: Big, tannin, dark fruit, leather, horse stable, medium lingering tannic finish

WE ASKED THE WINERY REP IF THEY HAD A NEW WINEMAKER AS THIS 2018 IS FAR BETTER THAN WE'VE EVER TASTED FROM PEJJ. MILDLY WOODSY & READY TO DRINK. VERY FINE!!

BIG REDS & PORT
50208 GRAHAM"S MALVEDOS PORT 06 70
THE 2006 MALVEDOS IS ON A PLATEAU AND SHOWING BEAUTIFULLY. BEST TO STAND IT UP FOR A FEW DAYS AND DECANT AT THE MOMENT OF SERVICE. NOW-2027+
50178 SMITH WOODHOUSE LATE BV08 38
SMITH WOODHOUSE, OWNED BY THE SAME FOLKS WHO MAKE GRAHAMS, DOW'S AND WARRE'S, IS FAMED FOR ITS OUTSTANDING LATE BOTTLED SAGE, AN UNFILTERED, SMOOTH PORT.
12819 BOLZA TANNAT B6 2017 42
BOUZA IS ONE OF THE LEADING LIGHTS IN URUGUAYAN WINEMAKING. B6 IS A SINGLE VINEYARD SITE & THEY MAKE A DEEP, DARK FULL BODIED, SHOWY RED. DRINK NOW-2025+
23085 ONCE & FUTURE NAPA ZIN 19 47
7/22: 8.5, good simple nose, explosive first taste with leather, tobacco, tart, red fruit. 10 in. Oak. Spice (cinnamon?). Nice Oak-y tart dark fruit finish. 7/22: same
THE FOUNDING WINEMAKER AT RAVENSWOOD HAS THIS ONCE & FUTURE BRAND. FROM ZINFANDEL AT THE FAMOUS GREEN & RED VINEYARD IN NAPA...STELLAR, SPICY NAPA ZIN! DYNAMITE
10750 LE PETITE DUCRU ST J 2018 55
*IN A RECENT BLIND-TASTING, THIS WAS OUR TOP PICK. OLCRU'S 2ND WINE, FORMERLY "LALANDE BORIE," THIS IS A DARK, ROBUST CAB/MERLOT WITH A TOUCH OF CEDARY OAK.
22896 BLACK SEARS ZINFANDEL 17 70
HERE'S A SPECIAL RED THAT CAPTURES BOTH THE CHARACTER OF ZINFANDEL AND ZINFANDEL GROWN ON HOWELL MOUNTAIN. MILDLY SPICY hi, BEAUTIFULLY BALANCED RED. NOW-2026.
12/22: 7.5, red and dark fruit, light, tanning, medium body, long simple finish, a little bit of spice, everything about it is pretty good, but not good enough for the price.
10114 D'ARENBERG DEAD ARM 2017 63
11/24:9.  dark fruit and soil nose. almost viscous at start. Big expensive with tannin, leather, tobacco, dark fruit, cedar.
THIS IS A BENCHMARK SHIRAZ DOWN UNDER. IT'S FROM OLD VINE WHICH YIELD MINUSCULE CROP LEVELS.. INTENSELY BERRYISH AND SPICY SHIRAZ NOW-2022+
10744 VIETTI BARBERA SCARRONE 18 48
THE SCARRONE VINEYARD IS MORE A BAROLO SITE, BUT VIETTI CULTIVATES TOP BARBERA IN BAROLO. THE 2017 IS A NICELY OAKED RED, FAIRLY FULL-BODIED, TOO.
12006 VIETTI BARBERA VECCHIA 18 95
THE OLD VINES BELOW THE VIETTI WINERY ARE PLANTED IN A BAROLO SITE, BUT THEY STILL MAKE AN INTENSE BARBERA FROM THESE SHY-BEARING VINES. BLACKBERRY NOTES..
24465 ALBAN PATRINA SYRAH 2018 63
ALBAN MAKES ROBUST, BIG, INTENSE SYRAH WINES WITH 'CABERNET AUTHORITY" DON'T WEAR WHITE CLOTHING AROUND THIS! BEST WITH GRILLED MEATS, DUCK, LAMB, ETC.
20935 SALUS (STAGLIN) CABERNET 18 110
MADE BY THE STAGLIN FAMILY WITH THE PROFITS DONATED TO BRAIN HEALTH STUDIES. NICE DARK CABERNET FRUIT & A BIT CF FRENCH OAK. BEST NOW-2030. GOT STEAK?
12/22: 7, big tannin flavor — almost too much cedar wood. Lots of good but doesn't stand out as memorable and needing repurchase.
13813 DONNAFUGATA TANCREDI 2017 44
7/22: 8, massive first taste, tannin, dark red fruit, delicious, tart big long finish
TANCREDI IS A STELLAR SICILIAN RED BLEND, ALONG THE LINES OF A SUPER-TUSCAN RED: NERO D'AVOLA WITH CABERNET & TANNAT. MATURED IN SMALL FRENCH OAK. DELICIOUS!




 3/11/22 order
VIETTI BARBERA SCARRONE 2018, 45
THE SCARRONE VINEYARD IS MORE A BAROLO SITE, BUT VIETTI CULTIVATES TOP BARBERA IN BAROLO. THE 2017 IS A NICELY OAKED RED, FAIRLY FULL-BODIED, TOO.
PACENTI BRUNELLO 2014, 50
PACENTI IS ONE OF THE LEADING MODERNISTA VINTNERS IN MONTALCINO. HIS 2014 IS A CUT ABOVE THOUGH & BEAUTIFULLY BALANCED FOR IMMEDIATE DRINKING. BEST NOW-2030.
9/6/23: delicious, soft, alcohol, a little too much green pepper
AALTO RIBERA DEL DUERO 18, 55
AALTO IS A STELLAR LITTLE VENTURE BETWEEN THE FORMER VEGA SICILIA WINE- MAKER & ANOTHER FELLOW. DEEP, DARK AND NICELY OAKED, IT'S A GRAND VIN...
ABOVE TO SO CAL To Bubbie's
VEEDERCREST NAPA CAB 2009, 30
9, Soft, smoky, Woody, just enough fruit, leather, chocolate, delicious, wow for price, not much nose
VEEDERCREST WAS A HOME WINEMAKING CELLAR IN THE OAKLAND HILLS AT ITS START. THEIR 2009 CABERNET IS A MEDIUM-BODIED, ELEGANT RED WITH A TOUCH OF OAK
22117 ROMBAUER CHARDONNAY '20, 38
ROMBAUER'S NAPA CHARDONNAY COMES FROM CARNEROS. THIS VINTAGE SPORTS A TON OF WOOD AND IT'S SLIGHTLY SWEET. AS A RESULT, IT'S BEEN AMAZINGLY POPULAR.
FRANK FAMILY CHARDONNAY 20, 35
FRANK FAMILY OFFERS A BIG, ROLY-POLY STYLE OF CALIFORNIA CHARDONNAY...FAIRLY OAKY AND WITH RIPE PEACH/APRICOT SORT OF FRUIT...IMMENSELY POPULAR THESE DAYS...
SCHMITT GEWURZTRAMINER 19, 20
THE SCHMITT FAMILY CAPTURES THE FLOWERY & MILDLY SPICY NOTES OF GEWURZ, CLASSIC ALSATIAN WHITE. CLOSE TO BONE DRY. CLOSE. VERY FINE!
23314 LLOYD CHARDONNAY 2019, 37
See above
ROBERT LLOYD WORKED NUMEROUS VINTAGES AT ROMBAUER AND PRODUCES A CHARDONNAY OF SIMILARLY FLASHY STYLE...NICE OAK & LOADS OF FRUIT ...STYLISH!  (6/22: 8, light lemon, toast, mineral, enough wood,  balance. A style I'd like to like more.)
DONABAUM GRUNER VELT 2019, 24
 (3/22: 7, nose: Green apples, Kiwi, pineapple, spice later — nice, tropical. effervescent! Big body with lots of minerals that balance the acidity. The tropical almost banana flavor helps with the acidity also. I don't know yet if I would get it again.)
FROM A TOP SMALL ESTATE IN AUSTRIA'S WACHAU REGION. ..NICELY AROMATIC WITH A TOUCH OF GRAPEFRUIT/SPICE. DRY. OF COURSE. ASIAN FOOD, GERMANIC CUISINE
LA TAILLE AUX LOUPS, CHENIN BLANC
First taste: ex-Vouvray, "kick ass chenin") 2019, 40 (3/22: 7, minerally, lemony, Sandy tart;)(4/22: lemon, green apple, so too tart; but backbone makes it tasty)
NO LONGER LABELED AS VOUVRAY, THOUGH IT COMES FROM WITHIN THE APPELLATION, THIS IS A LOVELY, DRY RENDITION WITH A HINT OF DAK. VERY FINE. AN ELITE DOMAINE.
CHAUMEAU SANCERRE 2020, 22
A SMALL ESTATE IN SANCERRE, THIS IS A CRISP, BONE DRY SAUVIGNON BLANC BEST WITH SEAFOOD OR GOAT CHEESE. SERVE LIGHTLY CHILLED.
RAIMBAULT SANCERRE LG 19, 30
FROM A SINGLE VINEYARD PARCEL, RAIMBAULT MAKES A CRISP, ENERGETIC SANCERRE FROM A STEEP AMPHITEATRE SITE. CRISP & FAIRLY FULL.. CITRUSY/STONY & DEEP
PALL THOMAS SANCERRE, 28
FROM SILEX SOILS, THIS IS A NICE, DRY, CRISP SAUVIGNON BLANC FROM THE LOIRE. NO OAK. BEST LIGHTLY CHILLED.
GRAHAM'S MALVEDOS PORT OB, 70
THE 2006 MALVEDOS IS ON A PLATEAU AND SHOWING BEAUTIFULLY. BEST TO STAND IT UP FOR A FEW DAYS AND DECANT AT THE MOMENT OF SERVICE. NOW/-2027+
DALVA 1995 COLHEITA Port, 50
5/22: 9, viscous, big, figs, cherries, tawny, light cedar or juniper,,  hot alcohol,  long hot honey finish

GUIGAL ST JOSEPH HOSP 18, 110
FROM SOME VERY STEEP PARCELS OF SYRAH IN ST JOSEPH, GUIGAL MAKES A WINE OF 'COTE- ROTIE' QUALITY. VERY FINE, CHARMING & NICELY OAKED...GREAT WINE. NOW-2032+ G: "kick ass Syrah"
9+, cherries, blackberries, leather, tannin, earthy, long tart tannic finish.


ADAMUS NAPA CAB TERES 16, 120
AN AMERICAN COUPLE THAT OWNS A WINERY IN FRANCE"S ST EMILION LAUNCHED THIS ESTATE ON HOVELL MOUNTAIN. IT'S A COMPLEX, CAB WITH DARK FRUIT & NICE OAK. NOW-2030+
1/24: 9+, really big; tannic leather; long leathery dusty finish. Dark fruit. That but balanced. Big oak finish.
2/24: 8+, big, soft, dark. Good but not extraordinary this time.
 VIETTI BARBERA VECCHIA 18, 90
THE OLD VINES BELOW THE VIETTI WINERY ARE PLANTED IN A BAROLO SITE, BUT THEY STILL MAKE AN INTENSE BARBERA FROM THESE SHY-BEARING VINES. BLACKBERRY NOTES.

Unmatched to dates
Titus Napa Valley Cabernet, 2018, $50+ The Terraces, Rutherford Cabernet, 2016, $70
3/17/24: 7.5; Medium nose; light to  medium body but big flavor; dust, mineral, mint, leather, dark fruit, lots of tannin;
 XX


5/21 at Bubbie's
DelForno Valpolicella wine 2013, $100.

Alion Ribera del duero, 2016, 8, $100
mellow delicious, balanced


4/21
Minakata Junmai Ginjo Sake, +2, 50% polish, Acidity: 1.3,
4–chemicals, too much cedar, almost a burning ending (like a diluted bourbon); not as intense as the Tokubetsu, but also not as interesting.

BO Tokubetsu Junmai sake, 60% polish, no SMV or acidity; "full-throated",
4—too much everything: earth, wood, chemicals. Super mild effervescence (weird). Ends with nice, woody finish if that's what you want. May change view.

Lloyd Chardonnay, '19,
See above

Langmeil Barossa Shiraz '17 (Gerald highly rec'ded), 25,
8*: big, earthy, leather, tobacco, tannin, a little tart but ok; long spicy finish;  (11/21: smoother, delicious)

3/21
Berthoumieu Madurai, 2015,
 7, Charles de Bartz: big red fruit; tannin; cedar; a little thin in middle and end;


12/20
Ch. du Meursault Bourgogne blanc:
9, oak, mineral, flint, pencil lead, cedar, low acid, background fruit. Later: almost too much pure cedar; maybe a little thin; but different, big, good. (Later: same)   55+
Massetti Montepulciano quaranta cinque 2017 7.5, 50+

Catena Alta Argentine Chardonnay:
5, no nose when cold; strange chemically start; strange dry ending; green apple middle; more mineral-ly than tart, but not great at either;


8/20
Smith Madrone Chardonnay 2016:
6.5, (" toasty according to Gerald ) green apples, vanilla, toast, tart. then softens with more viscosity. '

7/26/20
Bouza Tannat, Uruguay, 2017:
7 alcohol, dark fruit, deep, spicy, leather, light wood (2/22: rock, cedar, earth. Very little fruit. 8)
Lloyd Chardonnay:
See above
ZD Chardonnay:
6, good low acid fruit, light mineral, a little thin
Eyrie Pinot Gris, Oregon:
 6, green vegetables and sand, pretty good. Much more mineral, esp. in finish than tart.
Talley Chardonnay arroyo grande:
7.5, unripe peaches, minerals, good long tart finish
*Frank family Chardonnay 18:
See above
*Frank family Chardonnay 19:
See above
Langmeil barossa Shiraz 2014:
Stoan tramin Italian Chardonnay:
7, Refreshing, granite, not sour. Could fit where a Sancerre could fit.
Bandol Mourvèdre 8
Palladino Barolo 2015
9 fruit, leather, pencil lead, cedar, soft, lingering finish. Instant reaction was "delicious." +1 (but lighter +3). 9/21: a little tart, thin. But still delicious and other descriptors. (3/3/22 after "Coravin time":81\` same, but the thinness is starting to bother me)
Paneretta Chianti Classico Reserva 2015:
7 nose has deep, dark fruit, rubarb, wet leaves …. Nice; taste is same, but sour when first opened; after a few minutes, less sour and bit watery, but still big, dark and red fruit flavors, earth, tannin; long light finish
Kith & Kin Napa Cabernet, 2018
8.5 expansive, tannic dry finish, licorice, leather, earth, long fruit-y finish (11/21: not as good. Big but vegetal undertone)


6/20
Greco:
ok. Nicely Mineral-y, interesting, not overly acidic. Not that exciting.
Sarticola:
just enough minerals to be interesting, but too acidic and lemon-y for me
Rossi do montalcino:
too tart, full red fruit. Good, but acidic.
Fritz:
too acidic. More minerals then lemons, which makes it somewhat pleasant. But way too sour.
Stephen Ross:
7 clean, minerally, light lemon second taste,    slight honey ending
Solitude chard:
6 big and good. Still tart.
Obsidian ridge Cabernet 2017:
ok, harsh
Maranges burgundy:
effervescent, green apple, tart, minerals,
*Viña Alberdi rioja reserves 2015:
8.5 fantastic. Earth and fruit. Leather. Long tannic finish. (3/21: chocolate on nose and taste.) (11/21 a little thinner, but good and other notes same.)

Saddleback Zinfandel Napa 2016:
7 rich, viscous, cooked onions, started sour then softened. Even better later with chocolate and leather.
Walter Hansel Rosston River Chardonnay 2017:
*Gabo do Xil Godello:
8 surprising and delicious. Lots of high tropical fruit: pineapple, kiwi, peaches, even banana. Plenty of acid but not tart. Some minerals in the back. Really good.
Smith madrone Chardonnay:
Good But tart. Lots of good green apples with a lemon finish. Even with that description, not bad at all.
*Novelty Hill Washington Cabernet, 2016:
See above
*Viña ardanza reserva 2012:
big delicious red fruit;  a bit tart but ok; tannin;
9/22: 8.5, medium dark fruit nose, big but a little thin, soft, cedar, red fruit plus deep flavors,
Pied a Terre Cabernet, Sonoma, 2015:
8, 27 Leather, soft tannins, cedar, big fruit, a little tart in the finish, but ok, light body, finish got pretty long after a while in the glass
Cedarville SYrah, 2015, 25: 8.5, Nice simple red fruit nose: almost explosive first taste with chocolate, tobacco, alcohol, tannin
ABADIA RETUERTA ESPECIAL, 29.99, 2015:
7.5; nose: good, chocolate, cherries; dark cherries; cedar/oak; tannin; tart but good; a little thin bodied;
MUCH IN THE STYLE OF REALLY FINE RED BORDEAUX, THIS IS A BLEND OF TEMPRANILLO WITH CABERNET AND SYRAH. NICELY CAKED, VERY REFINED AND ELEGANT. NOW-2024+


4/20
The Owl and the oak, Sonoma Cabernet 2013 (50) 7.5
    Rich, minerally, Red front, oak, long tannin finish. Really good, but tasted at same time as veedercrest, which I preferred
Soalheiro Alvarinho (Albarino) 7
    Great nose, steely but fruity, effervescent
Veedercrest Cabernet Napa 2009 9
    See above
Rioja, viña arana 2012 8
    Tobacco cedar leather tart red fruit, big, really good (like a tart veedercrest)
Rioja, viña arana 2014, 41 (45)
    xx
AALTO Tempranillo, Ribera del duero 2015
    7, Earth, leather, tannin, some dark fruit. Good. Not as big a range of flavors as two above
AALTO Tempranillo, Ribera del duero 2018, 55 (65), 7
    Nose: light good fruit. Tart at first, but expansive, big, tannin. Long, good, tart finish. Not enough deeper earthy flavors.
Chianti Classico 6
    Great nose with earthy chocolate. But starts super tart. Good fruit depth and lots of flavor, but too tart for me.
Vietti Barbera d'Alba (15%!), 2018, 7
    "Bright" Red fruit, acid, no deep undertones.
    Nose is light a little bit dusty and not particularly nice. Long good tart finish.
      (12/21: same on red fruit, full in high flavors but still not "deeper" flavors. Tart cedar.  Nose light, but fits Fruit and pretty good. Good but no great reason to get more. )
    (3/22: 7, Red (dominant) and  dark fruit on the nose. tannin; alcohol; tart raspberries. Cedar. Pretty big.  Long pretty-good tart raspberry finish.)
    10/22: 8, similar theme to previous. Really good with red and dark fruit and a long lingering finish. But flavors are all light rather than deep.
 châteauneuf de pape, ch.  Mont-redon 2015 7
    Earthy, tannins, high acid, dark red fruit, Long almost silky finish
Alta Mora, etna Bianco, Carricante grape
    Clean and  Mineral-y, but just a bit too acidic for me.
Valpolicella 8
    Big deep nose. Earthy, dark fruit. Leather. Tannin.
Chassagne Montrachet, Morey coffinet  7+
    Super elegant with lots of minerals and stone. Nothing bad. And lots of good things other than fruit. But somehow less interesting than I hoped. Later: same mixed feelings. Good, but thin.
Jayson Chardonnay, 2007?, $50,
    8, Stone, fruit, good low acid, long Stony finish. Later more creamy viscous but also higher acid.
Chappellet Mountain Cuvee 2018, 35,
6: Earthy, tannic but flat, dull`;

const result = parseText(realData);

// Collect all wines and analyze
let wines: Array<{name: string; vintage: number; price?: number; color: string; tastings: number}> = [];
let problematic: string[] = [];

for (const batch of result.batches) {
  for (const item of batch.items) {
    wines.push({
      name: item.name,
      vintage: item.vintageYear,
      price: item.price,
      color: item.color,
      tastings: item.tastings.length
    });

    // Check for problematic entries
    const name = item.name;

    // Wine names should be mostly text, not sentences
    // Exclude words that commonly appear in wine names: "the" (The Prisoner, The Owl), "from" (sometimes in names)
    const sentenceWords = /\b(is|was|are|were|has|have|it's|here's|made|we've|we |for me)\b/i;
    // Also check for multiple sentence indicators
    const hasPunctuation = /[.!?](?:\s|$)/.test(name);
    if ((sentenceWords.test(name) || hasPunctuation) && name.length > 40) {
      problematic.push(`SENTENCE: "${name.substring(0, 60)}..."`);
    }

    // Vintage should be 1990-2025
    if (item.vintageYear < 1990 || item.vintageYear > 2025) {
      problematic.push(`BAD VINTAGE: "${name}" has year ${item.vintageYear}`);
    }

    // Price should be reasonable (under $200 usually)
    if (item.price && item.price > 200) {
      problematic.push(`HIGH PRICE: "${name}" has price $${item.price}`);
    }

    // Name shouldn't contain obvious non-wine patterns
    if (/TOTAL|ORDER|NUMBER|PRICE RANGE/i.test(name)) {
      problematic.push(`ORDER LINE: "${name}"`);
    }

    // Name shouldn't start with rating patterns
    if (/^[\d:\/]/.test(name) && name.length > 5) {
      problematic.push(`RATING START: "${name.substring(0, 40)}"`);
    }
  }
}

console.log('=== REAL DATA ANALYSIS ===\n');
console.log(`Total wines parsed: ${wines.length}`);
console.log(`Total batches: ${result.batches.length}`);

const withPrice = wines.filter(w => w.price).length;
const withTastings = wines.filter(w => w.tastings > 0).length;

console.log(`\nWith price: ${withPrice} (${Math.round(withPrice/wines.length*100)}%)`);
console.log(`With tastings: ${withTastings} (${Math.round(withTastings/wines.length*100)}%)`);

console.log(`\n=== PROBLEMATIC ENTRIES (${problematic.length}) ===`);
problematic.forEach(p => console.log(p));

console.log('\n=== SAMPLE OF PARSED WINES ===');
wines.slice(0, 20).forEach(w => {
  console.log(`  ${w.name.substring(0, 50)} | ${w.vintage} | ${w.price ? '$' + w.price : 'NO PRICE'} | ${w.color}`);
});
