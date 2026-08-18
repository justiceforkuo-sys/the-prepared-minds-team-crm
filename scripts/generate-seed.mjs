// Generates supabase/seed.sql from the real data that used to live inside
// the CRM-Batisseur.jsx artifact. Run with: node scripts/generate-seed.mjs
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ADMIN_EMAIL = "justiceforkuo@preparedmindspro.com";

const CLIENTS_SEED = [
  {name:"Abdoul Mazou, Bangagne",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Acheampong, Kofi",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Acheampong, Owusu Kwame",totalWorth:1080.0,totalUnits:57.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Addo, Vida",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adissu, Peter",totalWorth:10720.0,totalUnits:91.68,policies:[{partner:"P&V",product:"AVVIVIUM21BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:720.0,units:31.68},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adjaottor, Patience",totalWorth:2250.0,totalUnits:125.51,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:720.0,units:43.92},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59}]},
  {name:"Adomah, Janet Yaa",totalWorth:13000.0,totalUnits:229.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adomako, William",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adu, Akwasi",totalWorth:11287.0,totalUnits:111.48,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1287.0,units:51.48},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Aduako, Yaa",totalWorth:1530.0,totalUnits:81.59,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59}]},
  {name:"Adu-Brown, Derek",totalWorth:12700.0,totalUnits:204.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adusei, Stephen",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adutwum, Ama",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adutwum, Bridjet",totalWorth:14575.0,totalUnits:320.09,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:900.0,units:54.9},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Adutwun, Patricia",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Afranewaa, Constance",totalWorth:2880.0,totalUnits:116.4,policies:[{partner:"AG Insurance",product:"AVMULTI21BE",productLabel:"AG Insurance — Multisupport",worth:600.0,units:24.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"P&V",product:"NZMEER5JR",productLabel:"P&V — Épargne 5 ans",worth:1200.0,units:34.8}]},
  {name:"Afrifa, Eden Baffour",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Afriyie, Akua",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Agyei, Emmanuel K.",totalWorth:20900.0,totalUnits:168.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Agyekum, Benjamin Addai",totalWorth:20000.0,totalUnits:120.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Aka, Adjo Agnes",totalWorth:11020.0,totalUnits:90.0,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:18.0},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:300.0,units:12.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Akosah, Abena",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amankwaa, Paul",totalWorth:10780.0,totalUnits:91.2,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:780.0,units:31.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amedu, Blessing",totalWorth:11575.0,totalUnits:143.99,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amenyo, Akosuavi Madeleine",totalWorth:13174.84,totalUnits:230.7,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:823.56,units:45.3},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amoo, Christabel",totalWorth:2100.0,totalUnits:121.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Ampofo, Collins",totalWorth:12475.0,totalUnits:191.99,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Anqui, Kouassi Michel",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Ansong, Mavis",totalWorth:12550.0,totalUnits:203.81,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1020.0,units:62.22},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Asamoah, Janet",totalWorth:13852.0,totalUnits:239.28,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1326.0,units:53.04},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1326.0,units:53.04},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Asante, Angelina Nelly",totalWorth:3376.92,totalUnits:166.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1710.0,units:91.19},{partner:"P&V",product:"REVENUS",productLabel:"P&V — Protection Revenus",worth:1666.92,units:75.01}]},
  {name:"Asante, Mary",totalWorth:18000.0,totalUnits:108.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:8000.0,units:48.0}]},
  {name:"Asiedu, Daniel",totalWorth:10864.0,totalUnits:94.56,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:864.0,units:34.56},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Asomani, Elizabeth",totalWorth:13366.0,totalUnits:237.48,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:840.0,units:51.24},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1326.0,units:53.04},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Atikey, Komi",totalWorth:1260.0,totalUnits:50.4,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1260.0,units:50.4}]},
  {name:"Atila, Salomey",totalWorth:31296.72,totalUnits:231.87,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1296.72,units:51.87},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Atitsogbui, Gershon Kwami",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Attah, John",totalWorth:648.96,totalUnits:29.2,policies:[{partner:"P&V",product:"ASRDBE",productLabel:"P&V — Solde Restant Dû (crédit)",worth:648.96,units:29.2}]},
  {name:"Baafi Mensah, Rahel",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Baah, Dorothy",totalWorth:26030.0,totalUnits:469.19,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:2400.0,units:146.4},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Badu, Florence Konadu",totalWorth:18000.0,totalUnits:108.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:8000.0,units:48.0}]},
  {name:"Bah, Aissatou Lamara",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Bandoh-Danquah, Linda Ode",totalWorth:11080.0,totalUnits:117.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Boakye, Jackline Ansah",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Boatemaa, Pamela",totalWorth:20000.0,totalUnits:120.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Boateng, Bright",totalWorth:1496.28,totalUnits:79.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8}]},
  {name:"Boateng, Frank Denbroela",totalWorth:20000.0,totalUnits:120.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Boateng, Joyce",totalWorth:855.0,totalUnits:45.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6}]},
  {name:"Bonkoungou, Kiswendsida Emi",totalWorth:20000.0,totalUnits:120.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Camara, Mamadama",totalWorth:24407.0,totalUnits:346.68,policies:[{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:2400.0,units:136.8},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1287.0,units:51.48},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:720.0,units:38.4},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Camara, Nana",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Camara, Rose",totalWorth:23056.52,totalUnits:254.33,policies:[{partner:"AG Insurance",product:"AVMULTI21BE",productLabel:"AG Insurance — Multisupport",worth:1340.52,units:65.69},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:780.0,units:31.2},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:936.0,units:37.44},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Cise, Sekuba",totalWorth:1500.0,totalUnits:84.6,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Dango, Habibou",totalWorth:2808.0,totalUnits:112.32,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:2808.0,units:112.32}]},
  {name:"Dango, Kisha Femke N",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Dango Nadey, Koudirath",totalWorth:3529.44,totalUnits:194.12,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1176.6,units:64.71},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1176.48,units:64.71},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1176.36,units:64.7}]},
  {name:"Danso, Godwin",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"De Souza, Jacqueline",totalWorth:1800.0,totalUnits:109.8,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:109.8}]},
  {name:"Diamonde, Mohammed Lamine",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Diessongo, Yamba Assimi",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Djomessin, Alvine Mireille",totalWorth:4115.88,totalUnits:222.46,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1176.48,units:64.71},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.12,units:32.35},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:0.0,units:0.0}]},
  {name:"Djoumessi Soffack, Patrick Joel",totalWorth:15287.4,totalUnits:340.82,policies:[{partner:"P&V",product:"AVVIVIUMRIZIV21BE",productLabel:"P&V VIVIUM — INAMI/RIZIV (pension méd.)",worth:650.36,units:34.47},{partner:"P&V",product:"AVVIVIUMVAPZ23BE",productLabel:"P&V VIVIUM — PLCI/EIP indépendant (VAPZ)",worth:2837.04,units:150.36},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1800.0,units:95.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Domfeh, Augustina",totalWorth:1020.0,totalUnits:54.84,policies:[{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:120.0,units:6.84},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Duke Arthur, Bernard",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Ebepe, Adelaide",totalWorth:1260.0,totalUnits:67.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1260.0,units:67.2}]},
  {name:"Eclou, Kossi Dodji",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Etalo, Andreas",totalWorth:11080.0,totalUnits:117.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ettichi, Kablan Jean Marc",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ettitchi, Fulgence",totalWorth:12370.0,totalUnits:192.83,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:840.0,units:51.24},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ettitchi, Samuel",totalWorth:2730.0,totalUnits:154.79,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59}]},
  {name:"Forkuo, Justice",totalWorth:1800.0,totalUnits:96.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Frimpong, Abigail Konadu",totalWorth:13000.0,totalUnits:243.0,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:109.8},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Frimpong, Mavis Kyeremaa",totalWorth:15658.48,totalUnits:337.99,policies:[{partner:"P&V",product:"AVVIVIUMVAPZ21OBE",productLabel:"P&V VIVIUM — PLCI/EIP indépendant (VAPZ)",worth:1317.6,units:64.56},{partner:"P&V",product:"AVVIVIUMVAPZ23BE",productLabel:"P&V VIVIUM — PLCI/EIP indépendant (VAPZ)",worth:2855.88,units:134.23},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Gift Esohe, Osagie",totalWorth:11440.0,totalUnits:136.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1440.0,units:76.8},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Gouba, Elisabeth",totalWorth:21200.0,totalUnits:193.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Gouba, Kouni",totalWorth:12000.0,totalUnits:72.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:12000.0,units:72.0}]},
  {name:"Gramie, Amoin",totalWorth:1200.0,totalUnits:73.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2}]},
  {name:"Guiepet, Christian - Marie",totalWorth:6429.6,totalUnits:298.64,policies:[{partner:"P&V",product:"AVVIVIUMVAPZ23BE",productLabel:"P&V VIVIUM — PLCI/EIP indépendant (VAPZ)",worth:1389.6,units:73.65},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:3240.0,units:172.79},{partner:"P&V",product:"NZMEER5JR",productLabel:"P&V — Épargne 5 ans",worth:1800.0,units:52.2}]},
  {name:"Guiffo Kengne, Roslin Laurel",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Gyamfi, Kwame",totalWorth:2160.0,totalUnits:115.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Gyan, Sophie Marie",totalWorth:11808.77,totalUnits:154.09,policies:[{partner:"AG Insurance",product:"AVRIZIV21BE",productLabel:"AG Insurance — INAMI/RIZIV (pension méd.)",worth:548.77,units:26.89},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1260.0,units:67.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Hassan, Adia Hassan",totalWorth:22351.28,totalUnits:245.4,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Hayertz, Claude Diane",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ibrahim, Fuseini Douaddou",totalWorth:13150.0,totalUnits:227.98,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Jabbie, Dura",totalWorth:14470.0,totalUnits:314.03,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:840.0,units:51.24},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Jiongo Nguefack, Elionore",totalWorth:17250.36,totalUnits:401.66,policies:[{partner:"P&V",product:"AVVIVIUM21BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:4800.0,units:211.2},{partner:"P&V",product:"AVVIVIUMRIZIV21BE",productLabel:"P&V VIVIUM — INAMI/RIZIV (pension méd.)",worth:650.36,units:34.47},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1800.0,units:95.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Johnson, Barbara Pokua",totalWorth:12820.0,totalUnits:216.84,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:840.0,units:51.24},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kabagwira, Marceline",totalWorth:2736.0,totalUnits:109.44,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:2736.0,units:109.44}]},
  {name:"Kanga Matondo, Fanny Carine",totalWorth:11080.0,totalUnits:117.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kinamunzo Makengo, Michel",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Koffi, Affoua N'Guetti",totalWorth:20000.0,totalUnits:120.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Kouadio, Ahou Victoire",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Koudaya, Edem Royal",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kouffour, Esther",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kpodonu, Richard Nkansah",totalWorth:2160.0,totalUnits:115.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Kuate, Edith Simone",totalWorth:2694.6,totalUnits:142.81,policies:[{partner:"P&V",product:"AVVIVIUMVAPZ23BE",productLabel:"P&V VIVIUM — PLCI/EIP indépendant (VAPZ)",worth:2694.6,units:142.81}]},
  {name:"Kuitchoua Mbatchoum, Jordan",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kusi, Benjamin",totalWorth:11530.0,totalUnits:141.59,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Lago, Fabrice",totalWorth:6984.36,totalUnits:348.56,policies:[{partner:"P&V",product:"AVVIVIUMVAPZ23BE",productLabel:"P&V VIVIUM — PLCI/EIP indépendant (VAPZ)",worth:3778.08,units:177.57},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1710.0,units:91.19}]},
  {name:"Lago, Marie Jeanne C (Claude)",totalWorth:24921.08,totalUnits:316.84,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:2808.0,units:112.32},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1365.0,units:54.6},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:748.08,units:29.92},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Lamah, Sekou",totalWorth:1485.0,totalUnits:79.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2}]},
  {name:"Lambert, Gilbert Junior T",totalWorth:2992.56,totalUnits:159.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8}]},
  {name:"Litumba, Bedi",totalWorth:5128.78,totalUnits:251.31,policies:[{partner:"AG Insurance",product:"AVRIZIV21BE",productLabel:"AG Insurance — INAMI/RIZIV (pension méd.)",worth:5128.78,units:251.31}]},
  {name:"Maiga, Ibrahim Adam",totalWorth:2394.0,totalUnits:95.76,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1197.0,units:47.88},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1197.0,units:47.88}]},
  {name:"Manu, Paulina",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Mayawula Tshama, Hortense",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Mbarubukeye, Maryline Segashi",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Mbodji, Alioune Sadian",totalWorth:4380.0,totalUnits:238.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1440.0,units:76.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1440.0,units:76.8}]},
  {name:"Memeh, Azuhbuike Stanley",totalWorth:11575.0,totalUnits:143.99,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Mensah, Heidi",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Mensah, Samuel",totalWorth:3006.72,totalUnits:143.06,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1296.72,units:51.87},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1710.0,units:91.19}]},
  {name:"Mohammed, Taofik Zoundi",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Mujawabera, Mathilda",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Mukayiranga, Djamila",totalWorth:12100.0,totalUnits:181.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nake, Kossiwa",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Niava, Martine",totalWorth:15033.77,totalUnits:327.49,policies:[{partner:"AG Insurance",product:"AVMULTI21BE",productLabel:"AG Insurance — Multisupport",worth:1200.0,units:58.8},{partner:"AG Insurance",product:"AVRIZIV21BE",productLabel:"AG Insurance — INAMI/RIZIV (pension méd.)",worth:548.77,units:26.89},{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:102.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nikolo Botombya, Calvinne",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Niyomuhoza, Marie Amandine",totalWorth:3600.0,totalUnits:205.8,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:109.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Njandjo, Caliste Danielle",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Njono Tchoumegni, Synthia",totalWorth:1980.0,totalUnits:105.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Nkansah, Abel",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nkansah, Linda",totalWorth:34410.0,totalUnits:414.59,policies:[{partner:"AG Insurance",product:"AVMULTI21BE",productLabel:"AG Insurance — Multisupport",worth:1080.0,units:43.2},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:109.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ofori, Isaac",totalWorth:20000.0,totalUnits:120.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0}]},
  {name:"Ofori, Lydia",totalWorth:21530.0,totalUnits:201.59,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Oko, Ishmael",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Opoku, Dorcas",totalWorth:1080.0,totalUnits:57.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Osei, Enoch Kwaku",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Osei, Nelson",totalWorth:2070.0,totalUnits:82.8,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:645.0,units:25.8},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:780.0,units:31.2},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:645.0,units:25.8}]},
  {name:"Oti Adjei, Frank",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Owusu, Ernestina Opokua",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Owusu, Prince Kwasi",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Owusu Ansah, Helena",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Owusu Banahene, Harriet",totalWorth:600.0,totalUnits:24.0,policies:[{partner:"AG Insurance",product:"AVMULTI23BE",productLabel:"AG Insurance — Multisupport",worth:600.0,units:24.0}]},
  {name:"Pay, Charles",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Peprah, Vida",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Probst, Melanie Maria A",totalWorth:12100.0,totalUnits:156.0,policies:[{partner:"P&V",product:"AVMULTI23BE",productLabel:"AG Insurance — Multisupport",worth:1200.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sambu, Gloria Wazangulua",totalWorth:13075.0,totalUnits:228.59,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sarpong, Akwesi",totalWorth:1530.0,totalUnits:81.59,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59}]},
  {name:"Sarpong, Gloria",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sarr, Macodou",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Savane, Aminata",totalWorth:14500.0,totalUnits:327.6,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:109.8},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Schur, Erik Henri Gisnhain",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Seck, Mamadou Dieye",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Seidu, Hamsa",totalWorth:8000.0,totalUnits:48.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:8000.0,units:48.0}]},
  {name:"Senkyire, Abena Koname",totalWorth:2100.0,totalUnits:121.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:0.0,units:0.0}]},
  {name:"Serwaa, Rose",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sessou, Magnim Linda A",totalWorth:960.0,totalUnits:54.72,policies:[{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:960.0,units:54.72}]},
  {name:"Soumah, Aichatou",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Soumah, Mabinty",totalWorth:600.0,totalUnits:36.6,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6}]},
  {name:"Soumah, Mangue",totalWorth:1833.0,totalUnits:73.32,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1188.0,units:47.52},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:645.0,units:25.8}]},
  {name:"Sowa, Mary",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Tatang Mofouo, Yasmine Ingrid",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Thibeau, Sarah Laura D",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Tienga Tienga, Julien Junior",totalWorth:11200.0,totalUnits:122.4,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:62.4},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Tiwaah, Rebecca Anno",totalWorth:9326.0,totalUnits:101.04,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1326.0,units:53.04},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:8000.0,units:48.0}]},
  {name:"Tshisekedi Mbombo, Grace",totalWorth:14080.0,totalUnits:286.79,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1800.0,units:95.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Uwituse, Delphine",totalWorth:1000.08,totalUnits:55.0,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1000.08,units:55.0}]},
  {name:"Wafo Touade, Steve Deverlain",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Wobiwo Tatang, Winnie Ines",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Yeboah, Georgina Ama",totalWorth:32826.0,totalUnits:317.64,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1326.0,units:53.04},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:120.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Yeboah, Lydia",totalWorth:11530.0,totalUnits:141.59,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Yusuf, Meriyam Ibraim",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
];

const NANA_CLIENTS_SEED = [
  {name:"Ablorh, Mary Tawiah",totalWorth:10600.0,totalUnits:96.6,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Addo, Simeon Opoku",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Agyei, Antwi",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amavi, D d Malthida",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amenyo, Kossi Benjamin",totalWorth:2351.28,totalUnits:125.4,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6}]},
  {name:"Amponsah, James",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ansu Darkwa, Linda",totalWorth:10780.0,totalUnits:91.2,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:780.0,units:31.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Appiah, Joe",totalWorth:7000.0,totalUnits:42.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:7000.0,units:42.0}]},
  {name:"Asante, Nana Yaw",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Baffour-Kyei, Alex",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Boakye, Jackline Ansah",totalWorth:1496.28,totalUnits:79.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8}]},
  {name:"Boakye, Kelvin Ansah",totalWorth:14695.0,totalUnits:327.41,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1500.0,units:91.5},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:720.0,units:43.92},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Boateng, Regina",totalWorth:2353.08,totalUnits:129.42,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:2353.08,units:129.42}]},
  {name:"Bonsu, Felix Mensah",totalWorth:10855.0,totalUnits:105.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Caiquo, Bobby",totalWorth:1176.24,totalUnits:64.7,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.12,units:32.35},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.12,units:32.35}]},
  {name:"Darkwaa, Patricia",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Dwomoh, Sylvia",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Franco Gomez, Nydia",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Gyimah, Ernestina",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kahigo, Justy",totalWorth:1710.0,totalUnits:91.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6}]},
  {name:"Koudaya, Edem Royal",totalWorth:1350.0,totalUnits:72.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1350.0,units:72.0}]},
  {name:"Lawson, Gabriel Appiahene",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Lopes, Raquel",totalWorth:13000.0,totalUnits:243.0,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:109.8},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Manu, George Peprah",totalWorth:20900.0,totalUnits:168.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nlandu, Kinkela",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Obeng, Dina",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Oduro, Philipa",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Ofosu, Dorcas",totalWorth:2220.0,totalUnits:88.8,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:28.8},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:780.0,units:31.2},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:28.8}]},
  {name:"Owusu, Ernestina Opokua",totalWorth:11365.0,totalUnits:114.6,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1365.0,units:54.6},{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sefa, Jeffrey Owusu",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Serwaah, Ataa",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Serwaah, Atta",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Taiymi, Maryame",totalWorth:1200.0,totalUnits:73.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2}]},
  {name:"Tawiah, Newton",totalWorth:1440.0,totalUnits:57.6,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:28.8},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:28.8}]},
  {name:"Tchummamo Fokam, Michel",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Tetey, Raissa St phanie",totalWorth:1200.0,totalUnits:73.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2}]},
  {name:"Yossa Noubissie, Nancy",totalWorth:20855.0,totalUnits:165.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
];

const FRANK_CLIENTS_SEED = [
  {name:"Abot, Marie Amélie P",totalWorth:1485.0,totalUnits:79.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2}]},
  {name:"Adamus, Elodie Marie I",totalWorth:855.0,totalUnits:45.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6}]},
  {name:"Adamus, Maxime",totalWorth:1485.0,totalUnits:79.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2}]},
  {name:"Baafour Awuah, Nana Akwasi",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Blaffart, Quentin Valentin M",totalWorth:11800.0,totalUnits:162.6,policies:[{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:68.4},{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:34.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Boateng, Frank Denbroela",totalWorth:1800.0,totalUnits:102.6,policies:[{partner:"P&V",product:"AVVIVIUM23NTFBE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1800.0,units:102.6}]},
  {name:"Boateng, Gloria",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Borceux, Mathilde Malorie D",totalWorth:1530.0,totalUnits:81.59,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59}]},
  {name:"Cisse, Mariam",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Coeffier, Sylvie",totalWorth:5980.0,totalUnits:62.28,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:480.0,units:29.28},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:5500.0,units:33.0}]},
  {name:"De Paepe, Charline Elisabeth",totalWorth:540.0,totalUnits:28.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:540.0,units:28.8}]},
  {name:"Derom, Renaud Robert",totalWorth:540.0,totalUnits:28.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:540.0,units:28.8}]},
  {name:"Dheur, Jason",totalWorth:855.0,totalUnits:45.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6}]},
  {name:"Dzisiak, C line",totalWorth:10855.0,totalUnits:105.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Genette, Alexandre",totalWorth:1080.0,totalUnits:57.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Gozza, Logan",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Jacques, Micha l",totalWorth:1575.0,totalUnits:83.99,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99}]},
  {name:"Kanku-Tuseku, B n dicte",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Martin, Fabrice",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Massillon, Valentin",totalWorth:1496.28,totalUnits:79.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8}]},
  {name:"Montant, Samiyel Therence H",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Murruni, Justine Anne",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Peignois, Jonathan Andr P",totalWorth:600.0,totalUnits:36.6,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6}]},
  {name:"Quansah, Gloria",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sarto, Brayan Thierry Z",totalWorth:11485.0,totalUnits:139.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Sixset, Adrien",totalWorth:2565.0,totalUnits:136.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1485.0,units:79.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Sixset, Dorian",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Spitaleri, Christopher",totalWorth:12130.0,totalUnits:178.19,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:600.0,units:36.6},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1530.0,units:81.59},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Theys, Annelise Claude C",totalWorth:1080.0,totalUnits:57.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1080.0,units:57.6}]},
  {name:"Tourneur, Laurie-Valerie-M",totalWorth:540.0,totalUnits:28.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:540.0,units:28.8}]},
];

const SAMUEL_CLIENTS_SEED = [
  {name:"Adjaye, Kendra",totalWorth:14116.12,totalUnits:282.47,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1764.84,units:97.07},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amah, Maguissiane",totalWorth:11260.0,totalUnits:110.4,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1260.0,units:50.4},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Amah, Varela Magnim",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Barnich, Emilie Francine J",totalWorth:1800.0,totalUnits:96.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Bolou, Yann Rapha l",totalWorth:21882.08,totalUnits:174.58,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0},{partner:"P&V",product:"NZMEER5JR",productLabel:"P&V — Épargne 5 ans",worth:705.72,units:20.47},{partner:"P&V",product:"NZMEER5JR",productLabel:"P&V — Épargne 5 ans",worth:1176.36,units:34.11}]},
  {name:"Camara, Mohamed",totalWorth:997.56,totalUnits:53.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:997.56,units:53.2}]},
  {name:"Cisse, Daouda",totalWorth:13375.0,totalUnits:239.98,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1800.0,units:95.99},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Da Fonseca Benjamin, Vanuza",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Daniel, Rebecca",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"De Souza, Jacqueline",totalWorth:11176.36,totalUnits:124.7,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1176.36,units:64.7},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Eyang-Nguema Medja, Gisela",totalWorth:1764.72,totalUnits:51.18,policies:[{partner:"P&V",product:"NZMEER5JR",productLabel:"P&V — Épargne 5 ans",worth:1764.72,units:51.18}]},
  {name:"Hadji, Landrine",totalWorth:588.24,totalUnits:32.35,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.24,units:32.35}]},
  {name:"Kaba, Fatou",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kalam, Worou-Nadjim",totalWorth:588.12,totalUnits:17.06,policies:[{partner:"P&V",product:"NZMEER5JR",productLabel:"P&V — Épargne 5 ans",worth:588.12,units:17.06}]},
  {name:"Kalisa, Daniel",totalWorth:12351.28,totalUnits:185.4,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kalisa, David",totalWorth:12992.56,totalUnits:219.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kiala, Kevin",totalWorth:705.72,totalUnits:38.81,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:705.72,units:38.81}]},
  {name:"Kofi, Emmanuel",totalWorth:11800.0,totalUnits:156.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Mballa, Emmanuel",totalWorth:997.56,totalUnits:53.2,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:997.56,units:53.2}]},
  {name:"Mutsinzi Mutunzi, Darcy",totalWorth:11496.28,totalUnits:139.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nkanda, Jordan",totalWorth:12351.28,totalUnits:185.4,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nkangala, Fortun",totalWorth:12992.56,totalUnits:219.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Nyandja, Sambel Gregory",totalWorth:2351.28,totalUnits:125.4,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6}]},
  {name:"Nyarko, Alice Sarpomaah",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Uwituse, Delphine",totalWorth:11496.28,totalUnits:139.8,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1496.28,units:79.8},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Van Weynsberghe, Dorcas Ekua",totalWorth:12473.2,totalUnits:176.58,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1176.48,units:64.71},{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:1296.72,units:51.87},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Vossah, Dzatougbe Sepopo",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Yankey, Jusinta",totalWorth:22619.72,totalUnits:242.65,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.24,units:32.35},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.24,units:32.35},{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:588.24,units:32.35},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELANLZ",productLabel:"DELA — Assurance Obsèques",worth:20000.0,units:100.0}]},
];

const ARMED_CLIENTS_SEED = [
  {name:"Darcis, J r me Patrick M",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Di Blasi, Ninfa",totalWorth:720.0,totalUnits:28.8,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:28.8}]},
  {name:"Erkan, Selima",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Filieux, B atrice Ghislaine",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Hotchamps, Jonathan",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Kuansa Sala Nsengi, Aur lie",totalWorth:8775.0,totalUnits:523.19,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:7200.0,units:439.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:1575.0,units:83.99}]},
  {name:"Langa Kinuika, Thoms",totalWorth:720.0,totalUnits:28.8,policies:[{partner:"AXA",product:"AXAPENS10",productLabel:"AXA — Pension/Épargne",worth:720.0,units:28.8}]},
  {name:"Lev que, Kiliane",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Lukanda Kab ya +, Clarisse.",totalWorth:900.0,totalUnits:54.9,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:900.0,units:54.9}]},
  {name:"Lutete Fundi, Marie Tr sor",totalWorth:2100.0,totalUnits:121.2,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"Lutete Madala, L once",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Lutete Ngimbi, Annabelle",totalWorth:9980.0,totalUnits:211.08,policies:[{partner:"P&V",product:"AVVIVIUM23BE",productLabel:"P&V VIVIUM — Épargne/Pension",worth:1200.0,units:73.2},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:6980.0,units:41.88}]},
  {name:"Lutete Nsansi, Marie-Laure",totalWorth:900.0,totalUnits:48.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0}]},
  {name:"M ssina, Pr scilia",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Perea Moreno, Fiona",totalWorth:10900.0,totalUnits:108.0,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:900.0,units:48.0},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Pietershem, Ana s",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Polard, Axelle",totalWorth:10000.0,totalUnits:60.0,policies:[{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
  {name:"Rookx, Eva",totalWorth:10855.0,totalUnits:105.6,policies:[{partner:"AXA",product:"AXAPENS20",productLabel:"AXA — Pension/Épargne",worth:855.0,units:45.6},{partner:"DELA",product:"DELA2",productLabel:"DELA — Assurance Obsèques",worth:10000.0,units:60.0}]},
];

const AUGUSTINA_CLIENTS_SEED = [
  {name:"Abban, Augustina",status:"Prospect",email:"abbantina65@gmail.com",phone:"32492171434",address:"Allée de pays-bas 22",locality:"4600 Visé",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Acheampong, Owusu Kwame",status:"Prospect",email:"owusu_calvin@yahoo.com",phone:"32499145756",address:"Rue diderot 13",locality:"4101 Jemeppe",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Addo, Simeon Opoku",status:"Prospect",email:"simeonopoku@gmail.com",phone:"32497906618",address:"Rue de cornillon 31",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Adu Gyamfi, Mary",status:"Prospect",email:"cardozohap@hotmail.com",phone:"32487338221",address:"Nachtegaalstraat 10",locality:"1800 vilvoorde",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Adukpo, Lydia Daisy",status:"Prospect",email:"adjoadaisy04@gmail.com",phone:"32467647938",address:"Quai de la goffe 6",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Aga, Charlene Brenda",status:"Prospect",email:"Brendaaga162@gmail.com",phone:"32468078790",address:"Bodson 189",locality:"4030 Grivegnée",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Agoumé, Jeanne D'Arc",status:"Prospect",email:"agou36@gmail.com",phone:"32476311076",address:"Route Napoléon 68",locality:"4400 Flémalle",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Agyam, Thomas Owusu",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
  {name:"Akinwale, Bimbo",status:"Prospect",email:"bimboakinwale6@gmail.com",phone:"32471310809",address:"Avenue Georges-Truffaut 29",locality:"4020 Liege",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Akuamoah, Emmanuel Osei",status:"Prospect",email:"oakuamoah22@gmail.com",phone:"32465847563",address:"Rue du papillon 28",locality:"4100 Seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Amofa, Vivian",status:"Prospect",email:"Ivy432.boateng@gmail.com",phone:"32499910080",address:"Aubenaslaan 24",locality:"9060 Zelzate",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Anqui, Kouassi Michel",status:"Prospect",email:"angui.michel@yahoo.com",phone:"32491897989",address:"Rue du Monténégro 175",locality:"1190 Forest",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Appeagyei, Juliana Akyeamaa",status:"Prospect",email:"julianaappeagyei@gmail.com",phone:"32466217532",address:"Frans Van Ryhovelaan 17",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Asamoah, Janet",status:"Prospect",email:"janetasamoah40a@gmail.com",phone:"32492507070",address:"Haardstedestraat 20",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Asante, Emmanuel Kojo",status:"Prospect",email:"asantebaiden2015@gmail.com",phone:"32493287216",address:"rue du moulin 248",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Asare, David",status:"Prospect",email:"davidoasare9@gmail.com",phone:"32465849239",address:"Rue henri Dunant 58",locality:"4102 Ougrée",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Asiedu, Michael",status:"Prospect",email:"asiedu725@gmail.com",phone:"32485644438",address:"Den haeckstraat 33",locality:"1800 vilvoorde",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Assan, Vida Adwoa",status:"Prospect",email:"kuofivida@gmail.com",phone:"32493305513",address:"Heernislaan 55",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Atikey, Komi",status:"Prospect",email:"komiatikey@gmail.com",phone:"32465234406",address:"Rue saint Leonard 346",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Boateng, Ophelia",status:"Prospect",email:"opheliaboateng@gmail.com",phone:"32465607617",address:"Rue des armuriers 24",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Boateng, Raphael",status:"Prospect",email:"raphboat@gmail.com",phone:"32465352131",address:"Koningin Astridlaan 166",locality:"9820 Bottelare",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Boateng, Regina",status:"Prospect",email:"reginaserwaaboateng804@gmail.com",phone:"32465483911",address:"Rue des armuriers 24",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Boye, Abraham Marmah",status:"Prospect",email:"augustinadomfeh.ovb@gmail.com",phone:"32465947535",address:"Av.Georges Petre 24",locality:"1210 St Josse",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Bremang, Salina",status:"Client",email:"bremangsalina90@gmail.com",phone:"32465808519",address:"Parvis-des-ecoliers 3",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0}]},
  {name:"Darkwaa, Patricia",status:"Prospect",email:"partdarkwaa@gmail.com",phone:"32465764208",address:"Belvedereweg 85",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Debra, Daniel",status:"Prospect",email:"dkdgh@yahoo.co.uk",phone:"32468144265",address:"Aubenaslaan 24",locality:"9060 Zelzate",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Dewanckele, Marie-José Ghislaine",status:"Prospect",email:"Dewanckelemarie-jose@gmail.com",phone:"32498717719",address:"Rue de landen 26",locality:"4280 Hannut",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Dogbe, Afi Celestine",status:"Prospect",email:"dogbvecelestine0@gmail.com",phone:"32465524889",address:"Rue Saint-Léonard 346",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Domfeh, Augustina",status:"Client",email:"domfehaugustina215@yahoo.com",phone:"32493296736",address:"Rue de fooz 28",locality:"4347 Feche-le-haut-clocher",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Domfeh, Boakye",status:"Prospect",email:"domfehaugustina215@yahoo.com",phone:"32465526870",address:"Quai de la goffe 6",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Dumfour, Solomon",status:"Client",email:"sdumfour@gmail.com",phone:"32466225069",address:"scheldestraat sint amandsberg 135",locality:"9040 Gent",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Elono Voundi, Micheline Flore",status:"Prospect",email:"floremicheline72@gmail.com",phone:"32494195420",address:"Voie du promeneur 11",locality:"4101 Jemeppe sur meuse",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Freeman, Jennies",status:"Prospect",email:"jenniesfm@gmail.com",phone:"32497367795",address:"Louis Jamme 6",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Jähner, Simonne",status:"Prospect",email:"simonejaehner@yahoo.fr",phone:"32466232841",address:"Rue du chêne 114",locality:"4100 Seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kabagabo, Elia",status:"Prospect",email:"getty.mutuyimana@gmail.com",phone:"32487427396",address:"Rue du tilleul 6",locality:"4219 Wasseiges",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kaidebi, Jennefer",status:"Prospect",email:"augustinadomfeh.ovb@gmail.com",phone:"32465947535",address:"Rue biez du moulin 229",locality:"4102 seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kankundiye Mulinda, Patricia",status:"Prospect",email:"pkankund@yahoo.fr",phone:"32478337694",address:"Rue de plainevaux 81",locality:"4100 Seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Karin, Jamotte",status:"Prospect",email:"karindaniel6@gmail.com",phone:"32490217510",address:"Rue du chene 284",locality:"4100 Seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kouassi, Anne Kra",status:"Prospect",email:"annekouassi4102@gmail.com",phone:"32491931733",address:"Rue henri Dunant 58",locality:"4102 Ougrée",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kouassi, Kra Emmanuel",status:"Prospect",email:"e.kouassi420@gmail.com",phone:"46579221",address:"Rue henri Dunant 58",locality:"4102 Ougrée",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kpodonu, Eddie Mends",status:"Prospect",email:"obaapag984@gmail.com",phone:"32466156892",address:"RUE CHAMP D'oiseaux 168",locality:"4101 Jemeppe sur meuse",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kpodonu, Gifty Amankwaa",status:"Prospect",email:"obaapag984@gmail.com",phone:"32466441964",address:"Hoogstraatje 4",locality:"2800 Mechelen",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Kwakye, Solomon",status:"Prospect",email:"solomon7kye@gmail.com",phone:"32492099600",address:"New-orleansstraat 455",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Leenars, Jean Marc",status:"Prospect",email:"jeanmarcleenars@gmail.com",phone:"32499400356",address:"Rue de la dime 25",locality:"4347 Feche-le-haut-clocher",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Lohay, Daniel Jean-Marie G",status:"Prospect",email:"Lohaydaniel@gmail.com",phone:"32494587881",address:"Rue du chene 284",locality:"4100 Seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Nfodjo, Frederick",status:"Prospect",email:"nanafred.coltd@gmail.com",phone:"32492231279",address:"Gaversesteenweg 67",locality:"9800 Deinze",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Ngang, Honor  Verlain",status:"Prospect",email:"honoreverlainngang@hotmail.com",phone:"32465525075",address:"Rue sainte Marguerite 105",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Ngo Nnong, Christine Patricia",status:"Client",email:"kuku2_1999@yahoo.fr",phone:"32470013956",address:"Ru du calvaire 4",locality:"4260 Fallais",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0}]},
  {name:"Nyarko, Gloria Ohenewaa",status:"Prospect",email:"glow725@gmail.com",phone:"32485191854",address:"Den haeckstraat 33",locality:"1800 vilvoorde",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Nyarko, Thomas",status:"Prospect",email:"nyarkokk@icloud.com",phone:"32472951630",address:"Lichtelarestraat 24",locality:"9080 Lochristi",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Obeng, Ivy",status:"Prospect",email:"obengivy69@gmail.com",phone:"32465533095",address:"rue du moulin 248",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Obeng Asante, Israel",status:"Prospect",email:"israelobeng2@gmail.com",phone:"32465834251",address:"rue du moulin 248",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Ofori, Kalvin Marcus",status:"Prospect",email:"kalvinmarcuso@gmail.com",phone:"32466258675",address:"nijverheidsstraat 3",locality:"9230 Wetteren",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Ofori-Attah, Comfort",status:"Prospect",email:"comfortoforiattah8@gmail.com",phone:"32492119948",address:"Rue de Cornillon 35",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Ofosu-Hene, Amos",status:"Prospect",email:"Ofosuheneamos@gmail.com",phone:"32466070665",address:"Rue Ferdinand Nicolay 11",locality:"4102 Ougrée",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Onguedou Nkono, Jeannette",status:"Prospect",email:"j.onguedou@outlook.fr",phone:"32468078790",address:"Rue Bodson 189",locality:"4030 Liege",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Opoku, Daniela",status:"Prospect",email:"daniela.opoku14@gmail.com",phone:"32470771386",address:"Rue victor carpentier 32",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Opoku, Mike Nana",status:"Prospect",email:"mike.opoku@yahoo.com",phone:"32470548255",address:"Rue Victor Carpentier 32",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Owusu, Baffour Osei",status:"Prospect",email:"owusu_calvin@yahoo.com",phone:"32494343348",address:"Rue Bourdouxhe 33",locality:"4102 seraing",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Peprah, Harriet Gifty",status:"Prospect",email:"harrietgiftypeprah@gmail.com",phone:"32465773837",address:"Cité des démineurs 2",locality:"4030 Liege",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Otuonye, Tatyana",status:"Prospect",email:"OTUONYETATYANA@GMAIL.COM",phone:"32465990569",address:"Rue de la Tonne 80B",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Pinamang Ampofo, Martha",status:"Prospect",email:"martha.ampofo0@gmail.com",phone:"32483640795",address:"Rue du Pont Neuf 20",locality:"1000 Bruxelles",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Saah, Ama",status:"Prospect",email:"owusu_calvin@yahoo.com",phone:"32466334306",address:"Rue Bourdouxhe 33",locality:"4102 Ougrée",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Sakara, Stella Salamatu",status:"Prospect",email:"stellasakara50@gmail.com",phone:"32466194634",address:"Pimpelmeesstraat 3",locality:"9040 Sint amandsberg Gent",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Sarpong, Kelvin Nana K",status:"Prospect",email:"kelvinsarpong685@gmail.com",phone:"32465985822",address:"Belvedereweg 85",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Tetteh, Michael",status:"Prospect",email:"amoateymichael88@gmail.com",phone:"32466310660",address:"Bredestraat 352",locality:"9300 Aalst",totalWorth:0,totalUnits:0,policies:[]},
  {name:"Wona, Koudjo Novissi",status:"Prospect",email:"cudjomonday@yahoo.com",phone:"32465424547",address:"Noormanstraat 22",locality:"9000 Gent",totalWorth:0,totalUnits:0,policies:[]},
];

const WILLIAM_CLIENTS_SEED = [
  {name:"Biselenge Bonguilli, Jean-Paul",status:"Client",email:"jbiselenge@yahoo.ie",phone:"32466483435",address:"Rue haute 298",locality:"1000 Bruxelles",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Gygy Osey Issa, Blandine",status:"Client",email:"Gygyosey1@hotmail.com",phone:"32488913971",address:"Rue de l'égalité des droits 21",locality:"1020 Laeken",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0}]},
  {name:"Lutete Bobela, Armed",status:"Client",email:"lutete.armed@hotmail.com",phone:"32470031221",address:"Hébronval 103",locality:"6690 Vielsalm",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"Ep. à Long-terme",productLabel:"Épargne à Long Terme",worth:0,units:0},{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Nginamau, Christian",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
  {name:"Njankouo, Alexis",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
  {name:"Tenkeu Tidjon, Yvan Jordan",status:"Client",email:"jordantenkeu@gmail.com",phone:"32467721448",address:"rue Edgard Doneux 12",locality:"4400 Flémalle",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0}]},
  {name:"Witsel, Coraline",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
];

const YAMBA_CLIENTS_SEED = [
  {name:"Adepoj, Mark",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
  {name:"Bocoum, Boubacar Docteur",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
  {name:"Diessongo, Safiatou",status:"Client",email:"safiatou.diessongo@gmail.com",phone:"32470690755",address:"Rue du marché 27",locality:"4020 Liège",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0}]},
  {name:"Gina, Nicole",status:"Client",email:"ryckielmboko@gmail.com",phone:"32465992731",address:"Rue Peetermans 66",locality:"4100 Seraing",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Placement",productLabel:"Placement",worth:0,units:0}]},
  {name:"Jadot, Loic",status:"Client",email:"loic.jadot@hotmail.com",phone:"32495812995",address:"Rue de Liège 172",locality:"4041 Vottem",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"Ep. à Long-terme",productLabel:"Épargne à Long Terme",worth:0,units:0},{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
  {name:"Sako, Aziz",status:"Client",email:"sakoaziz510@gmail.com",phone:"32470685233",address:"Avenue Henri Lonay 179",locality:"4430 Ans",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"Epargne Pension",productLabel:"Épargne Pension",worth:0,units:0},{partner:"",product:"Ep. à Long-terme",productLabel:"Épargne à Long Terme",worth:0,units:0}]},
  {name:"Songne Bance, Zalissa",status:"Prospect",email:null,phone:null,address:null,locality:null,totalWorth:0,totalUnits:0,policies:[]},
  {name:"Tebaldi, Aurore Paola B",status:"Client",email:"auroreteb@gmail.com",phone:"32491915707",address:"Rue sualem 109",locality:"4000 Liège",totalWorth:0,totalUnits:0,policies:[{partner:"",product:"DELA",productLabel:"DELA — Obsèques",worth:0,units:0}]},
];

const PAYOUT_HISTORY_SEED = [
  { month: "2024-07", aPro: 129, stoRes: -41.95, autre: 0, payout: 1815.45 },
  { month: "2024-08", aPro: 546.39, stoRes: -62.71, autre: 0, payout: 87.05 },
  { month: "2024-09", aPro: 839.83, stoRes: -86.74, autre: 0, payout: 483.68 },
  { month: "2024-10", aPro: 1283.67, stoRes: -140.45, autre: 0, payout: 753.09 },
  { month: "2024-11", aPro: 2335.32, stoRes: -236.41, autre: 0, payout: 1143.22 },
  { month: "2024-12", aPro: 1185.91, stoRes: -129.23, autre: 0, payout: 2098.91 },
  { month: "2025-01", aPro: 602.37, stoRes: -60.25, autre: 0, payout: 1056.68 },
  { month: "2025-02", aPro: 3010.16, stoRes: -300.96, autre: 0, payout: 542.12 },
  { month: "2025-03", aPro: 319.1, stoRes: 66.21, autre: -100, payout: 2709.20 },
  { month: "2025-04", aPro: 337.93, stoRes: -33.72, autre: 0, payout: 285.31 },
  { month: "2025-05", aPro: 631.12, stoRes: -63.04, autre: 0, payout: 304.21 },
  { month: "2025-06", aPro: 3206.97, stoRes: -170.65, autre: -150, payout: 568.08 },
  { month: "2025-07", aPro: 1097.15, stoRes: -137.54, autre: 839, payout: 2886.32 },
  { month: "2025-08", aPro: 184.06, stoRes: -50.17, autre: 0, payout: 1798.61 },
  { month: "2025-09", aPro: 1022.17, stoRes: -119, autre: 0, payout: 133.89 },
  { month: "2025-10", aPro: 267.85, stoRes: -30.93, autre: -90, payout: 903.17 },
  { month: "2025-11", aPro: 64.58, stoRes: -10.93, autre: -90, payout: 146.92 },
  { month: "2025-12", aPro: 2044.68, stoRes: -81.72, autre: -215, payout: 0 },
  { month: "2026-01", aPro: 2582.85, stoRes: -259.84, autre: -90, payout: 4356.10 },
  { month: "2026-02", aPro: 5144.04, stoRes: -514.42, autre: -240, payout: 2492.85 },
  { month: "2026-03", aPro: 3805.63, stoRes: -380.57, autre: -240, payout: 4904.04 },
  { month: "2026-04", aPro: 1236.65, stoRes: -123.68, autre: -90, payout: 3565.63 },
  { month: "2026-05", aPro: 1077.04, stoRes: -107.70, autre: -90, payout: 0 },
  { month: "2026-06", aPro: 1834.39, stoRes: -200.63, autre: -253.35, payout: 0 },
];

const PEOPLE_SEED = [
  { key: "justice", name: "Justice Forkuo", rank: "FA", seed: CLIENTS_SEED, admin: true, active: true, reportsTo: null, email: ADMIN_EMAIL },
  { key: "nana", name: "Nana Baafour Awuah", rank: "JFAIII", seed: NANA_CLIENTS_SEED, active: true, reportsTo: "justice", personalPts: 3481, notes: "FT3 — 61 clients au compteur du concours (2021-2026)." },
  { key: "samuel", name: "Samuel Ettitchi", rank: "JFAIII", seed: SAMUEL_CLIENTS_SEED, active: true, reportsTo: "justice", personalPts: 3424, notes: "FT3 — 58 clients au compteur du concours (2021-2026)." },
  { key: "frank", name: "Frank Boateng", rank: "JFAI", seed: FRANK_CLIENTS_SEED, active: true, reportsTo: "justice", personalPts: 2208, notes: "FT1 — 39 clients au compteur du concours (2021-2026)." },
  { key: "armed", name: "Armed Lutete Bobela", rank: "JFAI", seed: ARMED_CLIENTS_SEED, active: false, reportsTo: "justice" },
  { key: "augustina", name: "Domfeh Augustina", rank: "JFAI", seed: AUGUSTINA_CLIENTS_SEED, active: false, reportsTo: "justice" },
  { key: "william", name: "Biselenge William", rank: "JFAI", seed: WILLIAM_CLIENTS_SEED, active: false, reportsTo: "justice" },
  { key: "yamba", name: "Diessongo Yamba", rank: "JFAI", seed: YAMBA_CLIENTS_SEED, active: false, reportsTo: "justice" },
];

// ----------------------------------------------------------------------------
// SQL generation
// ----------------------------------------------------------------------------

function sqlStr(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}
function sqlNum(v) {
  if (v === null || v === undefined || v === "") return "0";
  return String(v);
}
function sqlBool(v) {
  return v ? "true" : "false";
}

const ids = {};
for (const p of PEOPLE_SEED) ids[p.key] = randomUUID();

let sql = `-- Generated by scripts/generate-seed.mjs — do not edit by hand.\n`;
sql += `-- Colle ce fichier dans Supabase Dashboard → SQL Editor → New query → Run,\n`;
sql += `-- APRÈS avoir exécuté supabase/schema.sql.\n\nbegin;\n\n`;

sql += `-- ---- People ----------------------------------------------------------------\n`;
for (const p of PEOPLE_SEED) {
  sql += `insert into public.people (id, name, rank, active, reports_to, email, is_admin, personal_pts, team_quarterly_pts, notes)\n`;
  sql += `values (${sqlStr(ids[p.key])}, ${sqlStr(p.name)}, ${sqlStr(p.rank)}, ${sqlBool(p.active !== false)}, ${
    p.reportsTo ? sqlStr(ids[p.reportsTo]) : "NULL"
  }, ${sqlStr(p.email)}, ${sqlBool(!!p.admin)}, ${sqlNum(p.personalPts)}, ${sqlNum(p.teamQuarterlyPts)}, ${sqlStr(p.notes)});\n\n`;
}

sql += `-- ---- Clients + polices -------------------------------------------------------\n`;
for (const p of PEOPLE_SEED) {
  for (const c of p.seed) {
    const clientId = randomUUID();
    const status = c.status || "Client";
    sql += `insert into public.clients (id, owner_id, name, status, email, phone, address, locality, total_worth, total_units)\n`;
    sql += `values (${sqlStr(clientId)}, ${sqlStr(ids[p.key])}, ${sqlStr(c.name)}, ${sqlStr(status)}, ${sqlStr(c.email)}, ${sqlStr(
      c.phone
    )}, ${sqlStr(c.address)}, ${sqlStr(c.locality)}, ${sqlNum(c.totalWorth)}, ${sqlNum(c.totalUnits)});\n`;
    for (const pol of c.policies || []) {
      sql += `insert into public.client_policies (client_id, partner, product, product_label, worth, units)\n`;
      sql += `values (${sqlStr(clientId)}, ${sqlStr(pol.partner)}, ${sqlStr(pol.product)}, ${sqlStr(pol.productLabel)}, ${sqlNum(
        pol.worth
      )}, ${sqlNum(pol.units)});\n`;
    }
  }
  sql += `\n`;
}

sql += `-- ---- Historique des paiements réels (Justice) --------------------------------\n`;
for (const m of PAYOUT_HISTORY_SEED) {
  sql += `insert into public.payout_history (person_id, month, a_pro, sto_res, autre, payout)\n`;
  sql += `values (${sqlStr(ids.justice)}, ${sqlStr(m.month)}, ${sqlNum(m.aPro)}, ${sqlNum(m.stoRes)}, ${sqlNum(m.autre)}, ${sqlNum(
    m.payout
  )});\n`;
}

sql += `\ncommit;\n`;

const outPath = path.join(__dirname, "..", "supabase", "seed.sql");
writeFileSync(outPath, sql, "utf8");

console.log(`Wrote ${outPath}`);
console.log("Person IDs (for reference):");
for (const [key, id] of Object.entries(ids)) console.log(`  ${key}: ${id}`);
console.log(
  "\nRappel : chaque personne devra créer son compte Supabase Auth avec l'email renseigné dans PEOPLE_SEED pour que sa fiche `people` se lie automatiquement (trigger handle_new_user)."
);
