# Preču piegādes maršrutēšana 

## Līdzīgo risinājumu pārskats 

| **Serviss** | **Apraksts un novērtējums** |
|----------|--------------------------|
| **Google Maps** | _Google Maps ir viens no populārākajiem maršrutu plānošanass rīkiem pasaulē, kas piedāvā navigācijas un karšu pakalpojumus gan lietotājiem, gan izstrādātājiem caur Direction API. Tas ļauj aprēķināt maršrutus starp vairākiem punktiem, ņemot vērā reāllaika satiksmes apstākļus, attālumu un ceļa veidu. Plusi: 1. Vienkārša integrācija ar citām sistēmām caur REST API. 2. Precīzi un aktuāli ceļu un satiksmes dati no Google infrastruktūras. 3. Nodrošina aprēķinus pēc laika vai attāluma. Minusi: 1. Lietošana virs bezmaksas limita ir maksas pakalpojums (API izmaksas). 2.Nav piemērots liela mēroga loģistikas sistēmām bez papildu algoritmiskiem risinājumiem._ | 
| **Route4Me** | _Route4Me ir profesionāla maršrutu optimizācijas platforma, kas paredzēta uzņēmumiem ar piegādes, loģistikas un transporta vajadzībām. Tā nodrošina automātisku vairāku pieturas punktu maršrutu plānošanu un optimizāciju, samazinot kopējo braukšanas laiku un degvielas izmaksas. Plusi: 1. Atbalsta integrāciju ar ārējām sistēmām (piem., ERP, CRM, e-komercijas platformas), 2. Piedāvā reāllaika pārvaldību, vadītāju atrašanās vietu uzraudzību un piegādes statusa sekošanu. Minusi: 1. Komerciāls risinājums, kam nepieciešams abonements. 2. Nav pilnībā atvērta koda risinājums (ierobežota pielāgošana)._ |
| **OSMR** | _OSRM ir atvērtā koda maršrutēšanas dzinējs, kas izmanto OpenStreetMap (OSM) datus. Tas ļauj aprēķināt maršrutus starp punktiem ļoti ātri, izmantojot Dijkstra un Contraction Hierarchies algoritmus, kas nodrošina lielu ātrumu un precizitāti. Plusi: 1. Pilnībā bezmaksas un atvērtā koda. 2. Darbojas lokāli, bez ārējiem API ierobežojumiem. 3. Ļoti ātrs aprēķinu veikšanas laiks — piemērots lielām sistēmām. Minusi: 1. Nepieciešama servera uzstādīšana un tehniskā konfigurācija. 2. Nav lietotāja interfeisa — jāintegrē ar citiem risinājumiem. 3. Nepiedāvā pilnu piegādes flotes optimizāciju (VRP) bez papildu moduļiem._ |
| **RouteXL** | _RouteXL ir tiešsaistes maršrutu optimizācijas rīks, kas paredzēts maziem un vidējiem uzņēmumiem, kuriem nepieciešams ātri izplānot piegādes maršrutus vairākiem klientiem. Tas izmanto optimizācijas algoritmus, lai atrastu efektīvāko secību pieturas punktiem. Plusi: 1. Piedāvā bezmaksas versiju ar ierobežotu pieturu skaitu. 2.Vienkārši lietojams tīmekļa rīks ar vizuālu kartes interfeisu. 3. Ļauj importēt adreses no failiem vai kartes. Minusi: 1. Ierobežots maksimālais punktu skaits bezmaksas versijā (līdz 20). 2. Atkarīgs no interneta un RouteXL serveru pieejamības. 3. Nav piemērots lieliem transporta tīkliem._ | 
| **OptimoRoute** | _OptimoRoute ir komerciāla maršrutu optimizācijas platforma, kas paredzēta piegādes un servisa uzņēmumiem. Tā plāno maršrutus vairākiem transportlīdzekļiem, ņemot vērā piegādes laikus, attālumus, klientu prioritātes un transportlīdzekļu kapacitāti. Plusi: 1. Integrējams ar ERP un e-komercijas sistēmām (piem., Shopify, WooCommerce). 2. Piedāvā reāllaika uzraudzību un vadītāju atrašanās vietas izsekošanu. 3. Nodrošina maršrutu optimizāciju vairākām dienām uz priekšu. Minusi: 1. Komerciāls risinājums (abonēšanas maksa). 2. Nav atvērtā koda, ierobežota pielāgošana._|

## Konceptu modelis

<img width="928" height="306" alt="image" src="https://github.com/user-attachments/assets/d1b1a2fa-319e-42f4-af8c-369c5085698b" />

```plantuml
@startuml
left to right direction
skinparam class {
  Shadowing false
  RoundCorner 6
}

title Preču piegādes sistēmas konceptuālais modelis

class Klients {
  id : String
  vārds : String
  e_pasts : String
  adrese : String
  tālrunis : String
}

class Pasūtījums {
  id : String
  svarsKg: Float
  kopējāCena: Float
}

class Piegāde {
  id : String
  adrese : String
  datums : Date
  laiksNo : Time
  laiksLīdz : Time
  statuss : String
}

class Maršruts {
  id : String
  kopējaisAttālums : Float
  sākumaPunkts: String
  galamērķis : String
}

class Kurjers {
  id : String
  vārds : String
  pieejamība : Boolean
}

Klients "1" --> "1..*" Pasūtījums : veic / ir saistīts ar
Pasūtījums "1" --> "1" Piegāde : ir saistīts ar
Piegāde "1" --> "1" Maršruts : izmanto
Kurjers "1" --> "1..*" Piegāde : izpilda

@enduml


