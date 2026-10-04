
/* =========================================================
   STAMMDATEN UND BEISPIELDATEN
   ========================================================= */
const B=[
 {id:'liq',name:'Konto & Tagesgeld',c:'--s6',eq:false},
 {id:'bonds',name:'Anleihen',c:'--s7',eq:false},
 {id:'core',name:'Welt-ETFs',c:'--s1',eq:true},
 {id:'hdy',name:'Dividenden-ETFs',c:'--s2',eq:true},
 {id:'single',name:'Einzelaktien',c:'--s3',eq:true},
 {id:'bdc',name:'BDCs & REITs',c:'--s4',eq:true},
 {id:'ndq',name:'Nasdaq-ETF',c:'--s5',eq:true}
];
const BN=Object.fromEntries(B.map(b=>[b.id,b]));
/* Beispiel-Stammdaten: Baustein, Fonds ja/nein, laufende Kosten nur wo eine Quelle vorliegt.
   Unbekannte Symbole bekommen keinen Baustein und keine Kosten. */
const STAMM={
 'IQQW.DE':{bucket:'core',fund:true,ter:0.50,terSrc:'Finanzfluss, Abruf 04.10.2026'},
 'K0MR.DE':{bucket:'core',fund:true,ter:0.45,terSrc:'finanzen.net, Abruf 04.10.2026'},
 'EQQQ.DE':{bucket:'ndq',fund:true,ter:0.30,terSrc:'extraETF, Abruf 04.10.2026'},
 '9A2.F':{bucket:'bdc',fund:false},'13M.F':{bucket:'bdc',fund:false},'WX4.F':{bucket:'bdc',fund:false},'RY6.F':{bucket:'bdc',fund:false},
 'PEP.DE':{bucket:'single',fund:false},'JNJ.DE':{bucket:'single',fund:false},'CCC3.DE':{bucket:'single',fund:false},'PRG.DE':{bucket:'single',fund:false},
 'MSF.DE':{bucket:'single',fund:false},'3V64.DE':{bucket:'single',fund:false},'NOV.DE':{bucket:'single',fund:false},
 'GOOG':{bucket:'single',fund:false},'AAPL':{bucket:'single',fund:false},'MA':{bucket:'single',fund:false}
};
const DEMO_CSV=`Bestand;Name;Symbol;Kurs;Marktwert;Anteil in %;Notiz
"";Summe;;;20.520,45;100,00;
40;MSCI World USD (Dist);IQQW.DE;93,156;3.726,24;18,16;
150;Gerd Kommer Multifactor Equity USD (Dist);K0MR.DE;14,414;2.162,10;10,54;
2;EQQQ Nasdaq 100 USD (Dist);EQQQ.DE;669,1;1.338,20;6,52;
60;Ares Capital;9A2.F;16,674;1.000,44;4,88;
20;Main Street Capital;13M.F;48,675;973,50;4,74;
25;Omega Healthcare Investors;WX4.F;40,01;1.000,25;4,87;
20;Realty Income;RY6.F;47,94;958,80;4,67;
10;PepsiCo;PEP.DE;111,6001678;1.116,00;5,44;
15;Coca-Cola;CCC3.DE;75,9;1.138,50;5,55;
8;Procter & Gamble;PRG.DE;128,3609167;1.026,89;5,00;
5;Johnson & Johnson;JNJ.DE;228,3501247;1.141,75;5,56;
20;Novo-Nordisk (B);NOV.DE;33,21;664,20;3,24;
4;Microsoft;MSF.DE;457,35;1.829,40;8,92;
4;Visa;3V64.DE;319,2;1.276,80;6,22;
2;Apple;AAPL;333,69;667,38;3,25;
"";Verrechnungskonto;;;500,00;2,44;
"";Summe;;;20.520,45;100,00;`;

/* Erfundene Musterumsätze passend zum Musterdepot (erzeugt mit scripts/gen_demo_tx.py) */
const DEMO_TX=`Datum;Typ;Wert;Buchungswährung;Gebühren;Steuern;Stück;ISIN;Ticker-Symbol;Wertpapiername;Notiz
2023-01-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-02-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-03-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-04-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-04-23;Kauf;901,89;EUR;1,00;0,00;13;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2023-05-10;Kauf;943,00;EUR;1,00;0,00;20;GB00BVZK7T90;UNVB.DE;Unilever;
2023-05-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-05-16;Kauf;345,37;EUR;1,00;0,00;20;US04010L1035;9A2.F;Ares Capital;
2023-05-17;Kauf;562,22;EUR;1,00;0,00;8;US1912161007;CCC3.DE;Coca-Cola;
2023-06-07;Kauf;1070,78;EUR;1,00;0,00;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2023-06-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-06-22;Kauf;649,90;EUR;1,00;0,00;2;US0378331005;AAPL;Apple;
2023-06-28;Dividende;3,41;EUR;0,00;0,77;13;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2023-06-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2023-06-28;Dividende;5,08;EUR;0,00;1,82;20;US04010L1035;9A2.F;Ares Capital;
2023-06-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2023-06-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2023-07-01;Kauf;416,40;EUR;1,00;0,00;2;US4781601046;JNJ.DE;Johnson & Johnson;
2023-07-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-08-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-09-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-09-25;Kauf;310,50;EUR;1,00;0,00;20;US04010L1035;9A2.F;Ares Capital;
2023-09-28;Dividende;3,41;EUR;0,00;0,77;13;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2023-09-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2023-09-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2023-09-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2023-09-28;Dividende;2,32;EUR;0,00;0,83;2;US4781601046;JNJ.DE;Johnson & Johnson;
2023-09-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2023-09-28;Dividende;6,18;EUR;0,00;2,22;20;GB00BVZK7T90;UNVB.DE;Unilever;
2023-10-14;Kauf;392,57;EUR;1,00;0,00;12;US6819361006;WX4.F;Omega Healthcare Investors;
2023-10-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-11-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-11-19;Kauf;1087,10;EUR;1,00;0,00;13;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2023-12-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2023-12-28;Dividende;6,82;EUR;0,00;1,54;26;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2023-12-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2023-12-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2023-12-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2023-12-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2023-12-28;Dividende;2,32;EUR;0,00;0,83;2;US4781601046;JNJ.DE;Johnson & Johnson;
2023-12-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2024-01-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-02-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-03-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-03-28;Dividende;6,82;EUR;0,00;1,54;26;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2024-03-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2024-03-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2024-03-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2024-03-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2024-03-28;Dividende;2,32;EUR;0,00;0,83;2;US4781601046;JNJ.DE;Johnson & Johnson;
2024-03-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2024-03-29;Kauf;792,73;EUR;1,00;0,00;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2024-04-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-05-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-05-28;Kauf;612,97;EUR;1,00;0,00;3;US4781601046;JNJ.DE;Johnson & Johnson;
2024-06-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-06-28;Dividende;6,82;EUR;0,00;1,54;26;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2024-06-28;Dividende;3,65;EUR;0,00;0,83;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2024-06-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2024-06-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2024-06-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2024-06-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2024-06-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2024-06-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2024-07-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-08-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-08-26;Kauf;243,57;EUR;1,00;0,00;7;DK0062498333;NOV.DE;Novo-Nordisk (B);
2024-09-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-09-28;Dividende;6,82;EUR;0,00;1,54;26;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2024-09-28;Dividende;3,65;EUR;0,00;0,83;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2024-09-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2024-09-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2024-09-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2024-09-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2024-09-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2024-09-28;Dividende;0,79;EUR;0,00;0,28;7;DK0062498333;NOV.DE;Novo-Nordisk (B);
2024-09-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2024-10-07;Kauf;434,80;EUR;1,00;0,00;10;US7561091049;RY6.F;Realty Income;
2024-10-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-10-19;Kauf;395,61;EUR;1,00;0,00;3;US7427181091;PRG.DE;Procter & Gamble;
2024-11-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-12-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2024-12-15;Kauf;1409,92;EUR;1,00;0,00;4;US5949181045;MSF.DE;Microsoft;
2024-12-28;Dividende;6,82;EUR;0,00;1,54;26;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2024-12-28;Dividende;3,65;EUR;0,00;0,83;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2024-12-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2024-12-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2024-12-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2024-12-28;Dividende;4,46;EUR;0,00;1,60;10;US7561091049;RY6.F;Realty Income;
2024-12-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2024-12-28;Dividende;1,69;EUR;0,00;0,61;3;US7427181091;PRG.DE;Procter & Gamble;
2024-12-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2024-12-28;Dividende;0,79;EUR;0,00;0,28;7;DK0062498333;NOV.DE;Novo-Nordisk (B);
2024-12-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2024-12-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2025-01-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-02-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-03-12;Verkauf;1095,00;EUR;1,00;40,09;20;GB00BVZK7T90;UNVB.DE;Unilever;
2025-03-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-03-28;Dividende;6,82;EUR;0,00;1,54;26;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2025-03-28;Dividende;3,65;EUR;0,00;0,83;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2025-03-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2025-03-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2025-03-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2025-03-28;Dividende;4,46;EUR;0,00;1,60;10;US7561091049;RY6.F;Realty Income;
2025-03-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2025-03-28;Dividende;1,69;EUR;0,00;0,61;3;US7427181091;PRG.DE;Procter & Gamble;
2025-03-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2025-03-28;Dividende;0,79;EUR;0,00;0,28;7;DK0062498333;NOV.DE;Novo-Nordisk (B);
2025-03-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2025-03-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2025-04-02;Kauf;1097,40;EUR;1,00;0,00;14;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2025-04-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-05-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-06-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-06-28;Dividende;10,49;EUR;0,00;2,37;40;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2025-06-28;Dividende;3,65;EUR;0,00;0,83;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2025-06-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2025-06-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2025-06-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2025-06-28;Dividende;4,46;EUR;0,00;1,60;10;US7561091049;RY6.F;Realty Income;
2025-06-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2025-06-28;Dividende;1,69;EUR;0,00;0,61;3;US7427181091;PRG.DE;Procter & Gamble;
2025-06-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2025-06-28;Dividende;0,79;EUR;0,00;0,28;7;DK0062498333;NOV.DE;Novo-Nordisk (B);
2025-06-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2025-06-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2025-07-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-07-22;Kauf;177,44;EUR;1,00;0,00;7;DK0062498333;NOV.DE;Novo-Nordisk (B);
2025-08-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-08-25;Kauf;324,21;EUR;1,00;0,00;3;US7427181091;PRG.DE;Procter & Gamble;
2025-09-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-09-28;Dividende;10,49;EUR;0,00;2,37;40;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2025-09-28;Dividende;3,65;EUR;0,00;0,83;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2025-09-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2025-09-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2025-09-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2025-09-28;Dividende;4,46;EUR;0,00;1,60;10;US7561091049;RY6.F;Realty Income;
2025-09-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2025-09-28;Dividende;3,40;EUR;0,00;1,21;6;US7427181091;PRG.DE;Procter & Gamble;
2025-09-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2025-09-28;Dividende;1,58;EUR;0,00;0,56;14;DK0062498333;NOV.DE;Novo-Nordisk (B);
2025-09-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2025-09-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2025-10-12;Kauf;1097,98;EUR;1,00;0,00;4;US92826C8394;3V64.DE;Visa;
2025-10-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-11-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-11-19;Kauf;934,06;EUR;1,00;0,00;75;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2025-12-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2025-12-28;Dividende;10,49;EUR;0,00;2,37;40;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2025-12-28;Dividende;7,30;EUR;0,00;1,65;150;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2025-12-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2025-12-28;Dividende;10,17;EUR;0,00;3,64;40;US04010L1035;9A2.F;Ares Capital;
2025-12-28;Dividende;5,29;EUR;0,00;1,89;12;US6819361006;WX4.F;Omega Healthcare Investors;
2025-12-28;Dividende;4,46;EUR;0,00;1,60;10;US7561091049;RY6.F;Realty Income;
2025-12-28;Dividende;2,98;EUR;0,00;1,07;8;US1912161007;CCC3.DE;Coca-Cola;
2025-12-28;Dividende;3,40;EUR;0,00;1,21;6;US7427181091;PRG.DE;Procter & Gamble;
2025-12-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2025-12-28;Dividende;1,58;EUR;0,00;0,56;14;DK0062498333;NOV.DE;Novo-Nordisk (B);
2025-12-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2025-12-28;Dividende;1,52;EUR;0,00;0,54;4;US92826C8394;3V64.DE;Visa;
2025-12-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2026-01-02;Gebühren;4,90;EUR;0,00;0,00;;;;;Depotgebühr
2026-01-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-02-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-02-28;Kauf;400,25;EUR;1,00;0,00;13;US6819361006;WX4.F;Omega Healthcare Investors;
2026-03-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-03-15;Kauf;470,57;EUR;1,00;0,00;7;US1912161007;CCC3.DE;Coca-Cola;
2026-03-18;Kauf;305,26;EUR;1,00;0,00;20;US04010L1035;9A2.F;Ares Capital;
2026-03-28;Dividende;10,49;EUR;0,00;2,37;40;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2026-03-28;Dividende;7,30;EUR;0,00;1,65;150;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2026-03-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2026-03-28;Dividende;15,25;EUR;0,00;5,46;60;US04010L1035;9A2.F;Ares Capital;
2026-03-28;Dividende;11,01;EUR;0,00;3,94;25;US6819361006;WX4.F;Omega Healthcare Investors;
2026-03-28;Dividende;4,46;EUR;0,00;1,60;10;US7561091049;RY6.F;Realty Income;
2026-03-28;Dividende;5,59;EUR;0,00;2,00;15;US1912161007;CCC3.DE;Coca-Cola;
2026-03-28;Dividende;3,40;EUR;0,00;1,21;6;US7427181091;PRG.DE;Procter & Gamble;
2026-03-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2026-03-28;Dividende;1,58;EUR;0,00;0,56;14;DK0062498333;NOV.DE;Novo-Nordisk (B);
2026-03-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2026-03-28;Dividende;1,52;EUR;0,00;0,54;4;US92826C8394;3V64.DE;Visa;
2026-03-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2026-03-29;Kauf;454,06;EUR;1,00;0,00;10;US7561091049;RY6.F;Realty Income;
2026-03-29;Kauf;520,41;EUR;1,00;0,00;5;US7134481081;PEP.DE;PepsiCo;
2026-04-10;Kauf;415,18;EUR;1,00;0,00;10;US56035L1044;13M.F;Main Street Capital;
2026-04-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-04-20;Kauf;471,33;EUR;1,00;0,00;5;US7134481081;PEP.DE;PepsiCo;
2026-04-28;Kauf;508,27;EUR;1,00;0,00;10;US56035L1044;13M.F;Main Street Capital;
2026-04-28;Kauf;206,89;EUR;1,00;0,00;2;US7427181091;PRG.DE;Procter & Gamble;
2026-05-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-06-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-06-15;Kauf;171,96;EUR;1,00;0,00;6;DK0062498333;NOV.DE;Novo-Nordisk (B);
2026-06-28;Dividende;10,49;EUR;0,00;2,37;40;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2026-06-28;Dividende;7,30;EUR;0,00;1,65;150;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2026-06-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2026-06-28;Dividende;15,25;EUR;0,00;5,46;60;US04010L1035;9A2.F;Ares Capital;
2026-06-28;Dividende;9,89;EUR;0,00;3,54;20;US56035L1044;13M.F;Main Street Capital;
2026-06-28;Dividende;11,01;EUR;0,00;3,94;25;US6819361006;WX4.F;Omega Healthcare Investors;
2026-06-28;Dividende;8,93;EUR;0,00;3,20;20;US7561091049;RY6.F;Realty Income;
2026-06-28;Dividende;6,61;EUR;0,00;2,37;10;US7134481081;PEP.DE;PepsiCo;
2026-06-28;Dividende;5,59;EUR;0,00;2,00;15;US1912161007;CCC3.DE;Coca-Cola;
2026-06-28;Dividende;4,52;EUR;0,00;1,62;8;US7427181091;PRG.DE;Procter & Gamble;
2026-06-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2026-06-28;Dividende;2,25;EUR;0,00;0,81;20;DK0062498333;NOV.DE;Novo-Nordisk (B);
2026-06-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2026-06-28;Dividende;1,52;EUR;0,00;0,54;4;US92826C8394;3V64.DE;Visa;
2026-06-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;
2026-07-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-08-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-09-15;Einlage;500,00;EUR;0,00;0,00;;;;;
2026-09-28;Dividende;10,49;EUR;0,00;2,37;40;IE00B0M62Q58;IQQW.DE;MSCI World USD (Dist);
2026-09-28;Dividende;7,30;EUR;0,00;1,65;150;IE000FPWSL69;K0MR.DE;Gerd Kommer Multifactor Equity USD (Dist);
2026-09-28;Dividende;1,26;EUR;0,00;0,28;2;IE0032077012;EQQQ.DE;EQQQ Nasdaq 100 USD (Dist);
2026-09-28;Dividende;15,25;EUR;0,00;5,46;60;US04010L1035;9A2.F;Ares Capital;
2026-09-28;Dividende;9,89;EUR;0,00;3,54;20;US56035L1044;13M.F;Main Street Capital;
2026-09-28;Dividende;11,01;EUR;0,00;3,94;25;US6819361006;WX4.F;Omega Healthcare Investors;
2026-09-28;Dividende;8,93;EUR;0,00;3,20;20;US7561091049;RY6.F;Realty Income;
2026-09-28;Dividende;6,61;EUR;0,00;2,37;10;US7134481081;PEP.DE;PepsiCo;
2026-09-28;Dividende;5,59;EUR;0,00;2,00;15;US1912161007;CCC3.DE;Coca-Cola;
2026-09-28;Dividende;4,52;EUR;0,00;1,62;8;US7427181091;PRG.DE;Procter & Gamble;
2026-09-28;Dividende;5,80;EUR;0,00;2,08;5;US4781601046;JNJ.DE;Johnson & Johnson;
2026-09-28;Dividende;2,25;EUR;0,00;0,81;20;DK0062498333;NOV.DE;Novo-Nordisk (B);
2026-09-28;Dividende;2,17;EUR;0,00;0,78;4;US5949181045;MSF.DE;Microsoft;
2026-09-28;Dividende;1,52;EUR;0,00;0,54;4;US92826C8394;3V64.DE;Visa;
2026-09-28;Dividende;0,57;EUR;0,00;0,20;2;US0378331005;AAPL;Apple;`;

/* Quellen: Organisation, Dokument, Berichtsperiode, Datum, Link */
const S={
 arcc:{org:'Ares Capital',doc:'Ergebnismeldung (SEC 8-K)',per:'Q2 2026',date:'29.07.2026',url:'https://www.sec.gov/Archives/edgar/data/0001287750/000162828026050303/arccq2-2026exhibit991.htm'},
 arccQ1:{org:'Ares Capital',doc:'Ergebnismeldung (SEC 8-K)',per:'Q1 2026',date:'28.04.2026',url:'https://www.sec.gov/Archives/edgar/data/0001287750/000162828026027685/arccq1-2026exhibit991.htm'},
 arccCall:{org:'MarketBeat',doc:'Zusammenfassung Telefonkonferenz',per:'Q2 2026',date:'29.07.2026',url:'https://www.marketbeat.com/instant-alerts/ares-capital-q2-earnings-call-highlights-2026-07-29/'},
 main:{org:'Main Street Capital',doc:'Ergebnismeldung (SEC 8-K)',per:'Q2 2026',date:'06.08.2026',url:'https://www.sec.gov/Archives/edgar/data/0001396440/000139644026000090/main-q22026xearningsreleas.htm'},
 mainQ:{org:'Main Street Capital',doc:'Quartalsbericht 10-Q, Anhang M',per:'Q1 2026',date:'05.2026',url:'https://www.sec.gov/Archives/edgar/data/0001396440/000139644026000073/main-20260331.htm'},
 mainDiv:{org:'Main Street Capital',doc:'Dividendenmeldung',per:'Q4 2026',date:'04.08.2026',url:'https://www.mainstcapital.com/investors/news-events/press-releases/detail/2768'},
 ohi:{org:'Omega Healthcare',doc:'Ergebnismeldung (SEC 8-K)',per:'Q2 2026',date:'29.07.2026',url:'https://www.sec.gov/Archives/edgar/data/0000888491/000088849126000022/ohi-20260729xex99d1.htm'},
 ohiCall:{org:'GuruFocus',doc:'Zusammenfassung Telefonkonferenz',per:'Q2 2026',date:'30.07.2026',url:'https://www.gurufocus.com/stock/OHI/transcripts/8992016'},
 o:{org:'Realty Income',doc:'Ergebnismeldung und Zusatzinformationen',per:'Q2 2026',date:'08.2026',url:'https://www.realtyincome.com/sites/realty-income/files/2026-08/realty-income-earnings-release-and-supplemental-information-q2-2026.pdf'},
 oZ:{org:'Zacks',doc:'Analyseartikel',per:'Q2 2026',date:'08.2026',url:'https://www.zacks.com/stock/news/2972865/is-realty-income-stock-worth-holding-after-its-q2-earnings-results'},
 pep:{org:'PepsiCo',doc:'Ergebnismeldung (SEC 8-K)',per:'Q2 2026',date:'09.07.2026',url:'https://www.sec.gov/Archives/edgar/data/0000077476/000007747626000037/q220268-kxexhibit991.htm'},
 jnj:{org:'Johnson & Johnson',doc:'Ergebnismeldung (SEC 8-K)',per:'Q2 2026',date:'15.07.2026',url:'https://www.sec.gov/Archives/edgar/data/0000200406/000020040626000146/a2026q2exhibit991.htm'},
 ko:{org:'Pulse 2.0',doc:'Bericht zur Ergebnismeldung',per:'Q2 2026',date:'28.07.2026',url:'https://pulse2.com/coca-cola-q2-revenue-rises-7-to-13-4-billion-as-company-raises-2026-guidance/'},
 pg:{org:'Procter & Gamble',doc:'Ergebnismeldung (SEC 8-K)',per:'Q4 GJ 2026',date:'29.07.2026',url:'https://www.sec.gov/Archives/edgar/data/0000080424/000008042426000093/fy2526q4amj8-kexhibit991.htm'},
 msft:{org:'Fierce Network',doc:'Bericht zur Ergebnismeldung',per:'Q4 GJ 2026',date:'07.2026',url:'https://www.fierce-network.com/cloud/microsoft-azure-crosses-100b-mark-growth-hits-four-year-high'},
 v:{org:'MarketBeat',doc:'Zusammenfassung Telefonkonferenz',per:'Q3 GJ 2026',date:'28.07.2026',url:'https://www.marketbeat.com/instant-alerts/visa-q3-earnings-call-highlights-2026-07-28/'},
 novo:{org:'Novo Nordisk',doc:'Halbjahresbericht (SEC 6-K)',per:'H1 2026',date:'08.2026',url:'https://www.sec.gov/Archives/edgar/data/0000353278/000035327826000023/caq22026.htm'},
 novoQ2:{org:'RTTNews',doc:'Bericht zur Ergebnismeldung',per:'Q2 2026',date:'08.2026',url:'https://www.rttnews.com/3675609/novo-nordisk-q2-net-sales-improve.aspx'},
 novoFeb:{org:'MarketScreener',doc:'Bericht zur Jahresmeldung',per:'GJ 2025',date:'02.2026',url:'https://uk.marketscreener.com/news/novo-nordisk-warns-of-lower-sales-and-profit-for-2026-shares-plunge-in-u-s-update-ce7e5bd3de8ff226'},
 iqqw:{org:'Finanzfluss',doc:'ETF-Profil IE00B0M62Q58',per:'Stand Abruf',date:'04.10.2026',url:'https://www.finanzfluss.de/informer/etf/ie00b0m62q58/'},
 kommer:{org:'Parqet',doc:'ETF-Profil (thesaurierende Klasse)',per:'Bestände 19.06.2026',date:'Abruf 04.10.2026',url:'https://app.parqet.com/etf/l-g-gerd-kommer-multifactor-equity-ucits-etf-usd-accumulating-IE0001UQQ933'},
 kommerTer:{org:'finanzen.net',doc:'ETF-Profil IE000FPWSL69',per:'Stand Abruf',date:'04.10.2026',url:'https://www.finanzen.net/etf/lg-gerd-kommer-multifactor-equity-etf-ie000fpwsl69/xetra'},
 eqqq:{org:'extraETF',doc:'ETF-Profil IE0032077012',per:'Stand 24.07.2026',date:'Abruf 04.10.2026',url:'https://extraetf.com/de/etf-profile/IE0032077012'},
 eqqqFF:{org:'Finanzfluss',doc:'ETF-Profil IE0032077012',per:'Stand Abruf',date:'04.10.2026',url:'https://www.finanzfluss.de/informer/etf/ie0032077012/'}
};

/* Einordnungen (Beispieldaten, manuell recherchiert am 04.10.2026).
   kind: metric = Kennzahl aus Bericht, company = Aussage/Prognose des Unternehmens.
   Regeln: type goal (Bedingung erwünscht) oder risk (Risiko). Status goal: met|not_met|open|np, risk: occurred|not_occurred|open|np. */
const INFO={
 '9A2.F':{interp:'Die Kreditqualität ist laut Bericht stabil. Die laufenden Kernerträge lagen im zweiten Quartal aber knapp unter der Dividende.',
  changes:{cmp:'Q2 2026 gegenüber Q1 2026',items:[
   {kind:'metric',t:'Core EPS unverändert bei 0,47 $ je Aktie.',src:['arcc','arccQ1']},
   {kind:'company',t:'Dividende für Q3 2026 unverändert bei 0,48 $ je Aktie erklärt.',src:['arcc']}]},
  facts:[
   {kind:'metric',t:'Core EPS 0,47 $ je Aktie (Vorjahresquartal 0,50 $).',src:'arcc'},
   {kind:'metric',t:'Notleidende Kredite: 2,4 % zu Anschaffungskosten, 1,4 % zum Zeitwert.',src:'arccCall'},
   {kind:'metric',t:'Verschuldung netto 1,12-fach Eigenkapital.',src:'arccCall'}],
  rules:[
   {type:'goal',q:'Decken die Kernerträge die reguläre Dividende?',metric:'Core EPS je Aktie im Vergleich zur regulären Quartalsdividende',cond:'Core EPS mindestens 0,48 $',per:'Q2 2026',obs:'0,47 $',prev:'Q1 2026: 0,47 $',status:'not_met',src:'arcc',next:'Bericht Q3 2026, Termin geschätzt Ende Oktober',why:'Liegen die Kernerträge dauerhaft unter der Dividende, muss die Differenz aus früheren Überschüssen kommen.'},
   {type:'risk',q:'Liegt der Anteil notleidender Kredite über 3 %?',metric:'Notleidende Kredite zu Anschaffungskosten',cond:'über 3,0 %',per:'Q2 2026',obs:'2,4 %',prev:null,status:'not_occurred',src:'arccCall',next:'Bericht Q3 2026',why:'Das Management nennt rund 3 % als eigenen langjährigen Durchschnitt; die Schwelle ist eine Festlegung von Depotfokus.'}],
  themes:[{t:'Zinsniveau',why:'Ein großer Teil der Kredite ist variabel verzinst. Sinkende Zinsen verringern die Zinserträge. Nicht automatisch prüfbar.'}]},
 '13M.F':{interp:'Die ausschüttbaren Erträge lagen deutlich über der regulären Dividende, der Substanzwert je Aktie ist gestiegen.',
  changes:{cmp:'Q2 2026 gegenüber Q1 2026',items:[
   {kind:'metric',t:'Substanzwert (NAV) je Aktie von 33,46 $ auf 33,92 $.',src:['main']},
   {kind:'company',t:'Reguläre Monatsdividende ab Q3 2026 von 0,26 $ auf 0,265 $ je Aktie.',src:['mainQ']}]},
  facts:[
   {kind:'metric',t:'Ausschüttbare Erträge (DNII) 1,04 $ je Aktie im Quartal.',src:'main'},
   {kind:'company',t:'Monatsdividende 0,265 $ für Oktober bis Dezember 2026 erklärt, dazu 0,30 $ Sonderdividende im September 2026.',src:'mainDiv'},
   {kind:'metric',t:'Schlusskurs 55,75 $ am 03.08.2026 laut Dividendenmeldung; das entspricht rund dem 1,6-Fachen des NAV.',src:'mainDiv'}],
  rules:[
   {type:'goal',q:'Decken die ausschüttbaren Erträge die reguläre Dividende?',metric:'DNII je Aktie im Vergleich zur regulären Quartalsdividende',cond:'DNII mindestens reguläre Dividende',per:'Q2 2026',obs:'1,04 $ zu 0,78 $',prev:null,status:'met',src:'main',next:'Bericht Q3 2026, Termin geschätzt Anfang November',why:'Zeigt, ob die reguläre Dividende aus laufenden Erträgen bezahlt wird.'},
   {type:'risk',q:'Sinkt der Substanzwert je Aktie gegenüber dem Vorquartal?',metric:'NAV je Aktie',cond:'niedriger als im Vorquartal',per:'Q2 2026',obs:'33,92 $',prev:'Q1 2026: 33,46 $',status:'not_occurred',src:'main',next:'Bericht Q3 2026',why:'Ein sinkender NAV kann auf Wertberichtigungen im Kreditportfolio hindeuten.'}],
  themes:[{t:'Bewertungsaufschlag',why:'Der Kurs liegt deutlich über dem Substanzwert. Schrumpft der Aufschlag, kann der Kurs fallen, ohne dass sich das Geschäft verschlechtert.'},{t:'Konjunktur im Mittelstand',why:'Die Kreditnehmer sind kleine und mittlere Unternehmen. Nicht automatisch prüfbar.'}]},
 'WX4.F':{interp:'Die Erträge decken die Dividende mit Abstand; die Mieter erwirtschaften ihre Miete laut Unternehmen so gut wie seit Jahren nicht.',
  changes:{cmp:'Q2 2026 gegenüber Q1 2026',items:[
   {kind:'company',t:'Quartalsdividende um 0,01 $ auf 0,68 $ je Aktie erhöht.',src:['ohi']},
   {kind:'company',t:'Jahresprognose AFFO angehoben, Mitte jetzt 3,24 $ je Aktie.',src:['ohi']}]},
  facts:[
   {kind:'metric',t:'AFFO 0,83 $ je Aktie im Quartal.',src:'ohi'},
   {kind:'metric',t:'Mietdeckung der Betreiber (EBITDA) 1,65-fach; Verschuldung 3,3-fach.',src:'ohiCall'}],
  rules:[
   {type:'goal',q:'Deckt der AFFO je Aktie die Dividende?',metric:'AFFO je Aktie im Vergleich zur Quartalsdividende',cond:'AFFO mindestens Dividende',per:'Q2 2026',obs:'0,83 $ zu 0,68 $',prev:null,status:'met',src:'ohi',next:'Bericht Q3 2026, Termin geschätzt Ende Oktober',why:'Zeigt, wie viel Spielraum zwischen Erträgen und Ausschüttung liegt.'},
   {type:'risk',q:'Fällt die Mietdeckung der Betreiber unter 1,5-fach?',metric:'EBITDA-Mietdeckung der Betreiber',cond:'unter 1,5-fach',per:'Q2 2026',obs:'1,65-fach',prev:null,status:'not_occurred',src:'ohiCall',next:'Bericht Q3 2026',why:'Je niedriger die Deckung, desto eher geraten Betreiber mit der Miete in Rückstand. Schwelle: Festlegung von Depotfokus.'}],
  themes:[{t:'Staatliche Pflegevergütung in den USA',why:'Änderungen bei Medicare und Medicaid wirken direkt auf die Betreiber. Nicht automatisch prüfbar.'}]},
 'RY6.F':{interp:'Ausschüttung gut gedeckt und Auslastung hoch; die Dividende je Aktie wächst derzeit langsam.',
  changes:{cmp:'Q2 2026 gegenüber der vorherigen Prognose',items:[
   {kind:'company',t:'AFFO-Prognose 2026 von 4,41–4,44 $ auf 4,44–4,45 $ je Aktie angehoben.',src:['o']}]},
  facts:[
   {kind:'metric',t:'AFFO 1,09 $ je Aktie im Quartal, plus 3,8 % zum Vorjahr.',src:'o'},
   {kind:'metric',t:'Ausschüttung 74,5 % des AFFO; Auslastung 98,8 %.',src:'o'},
   {kind:'metric',t:'Nettoverschuldung 5,4-fach EBITDAre.',src:'oZ'}],
  rules:[
   {type:'goal',q:'Bleibt die Ausschüttung unter 80 % des AFFO?',metric:'Dividende im Verhältnis zum AFFO',cond:'unter 80 %',per:'Q2 2026',obs:'74,5 %',prev:null,status:'met',src:'o',next:'Bericht Q3 2026, Termin geschätzt Anfang November',why:'Ein Puffer zwischen Erträgen und Ausschüttung erhöht die Tragfähigkeit. Schwelle: Festlegung von Depotfokus.'},
   {type:'risk',q:'Steigt die Nettoverschuldung über 6-fach EBITDAre?',metric:'Nettoverschuldung zu EBITDAre',cond:'über 6,0-fach',per:'Q2 2026',obs:'5,4-fach',prev:null,status:'not_occurred',src:'oZ',next:'Bericht Q3 2026',why:'Höhere Verschuldung macht das Geschäft zinsempfindlicher. Schwelle: Festlegung von Depotfokus.'}],
  themes:[{t:'Langfristzinsen',why:'Steigende Zinsen verteuern die Finanzierung neuer Immobilien. Nicht automatisch prüfbar.'}]},
 'PEP.DE':{interp:'Wachstum im eigenen Prognosekorridor, die operative Kernmarge ist leicht gesunken.',
  changes:{cmp:'Q2 2026 gegenüber der vorherigen Prognose',items:[{kind:'company',t:'Jahresprognose bestätigt: organisches Wachstum 2–4 %, Kern-EPS plus 4–6 %.',src:['pep']}]},
  facts:[
   {kind:'metric',t:'Organisches Wachstum 2,4 % im Quartal.',src:'pep'},
   {kind:'metric',t:'Operative Kernmarge 16,8 %, minus 0,4 Prozentpunkte.',src:'pep'}],
  rules:[
   {type:'goal',q:'Liegt das organische Wachstum im eigenen Prognosekorridor?',metric:'Organisches Umsatzwachstum',cond:'mindestens 2 %',per:'Q2 2026',obs:'2,4 %',prev:null,status:'met',src:'pep',next:'Bericht Q3 2026, Termin geschätzt Anfang Oktober',why:'Zeigt, ob das Unternehmen seine eigenen Erwartungen erfüllt.'},
   {type:'risk',q:'Senkt PepsiCo die Jahresprognose?',metric:'Prognose organisches Wachstum 2026',cond:'Senkung gegenüber 2–4 %',per:'Q2 2026',obs:'bestätigt',prev:null,status:'not_occurred',src:'pep',next:'Bericht Q3 2026',why:'Eine Senkung wäre ein Hinweis auf schwächere Nachfrage.'}],
  themes:[]},
 'JNJ.DE':{interp:'Neue Medikamente gleichen den Rückgang bei Stelara aus; das Unternehmen hat die Jahresprognose angehoben.',
  changes:{cmp:'Q2 2026 gegenüber der vorherigen Prognose',items:[{kind:'company',t:'Prognose für das bereinigte EPS um 0,13 $ auf 11,68 $ angehoben.',src:['jnj']}]},
  facts:[
   {kind:'metric',t:'Umsatz 25,3 Mrd. $, plus 6,6 %.',src:'jnj'},
   {kind:'metric',t:'Der Rückgang bei Stelara kostete im Pharmageschäft rund 7,6 Prozentpunkte Wachstum.',src:'jnj'}],
  rules:[
   {type:'risk',q:'Senkt J&J die Jahresprognose?',metric:'Prognose bereinigtes EPS 2026',cond:'unter 11,68 $',per:'Q2 2026',obs:'angehoben auf 11,68 $',prev:null,status:'not_occurred',src:'jnj',next:'Bericht Q3 2026, Termin geschätzt Mitte Oktober',why:'Die Prognose zeigt, wie das Unternehmen selbst das Jahr einschätzt.'}],
  themes:[{t:'Talk-Rechtsstreit',why:'Ausgang und Kosten offener Verfahren sind nicht automatisch prüfbar.'}]},
 'CCC3.DE':{interp:'Mengen und Umsatz sind gewachsen, das Unternehmen hat die Prognose angehoben.',
  changes:{cmp:'Q2 2026 gegenüber der vorherigen Prognose',items:[{kind:'company',t:'Prognose für das vergleichbare EPS-Wachstum von 8–9 % auf 9–10 % angehoben.',src:['ko']}]},
  facts:[
   {kind:'metric',t:'Umsatz 13,4 Mrd. $, organisch plus 6 %.',src:'ko'},
   {kind:'metric',t:'Absatzmenge plus 5 %.',src:'ko'}],
  rules:[
   {type:'goal',q:'Wächst die Absatzmenge?',metric:'Unit case volume',cond:'über 0 %',per:'Q2 2026',obs:'plus 5 %',prev:null,status:'met',src:'ko',next:'Bericht Q3 2026, Termin geschätzt Ende Oktober',why:'Wachstum über Mengen ist weniger anfällig als reines Preiswachstum.'}],
  themes:[{t:'Wechselkurse',why:'Ein großer Teil des Geschäfts liegt außerhalb der USA. Nicht automatisch prüfbar.'}]},
 'PRG.DE':{interp:'Die Absatzmengen stagnieren; für das neue Geschäftsjahr erwartet das Unternehmen kaum Gewinnwachstum.',
  changes:{cmp:'Q4 GJ 2026, neue Prognose GJ 2027',items:[{kind:'company',t:'Prognose GJ 2027: Kern-EPS unverändert bis plus 3 %.',src:['pg']}]},
  facts:[
   {kind:'metric',t:'Organisches Wachstum im Quartal 0 %, im Geschäftsjahr 1 %; Absatzmenge unverändert.',src:'pg'},
   {kind:'company',t:'Rund 1,4 Mrd. $ Gegenwind nach Steuern erwartet, vor allem Rohstoffe, Energie und Transport.',src:'pg'},
   {kind:'company',t:'70. Dividendenerhöhung in Folge im April 2026.',src:'pg'}],
  rules:[
   {type:'goal',q:'Wächst die Absatzmenge wieder?',metric:'Absatzmenge (Volumen)',cond:'über 0 %',per:'Q4 GJ 2026',obs:'0 %',prev:null,status:'not_met',src:'pg',next:'Bericht Q1 GJ 2027, Termin geschätzt Mitte Oktober',why:'Ohne Mengenwachstum hängt das Wachstum allein an Preiserhöhungen.'}],
  themes:[{t:'Rohstoff- und Energiekosten',why:'Wirken direkt auf die Marge. Nicht automatisch prüfbar.'}]},
 'NOV.DE':{interp:'Nach einem gesenkten Ausblick im Februar hat Novo im August den Jahresausblick wieder angehoben.',
  changes:{cmp:'H1 2026 gegenüber Ausblick vom Februar',items:[{kind:'company',t:'Jahresausblick angehoben, nachdem im Februar sinkende Umsätze und Gewinne erwartet wurden.',src:['novoQ2','novoFeb']}]},
  facts:[
   {kind:'company',t:'Zwischendividende 3,75 DKK je Aktie, gezahlt im August 2026.',src:'novo'},
   {kind:'company',t:'Aktienrückkaufprogramm über bis zu 15 Mrd. DKK läuft.',src:'novo'}],
  rules:[
   {type:'risk',q:'Senkt Novo den Jahresausblick erneut?',metric:'Jahresausblick 2026',cond:'Senkung gegenüber August 2026',per:'H1 2026',obs:'angehoben',prev:'Februar 2026: gesenkt',status:'not_occurred',src:'novoQ2',next:'Bericht Q3 2026, Termin geschätzt Anfang November',why:'Der Ausblick war 2026 bereits einmal deutlich gesenkt worden.'},
   {type:'goal',q:'Hält Novo seinen Marktanteil bei Abnehmmitteln?',metric:'Marktanteil',cond:'nicht festgelegt',per:'–',obs:null,prev:null,status:'np',src:null,next:'erst mit einer lizenzierten Marktdatenquelle',why:'Für diese Kennzahl ist keine geprüfte Quelle hinterlegt.'}],
  themes:[{t:'Preisdruck in den USA',why:'Nicht automatisch prüfbar.'}]},
 'MSF.DE':{interp:'Das Cloudgeschäft wächst stark; die Investitionen in Rechenzentren steigen ebenfalls deutlich.',
  changes:{cmp:'kein Vergleich mit einer vorherigen Prüfung hinterlegt',items:[]},
  facts:[
   {kind:'metric',t:'Umsatz 90 Mrd. $, plus 18 %; Azure plus 43 %.',src:'msft'},
   {kind:'company',t:'Investitionen von über 50 Mrd. $ im folgenden Quartal erwartet.',src:'msft'}],
  rules:[
   {type:'goal',q:'Wächst Azure mindestens 30 %?',metric:'Azure-Umsatzwachstum',cond:'mindestens 30 %',per:'Q4 GJ 2026',obs:'43 %',prev:null,status:'met',src:'msft',next:'Bericht Q1 GJ 2027, Termin geschätzt Ende Oktober',why:'Das Cloudwachstum soll die hohen Investitionen tragen. Schwelle: Festlegung von Depotfokus.'}],
  themes:[{t:'Rendite der KI-Investitionen',why:'Ob die Investitionen sich auszahlen, ist nicht automatisch prüfbar.'}]},
 '3V64.DE':{interp:'Umsatz und Zahlungsvolumen wachsen zweistellig, die Prognose wurde angehoben.',
  changes:{cmp:'Q3 GJ 2026 gegenüber der vorherigen Prognose',items:[{kind:'company',t:'Jahresprognose angehoben: Umsatzwachstum im niedrigen zweistelligen Bereich.',src:['v']}]},
  facts:[
   {kind:'metric',t:'Nettoumsatz 11,6 Mrd. $, plus 14 %.',src:'v'},
   {kind:'company',t:'563 Mio. $ Kosten für Stellenabbau verbucht.',src:'v'}],
  rules:[
   {type:'goal',q:'Wachsen die Nettoumsätze zweistellig?',metric:'Nettoumsatzwachstum',cond:'mindestens 10 %',per:'Q3 GJ 2026',obs:'14 %',prev:null,status:'met',src:'v',next:'Bericht Q4 GJ 2026, Termin geschätzt Ende Oktober',why:'Zeigt, ob das Kerngeschäft wie vom Unternehmen erwartet wächst.'}],
  themes:[{t:'Regulierung von Kartengebühren',why:'Gesetzgebung in den USA ist nicht automatisch prüfbar.'}]},
 'IQQW.DE':{etf:{name:'iShares MSCI World UCITS ETF (Dist)',isin:'IE00B0M62Q58',index:'MSCI World, Industrieländer',ter:'0,50 % p. a.',conc:'rund 72,8 % USA',dist:'ausschüttend, quartalsweise',overlap:'nicht verfügbar',stand:'Profil abgerufen am 04.10.2026',src:'iqqw'}},
 'K0MR.DE':{etf:{name:'L&G Gerd Kommer Multifactor Equity UCITS ETF (Dist)',isin:'IE000FPWSL69',index:'Solactive Gerd Kommer Multifactor Equity Index: Industrie- und Schwellenländer, Länder nach Börsenwert und BIP, Faktor-Gewichtung',ter:'0,45 % p. a.',conc:'rund 46 % USA (Bestände der thesaurierenden Klasse, 19.06.2026)',dist:'ausschüttend',overlap:'nicht verfügbar',stand:'Bestände vom 19.06.2026',src:'kommer',terSrc:'kommerTer'}},
 'EQQQ.DE':{etf:{name:'Invesco EQQQ NASDAQ-100 UCITS ETF (Dist)',isin:'IE0032077012',index:'NASDAQ-100, große Nicht-Finanzwerte',ter:'0,30 % p. a.',conc:'zehn größte Positionen rund 45 % (Stand 24.07.2026)',dist:'ausschüttend, quartalsweise',overlap:'nicht verfügbar',stand:'Stand 24.07.2026',src:'eqqq',distSrc:'eqqqFF'}}
};
/* Ausschüttungen: nur hinterlegte Prüfungen. amount je Aktie in Originalwährung. */
const PAY={
 '13M.F':{ccy:'$',items:[{state:'announced',label:'Monatsdividende Okt., Nov., Dez. 2026',amount:0.265,per:'je Monat',src:'mainDiv'}],cover:'met'},
 'RY6.F':{ccy:'$',items:[{state:'estimated',label:'Monatsdividende, abgeleitet aus annualisierter Rate 3,252 $ (Stand Q2 2026)',amount:3.252/12,per:'je Monat',src:'o'}],cover:'met'},
 'WX4.F':{ccy:'$',items:[{state:'announced',label:'Quartalsdividende, erklärt im August 2026',amount:0.68,per:'je Quartal',src:'ohi'},{state:'estimated',label:'Nächste Quartalsdividende, noch nicht erklärt, Termin geschätzt November',amount:null,per:'je Quartal',src:null}],cover:'met'},
 '9A2.F':{ccy:'$',items:[{state:'announced',label:'Dividende Q3 2026, zahlbar 30.09.2026',amount:0.48,per:'je Quartal',src:'arcc'},{state:'estimated',label:'Dividende Q4 2026, noch nicht erklärt',amount:null,per:'je Quartal',src:null}],cover:'not_met'},
 'NOV.DE':{ccy:'DKK',items:[{state:'announced',label:'Zwischendividende, gezahlt im August 2026',amount:3.75,per:'einmalig',src:'novo'},{state:'estimated',label:'Schlussdividende, Höhe und Termin noch nicht erklärt',amount:null,per:'einmalig',src:null}],cover:null}
};
const DEMO_GOALS={liq:0,bonds:0,core:40,hdy:15,single:25,bdc:15,ndq:5};
const ASSUME={liq:[0,2],bonds:[0,2.5],core:[5,1.5],hdy:[4,3.5],single:[4,2.5],bdc:[1,7.6],ndq:[6,0.6]};
const TAX=0.26375;

/* =========================================================
   HILFSFUNKTIONEN
   ========================================================= */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur=(v,d=0)=>(+v).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})+' €';
const num=(v,d=2)=>(+v).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d});
const pct=(v,d=1)=>(v*100).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d})+' %';
const fz=v=>(+v).toLocaleString('de-DE',{maximumFractionDigits:2});
const nowStr=()=>new Date().toLocaleString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
function parseNum(s){s=String(s??'').replace(/["€\s ]|EUR/gi,'');if(!s)return NaN;if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');else if(s.includes(','))s=s.replace(',','.');if(!/^-?\d*\.?\d+(e-?\d+)?$/i.test(s))return NaN;return parseFloat(s)}
function parseInput(v){if(v===''||v==null)return null;const n=parseNum(v);return Number.isFinite(n)?n:NaN}
function load(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function store(k,v){try{if(v==null)localStorage.removeItem(k);else localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}}
let toastT;function toast(t){const el=$('#toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,3200);$('#live').textContent=t}

/* =========================================================
   CSV-PARSER (prüft zuerst, übernimmt nichts)
   ========================================================= */
function splitL(l,d){const o=[];let c='',q=false;for(const ch of l){if(ch==='"'){q=!q;continue}if(ch===d&&!q){o.push(c);c='';continue}c+=ch}o.push(c);return o.map(x=>x.trim())}
function analyzeCSV(text,fileName){
  const st={fileName,error:null,cols:{},positions:[],accounts:[],skipped:[],fileSum:null,kind:'holdings'};
  const lines=String(text||'').replace(/^﻿/,'').split(/\r?\n/);
  const nonEmpty=lines.map((l,i)=>({l,i:i+1})).filter(x=>x.l.trim());
  if(nonEmpty.length<2){st.error='Die Datei enthält keine Kopfzeile mit Daten.';return st}
  const h=nonEmpty[0].l;const d=[';','\t',','].sort((a,b)=>h.split(b).length-h.split(a).length)[0];
  const head=splitL(h,d);const low=head.map(x=>x.toLowerCase());const col=re=>low.findIndex(x=>re.test(x));
  if(col(/^datum|^date/)>=0&&col(/^typ|^type/)>=0)return analyzeTx(nonEmpty,d,head,fileName);
  const ci={name:col(/^name$|bezeichnung|wertpapier/),value:col(/marktwert|kurswert|^wert$/),qty:col(/^bestand|stück|anzahl|shares/),symbol:col(/symbol|ticker/),price:col(/^kurs$|preis|price/),isin:col(/isin/)};
  Object.entries(ci).forEach(([k,i])=>{if(i>=0)st.cols[k]=head[i]});
  if(ci.name<0||ci.value<0){st.error='Spalten „Name“ und „Marktwert“ nicht gefunden. Erwartet wird die Vermögensaufstellung aus Portfolio Performance.';return st}
  nonEmpty.slice(1).forEach(({l,i})=>{
    const r=splitL(l,d);const name=(r[ci.name]||'').trim();const v=parseNum(r[ci.value]);
    if(!name){st.skipped.push({line:i,reason:'kein Name'});return}
    if(/^summe|^gesamt|^total/i.test(name)){if(Number.isFinite(v)&&st.fileSum==null)st.fileSum=v;st.skipped.push({line:i,reason:`Summenzeile „${name}“`});return}
    if(!Number.isFinite(v)){st.skipped.push({line:i,reason:`„${name}“: Marktwert nicht lesbar`});return}
    if(v<0){st.skipped.push({line:i,reason:`„${name}“: negativer Marktwert`});return}
    const qty=ci.qty>=0?parseNum(r[ci.qty]):NaN,sym=ci.symbol>=0?(r[ci.symbol]||'').trim():'',price=ci.price>=0?parseNum(r[ci.price]):NaN,isin=ci.isin>=0?(r[ci.isin]||'').trim():'';
    if(!Number.isFinite(qty)&&!sym&&!isin){st.accounts.push({name,value:v,line:i,accept:false});return}
    const m=STAMM[sym]||null;
    /* Kurswährung: deutscher Börsenplatz (.DE/.F) → Euro; sonst unbekannt */
    const priceCcy=/\.(DE|F|DU|MU|HM|SG|BE)$/i.test(sym)?'EUR':null;
    st.positions.push({id:sym||isin||name,name,symbol:sym,isin:isin||null,qty:Number.isFinite(qty)?qty:null,price:Number.isFinite(price)?price:null,priceCcy,
      exportValue:v,valueStatus:priceCcy?'ok':'unclear',conf:null,manualValue:null,bucket:m?m.bucket:null,bucketSrc:m?'stamm':null,fund:m?m.fund:null,ter:m&&m.ter!=null?m.ter:null});
  });
  if(!st.positions.length&&!st.accounts.length)st.error='Keine gültigen Zeilen gefunden. Prüfe, ob die Spalte Marktwert Beträge enthält.';
  return st;
}

/* =========================================================
   DATENHALTUNG: Demo und eigenes Depot strikt getrennt
   ========================================================= */
const OWN_KEY='depotfokus-v4-own', UI_KEY='depotfokus-v4-ui';
function newDepot(kind){return {kind,fileName:null,importedAt:null,valuationDate:null,positions:[],accounts:[],
  external:{reserve:0,items:[]},goals:null,goalsSource:null,maxSingle:null,budget:0,cashMode:'keep',minRate:0,manual:null,
  notify:{change:true,month:true,pay:false,channel:'push',freq:'weekly'},events:[],read:[],baseline:null}}
function buildDemo(){
  const d=newDepot('demo');const a=analyzeCSV(DEMO_CSV,'Demodepot');
  d.positions=a.positions;d.accounts=a.accounts.map(x=>({name:x.name,value:x.value}));
  const tx=analyzeCSV(DEMO_TX,'Musterumsätze');d.tx=tx.tx;d.txMeta={fileName:'Musterumsätze (erfunden)',importedAt:'04.10.2026',from:tx.from,to:tx.to};
  d.valuationDate='04.10.2026';d.goals={...DEMO_GOALS};d.goalsSource='example';d.maxSingle=10;d.budget=778;d.cashMode='invest';
  return d;
}
let DEMO=buildDemo();
let OWN=load(OWN_KEY);
let UI=Object.assign({mode:'compact',tab:'home',source:'demo',live:true},load(UI_KEY)||{});
if(UI.source==='own'&&!OWN)UI.source='demo';
const D=()=>UI.source==='own'&&OWN?OWN:DEMO;
let goalRaw={};              // ungültige Eingaben je Feld (nur Anzeige)
let budgetRaw=null;
let staged=null;             // geprüfter, noch nicht übernommener Import
let pendingDelete=false;
function saveUI(){store(UI_KEY,UI)}
function persist(){if(D().kind==='own'){if(!store(OWN_KEY,OWN))toast('Speichern auf diesem Gerät nicht möglich. Änderungen gehen beim Schließen verloren.')}}

/* =========================================================
   BERECHNUNG
   ========================================================= */
function posValue(p){if(p.conf==='skip')return null;const lv=liveValue(p);if(lv!=null)return lv;if(p.conf==='manual')return p.manualValue;if(p.valueStatus==='ok'||p.conf==='eur')return p.exportValue;return null}
function isIncluded(p){return posValue(p)!=null}
function unresolved(d){return d.positions.filter(p=>p.valueStatus==='unclear'&&!p.conf&&liveValue(p)==null)}
function noBucket(d){return d.positions.filter(p=>isIncluded(p)&&!p.bucket)}
function totals(d){
  const sec=d.positions.reduce((a,p)=>a+(isIncluded(p)?posValue(p):0),0);
  const acct=d.accounts.reduce((a,x)=>a+x.value,0);
  const ext=d.external.items.reduce((a,x)=>a+(+x.value||0),0);
  return {sec,acct,ext,reserve:+d.external.reserve||0,sum:sec+acct+ext,open:unresolved(d).length,skipped:d.positions.filter(p=>p.conf==='skip').length};
}
/* Bausteinwerte für Zielvergleich und Plan. Verrechnungskonto je nach Einstellung. */
function bucketVals(d,cashMode=d.cashMode){
  const V={};B.forEach(b=>V[b.id]=0);
  d.positions.forEach(p=>{if(isIncluded(p)&&p.bucket)V[p.bucket]+=posValue(p)});
  if(cashMode!=='exclude')V.liq+=d.accounts.reduce((a,x)=>a+x.value,0);
  d.external.items.forEach(x=>{const v=+x.value||0;if(x.type==='bonds')V.bonds+=v;else V.liq+=v});
  return V;
}
const tot=V=>Object.values(V).reduce((a,b)=>a+b,0);
function goalState(d){
  if(!d.goals)return {ok:false,reason:'none'};
  const bad=B.filter(b=>goalRaw[b.id]!=null);
  if(bad.length)return {ok:false,reason:'invalid',fields:bad.map(b=>b.id)};
  const sum=B.reduce((a,b)=>a+(d.goals[b.id]||0),0);
  if(Math.abs(sum-100)>0.05)return {ok:false,reason:'sum',sum};
  return {ok:true,sum};
}
function budgetState(d){if(budgetRaw!=null)return {ok:false,msg:budgetRaw};return {ok:true}}
/* Verteilung auf Bausteine, centgenau */
function allocate(d){
  const gs=goalState(d),bs=budgetState(d);if(!gs.ok||!bs.ok)return null;
  const V=bucketVals(d,d.cashMode==='invest'?'exclude':d.cashMode);
  const cash=d.cashMode==='invest'?d.accounts.reduce((a,x)=>a+x.value,0):0;
  const T=tot(V)+cash,Mc=Math.round((+d.budget||0)*100);
  const t={};B.forEach(b=>t[b.id]=(d.goals[b.id]||0)/100);
  let Ts=T;B.forEach(b=>{if(t[b.id]>0)Ts=Math.max(Ts,V[b.id]/t[b.id])});
  const need={};let ns=0;B.forEach(b=>{need[b.id]=Math.max(0,t[b.id]*Ts-V[b.id]);ns+=need[b.id]});
  const weights={};B.forEach(b=>weights[b.id]=ns>0?need[b.id]/ns:t[b.id]);
  const out={};let used=0;const rem=[];
  B.forEach(b=>{const raw=Mc*weights[b.id];out[b.id]=Math.floor(raw);used+=out[b.id];rem.push([b.id,raw-out[b.id]])});
  rem.sort((a,c)=>c[1]-a[1]);for(let i=0;i<Mc-used;i++)out[rem[i%rem.length][0]]++;
  const moves=[];const minC=(+d.minRate||0)*100;
  if(minC>0){const big=B.reduce((a,b)=>need[b.id]>need[a.id]?b:a,B[0]).id;
    B.forEach(b=>{if(b.id!==big&&out[b.id]>0&&out[b.id]<minC){moves.push({from:b.id,to:big,c:out[b.id]});out[big]+=out[b.id];out[b.id]=0}})}
  const amounts={};B.forEach(b=>amounts[b.id]=out[b.id]/100);
  return {V,T,cash,Ts,need,amounts,moves,ns};
}
function chosenAmounts(d,al){if(d.manual){const m={};B.forEach(b=>m[b.id]=Math.max(0,+d.manual[b.id]||0));return m}return al.amounts}
/* Pfad bei unveränderten Kursen */
function pathFor(d,al,amounts){
  const t={};B.forEach(b=>t[b.id]=(d.goals[b.id]||0)/100);
  const V={...al.V};
  if(al.cash>0){const tmpNs=al.ns||1;B.forEach(b=>V[b.id]+=al.cash*(al.ns>0?al.need[b.id]/tmpNs:t[b.id]))}
  const blocked=B.filter(b=>t[b.id]===0&&V[b.id]>0.5);
  const M=B.reduce((a,b)=>a+amounts[b.id],0);
  const tol=0.01;
  const dev=()=>{const T=tot(V);return T>0?Math.max(...B.map(b=>Math.abs(V[b.id]/T-t[b.id]))):1};
  let theo=null;
  if(!blocked.length){const T=tot(V);let Ts=T;B.forEach(b=>{if(t[b.id]>0)Ts=Math.max(Ts,V[b.id]/t[b.id])});const need=Ts-T;const Mb=+d.budget||0;theo=need<0.5?0:(Mb>0?Math.ceil(need/Mb):null)}
  if(blocked.length)return {blocked,theo:null,months:null};
  if(dev()<=tol)return {blocked:[],theo:0,months:0};
  if(M<=0)return {blocked:[],theo,months:null};
  for(let m=1;m<=600;m++){B.forEach(b=>V[b.id]+=amounts[b.id]);if(dev()<=tol)return {blocked:[],theo,months:m}}
  return {blocked:[],theo,months:Infinity};
}

/* =========================================================
   DEPOT-CHECK: Abweichungen, Datenfragen, Informationen
   ========================================================= */
function checkModel(d){
  const tt=totals(d),out={dev:[],data:[],info:[]};
  const V=bucketVals(d),T=tot(V),gs=goalState(d);
  const incomplete=tt.open>0||noBucket(d).length>0;
  // Datenfragen
  if(tt.open)out.data.push({key:'open',lvl:'warn',t:`${tt.open} ${tt.open>1?'Positionen haben':'Position hat'} einen ungeklärten Wert`,d:`Die Kurswährung ist aus dem Export nicht erkennbar: ${unresolved(d).map(p=>p.name).join(', ')}. Diese Positionen fehlen in Gesamtwert, Gewichten und Zielvergleich.`,go:['depot','confirmCard'],act:'Zuordnungen prüfen'});
  const nb=noBucket(d);if(nb.length)out.data.push({key:'nobucket',lvl:'warn',t:`${nb.length} ${nb.length>1?'Positionen haben':'Position hat'} keinen Baustein`,d:'Ohne Baustein fehlen sie im Zielvergleich.',go:['depot','confirmCard'],act:'Baustein wählen'});
  const funds=d.positions.filter(p=>isIncluded(p)&&p.fund===true);const unkF=d.positions.filter(p=>isIncluded(p)&&p.fund==null);
  if(unkF.length)out.data.push({key:'unkfund',lvl:'na',t:`Bei ${unkF.length} ${unkF.length>1?'Positionen':'Position'} ist nicht bekannt, ob es ein Fonds ist`,d:'Für diese Positionen liegen keine Stammdaten vor; laufende Kosten sind deshalb nicht bekannt.',go:['depot','posCard'],act:'Positionen ansehen'});
  const tm=txModel(d);
  if(!tm)out.data.push({key:'perf',lvl:'na',t:'Wertentwicklung noch nicht berechenbar',d:'Dafür braucht Depotfokus deine Umsätze (Käufe, Verkäufe, Dividenden) aus Portfolio Performance.',go:['depot','importCard'],act:'Umsätze importieren'});
  else{tm.issues.forEach(s=>out.data.push({key:'tx-'+s.sk,lvl:'warn',t:`${s.name||s.symbol||s.isin}: ${s.mismatch?`laut Umsätzen ${num(s.shares,4)} Stück, im Bestand ${num(s.pos.qty,4)}`:s.missingPos?'laut Umsätzen noch im Bestand, fehlt in der Vermögensaufstellung':s.oversold?'mehr verkauft als gekauft':s.unknownCost?'Einstand unbekannt (Einlieferung ohne Wert)':'Wert ungeklärt, bitte Währung bestätigen'}`,d:s.held&&s.pos&&s.value==null&&!s.mismatch?'Ohne bestätigten Wert fehlt die Position in der Renditeberechnung.':'Diese Position fehlt in der Renditeberechnung. Meist fehlen ältere Umsätze im Export oder der Bestand ist von einem anderen Stichtag.',go:s.held&&s.pos&&s.value==null&&!s.mismatch?['depot','confirmCard']:s.pos?['pos',s.pos.id]:['depot','importCard'],act:s.held&&s.pos&&s.value==null&&!s.mismatch?'Wert bestätigen':s.pos?'Position ansehen':'Zum Import'}));
    if(tm.posNoTx.length)out.data.push({key:'notx',lvl:'na',t:`${tm.posNoTx.length} ${tm.posNoTx.length>1?'Positionen haben':'Position hat'} keine Umsätze`,d:`${tm.posNoTx.map(p=>p.name).join(', ')}. Sie fehlen in der Renditeberechnung.`,go:['depot','importCard'],act:'Zum Import'})}
  if(d.kind==='own'&&!d.valuationDate)out.data.push({key:'date',lvl:'na',t:'Bewertungsstichtag nicht bekannt',d:'Der Export enthält kein Datum. Du kannst es beim nächsten Import angeben.',go:['depot','importCard'],act:'Zum Import'});
  // Abweichungen von eigenen Vorgaben
  if(!d.goals)out.dev.push({key:'nogoals',lvl:'na',t:'Noch keine eigene Zielverteilung',d:'Ohne Vorgaben gibt es nichts zu vergleichen.',go:['plan','goalCard'],act:'Ziele festlegen'});
  else if(!gs.ok)out.dev.push({key:'goalsinvalid',lvl:'na',t:'Zielverteilung ungültig',d:gs.reason==='sum'?`Deine Vorgaben ergeben ${fz(gs.sum)} % statt 100 %.`:'Mindestens ein Eingabefeld ist ungültig.',go:['plan','goalCard'],act:'Vorgaben prüfen'});
  else{
    const pre=incomplete?' Vorläufig, weil Positionen fehlen.':'';
    B.forEach(b=>{const w=T?V[b.id]/T:0,g=d.goals[b.id]/100,diff=w-g;if(Math.abs(diff)>0.05)out.dev.push({key:'dev-'+b.id,lvl:Math.abs(diff)>0.10?'crit':'warn',
      t:`${b.name}: ${pct(w)} statt ${fz(d.goals[b.id])} %`,d:`${num(Math.abs(diff)*100,1)} Prozentpunkte ${diff>0?'darüber':'darunter'}${Math.abs(diff)>0.10?', deutlich':''}.${pre}`,go:['plan','allocCard'],act:'Zum Plan'})});
    const eqA=T?B.filter(b=>b.eq).reduce((a,b)=>a+V[b.id],0)/T:0,eqG=B.filter(b=>b.eq).reduce((a,b)=>a+d.goals[b.id],0)/100;
    if(Math.abs(eqA-eqG)>0.05)out.dev.push({key:'eq',lvl:Math.abs(eqA-eqG)>0.10?'crit':'warn',t:`Aktienquote ${pct(eqA,0)} statt ${pct(eqG,0)}`,d:`Aktien und Aktienfonds im Verhältnis zum betrachteten Vermögen.${pre}`,go:['plan','goalCard'],act:'Vorgaben ansehen'});
    if(d.maxSingle!=null){d.positions.filter(p=>isIncluded(p)&&(p.bucket==='single'||p.bucket==='bdc')).forEach(p=>{const w=posValue(p)/T;if(w>d.maxSingle/100)out.dev.push({key:'max-'+p.id,lvl:'warn',t:`${p.name}: ${pct(w)} des Vermögens`,d:`Über deiner Grenze von ${fz(d.maxSingle)} % je Einzelwert.${pre}`,go:['plan','maxSingle'],act:'Grenze ändern',pos:p.id})})}
    if(!out.dev.length)out.dev.push({key:'devok',lvl:'good',t:'Keine Abweichung über 5 Prozentpunkte',d:incomplete?'Gilt nur für die eingerechneten Positionen; das Depot ist unvollständig.':'Alle Bausteine liegen nah an deinen Vorgaben.',go:null});
  }
  // Informationen
  const known=funds.filter(p=>p.ter!=null),unk=funds.filter(p=>p.ter==null);
  const cost=known.reduce((a,p)=>a+posValue(p)*p.ter/100,0),kv=known.reduce((a,p)=>a+posValue(p),0);
  out.info.push({key:'cost',lvl:'info',t:funds.length?`Laufende Fondskosten: rund ${eur(cost)} pro Jahr`:'Keine Fonds mit bekannten Stammdaten',
    d:funds.length?`Berechnet für ${known.length} von ${funds.length} Fonds (Ø ${num(kv?cost/kv*100:0,2)} %).${unk.length?` Bei ${unk.length} Fonds ist die TER nicht bekannt; sie zählt nicht als 0.`:''} Die laufenden Kosten sind bereits im Fondswert berücksichtigt; Handels- und Depotkosten sind nicht enthalten.`:'',go:['depot','posCard'],act:'Fonds ansehen'});
  const inc=d.positions.filter(isIncluded).sort((a,c)=>posValue(c)-posValue(a)).slice(0,3);
  out.info.push({key:'conc',lvl:'info',t:'Größte Positionen',d:(inc.map(p=>`${p.name} ${pct(posValue(p)/tt.sum)}`).join(' · ')||'–')+'. Länderanteile: nicht verfügbar, dafür fehlen geprüfte Bestandsdaten der Fonds.',go:['depot','posCard'],act:'Positionen'});
  const checked=d.positions.filter(p=>isIncluded(p)&&PAY[p.symbol]&&PAY[p.symbol].cover);const notMet=checked.filter(p=>PAY[p.symbol].cover==='not_met');
  if(checked.length)out.info.push({key:'divcheck',lvl:'info',t:'Geprüfte Ausschüttungsdeckung',d:`${checked.length} Positionen mit hinterlegter Prüfung. ${notMet.length?`Nicht erfüllt: ${notMet.map(p=>p.name).join(', ')}.`:'Bei allen geprüften erfüllt.'} Für alle übrigen Positionen nicht geprüft.`,go:notMet.length?['pos',notMet[0].id]:null,act:notMet.length?'Position ansehen':null});
  return {...out,incomplete};
}
/* „Jetzt wichtig“: höchstens drei Punkte */
function nowItems(d){
  const c=checkModel(d),items=[];
  c.data.filter(x=>x.lvl==='warn').forEach(x=>items.push(x));
  c.dev.filter(x=>x.lvl==='crit').forEach(x=>items.push(x));
  d.positions.filter(isIncluded).forEach(p=>{const I=INFO[p.symbol];if(!I||!I.rules)return;I.rules.forEach(r=>{if((r.type==='goal'&&r.status==='not_met')||(r.type==='risk'&&r.status==='occurred'))items.push({key:'rule-'+p.id,lvl:'warn',t:`${p.name}: ${r.q.replace(/\?$/,'')}`,d:`${STATUS[r.type][r.status]} für ${r.per} (${r.obs}). Kein Kauf- oder Verkaufssignal.`,go:['pos',p.id],act:'Einordnung ansehen'})})});
  return items.slice(0,3);
}

/* =========================================================
   HINWEISE: nur aus tatsächlichen Änderungen auf diesem Gerät
   ========================================================= */
function addEvent(d,e){d.events.unshift({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),at:nowStr(),...e});d.events=d.events.slice(0,50)}
function evaluateChanges(d,first){
  const keys=checkModel(d).dev.filter(x=>x.lvl==='crit').map(x=>x.key).concat(unresolved(d).length?['open']:[]);
  if(d.baseline==null||first){d.baseline=keys;return}
  const added=keys.filter(k=>!d.baseline.includes(k));
  if(added.length&&d.notify.change){const c=checkModel(d);const all=[...c.dev,...c.data];
    added.forEach(k=>{const it=all.find(x=>x.key===k);if(it)addEvent(d,{t:it.t,b:it.d,go:it.go})})}
  d.baseline=keys;
}
const unreadCount=d=>d.events.filter(e=>!d.read.includes(e.id)).length;

