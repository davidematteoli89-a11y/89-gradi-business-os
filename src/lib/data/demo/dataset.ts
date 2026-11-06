/**
 * DATI DIMOSTRATIVI — solo per sviluppo e prototipo.
 * Nessuno di questi dati è reale. Le date sono relative al giorno corrente
 * per rendere il prototipo realistico in qualsiasi momento lo si apra.
 */
import { fromNet } from "@/lib/money";
import type {
  ActivityEntry,
  BudgetLine,
  Campaign,
  Category,
  Contact,
  EventRecord,
  EventResource,
  EventStaff,
  EventTask,
  FinDocument,
  MarketingTask,
  Partner,
  PartnerMovement,
  PartnerShare,
  Payment,
  Quote,
  Resource,
  VatMode,
} from "@/lib/domain/types";

export type Dataset = ReturnType<typeof buildDemoDataset>;

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function buildDemoDataset(today: Date) {
  const base = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const d = (offset: number) => {
    const x = new Date(base);
    x.setUTCDate(x.getUTCDate() + offset);
    return iso(x);
  };
  const year = base.getUTCFullYear();

  const partners: Partner[] = [
    { id: "pa", name: "Socio A", shortName: "A", color: "#24211F" },
    { id: "pb", name: "Socio B", shortName: "B", color: "#B42332" },
  ];
  // Quote dimostrative volutamente non 50/50
  const shares: PartnerShare[] = [
    { partnerId: "pa", shareBp: 5500, validFrom: d(-400) },
    { partnerId: "pb", shareBp: 4500, validFrom: d(-400) },
  ];
  const vatMode = "da_definire" as VatMode;

  const categories: Category[] = [
    { id: "cat-ricavi-eventi", name: "Ricavi eventi", direction: "in", nature: "evento" },
    { id: "cat-materie-pizza", name: "Materie prime pizza", direction: "out", nature: "evento" },
    { id: "cat-bar", name: "Beverage e bar", direction: "out", nature: "evento" },
    { id: "cat-staff", name: "Personale extra", direction: "out", nature: "evento" },
    { id: "cat-trasporti", name: "Trasporti e carburante", direction: "out", nature: "evento" },
    { id: "cat-noleggi", name: "Noleggi", direction: "out", nature: "evento" },
    { id: "cat-attrezzature", name: "Attrezzature", direction: "out", nature: "investimento" },
    { id: "cat-assicurazioni", name: "Assicurazioni", direction: "out", nature: "ricorrente" },
    { id: "cat-software", name: "Software e abbonamenti", direction: "out", nature: "ricorrente" },
    { id: "cat-marketing", name: "Marketing e stampa", direction: "out", nature: "marketing" },
    { id: "cat-generali", name: "Spese generali", direction: "out", nature: "generale" },
  ];

  const contacts: Contact[] = [
    { id: "cl-1", kind: "cliente", name: "Chiara Bianchi e Luca Ferri", email: "chiara.demo@example.com", phone: "+39 333 000 0001" },
    { id: "cl-2", kind: "cliente", name: "Marco Rinaldi", phone: "+39 333 000 0002" },
    { id: "cl-3", kind: "cliente", name: "Studio Tecnico Arno", company: "Studio Tecnico Arno srl", email: "eventi@example.com" },
    { id: "cl-4", kind: "cliente", name: "Giulia Neri" },
    { id: "cl-5", kind: "cliente", name: "Rotary Club Valdarno", company: "Rotary Club Valdarno" },
    { id: "cl-6", kind: "cliente", name: "Famiglia Conti" },
    { id: "cl-7", kind: "cliente", name: "Officine Meccaniche Serchio", company: "OMS spa" },
    { id: "cl-8", kind: "cliente", name: "Pro Loco San Rocco" },
    { id: "cl-9", kind: "cliente", name: "Sara e Andrea Galli" },
    { id: "fo-1", kind: "fornitore", name: "Molino Val d'Elsa", company: "Molino Val d'Elsa snc" },
    { id: "fo-2", kind: "fornitore", name: "Caseificio Le Colline" },
    { id: "fo-3", kind: "fornitore", name: "Distribuzione Bevande Toscana" },
    { id: "fo-4", kind: "fornitore", name: "Noleggi Furgoni Arno" },
    { id: "fo-5", kind: "fornitore", name: "Tipografia Rapida" },
    { id: "fo-6", kind: "fornitore", name: "Forni Mobili Italia" },
    { id: "fo-7", kind: "fornitore", name: "Assicurazioni Centro" },
    { id: "co-1", kind: "collaboratore", name: "Elena Fabbri", notes: "Barlady" },
    { id: "co-2", kind: "collaboratore", name: "Tommaso Ricci", notes: "Pizzaiolo aiuto" },
    { id: "co-3", kind: "collaboratore", name: "Yassin Amrani", notes: "Servizio e logistica" },
  ];

  const events: EventRecord[] = [
    { id: "ev-1", code: `89-${year}-014`, title: "Matrimonio Bianchi–Ferri", clientId: "cl-1", status: "confermato", date: d(9), startTime: "19:30", endTime: "01:00", venueName: "Villa Le Corti", venueAddress: "San Casciano in Val di Pesa (FI)", guests: 140, hasPizza: true, hasCocktail: true, leadSource: "Instagram" },
    { id: "ev-2", code: `89-${year}-016`, title: "40 anni di Marco", clientId: "cl-2", status: "in_preparazione", date: d(3), startTime: "20:00", endTime: "23:30", venueName: "Giardino privato", venueAddress: "Empoli (FI)", guests: 60, hasPizza: true, hasCocktail: false, leadSource: "Passaparola" },
    { id: "ev-3", code: `89-${year}-017`, title: "Aperitivo aziendale Studio Arno", clientId: "cl-3", status: "trattativa", date: d(24), startTime: "18:30", endTime: "21:30", venueName: "Terrazza dello studio", venueAddress: "Firenze", guests: 80, hasPizza: false, hasCocktail: true, leadSource: "Sito web" },
    { id: "ev-4", code: `89-${year}-018`, title: "Laurea di Giulia", clientId: "cl-4", status: "preventivo", date: d(31), startTime: "19:00", endTime: "23:00", venueName: "Agriturismo Il Poggio", venueAddress: "Montespertoli (FI)", guests: 45, hasPizza: true, hasCocktail: true, leadSource: "Instagram" },
    { id: "ev-5", code: `89-${year}-019`, title: "Cena di gala Rotary", clientId: "cl-5", status: "richiesta", date: d(52), venueName: "Da definire", guests: 120, hasPizza: true, hasCocktail: true, leadSource: "Email" },
    { id: "ev-6", code: `89-${year}-012`, title: "Battesimo Conti", clientId: "cl-6", status: "completato", date: d(-12), startTime: "12:30", endTime: "16:00", venueName: "Casa Conti", venueAddress: "Vinci (FI)", guests: 50, hasPizza: true, hasCocktail: false },
    { id: "ev-7", code: `89-${year}-011`, title: "Festa aziendale OMS", clientId: "cl-7", status: "completato", date: d(-26), startTime: "19:00", endTime: "00:00", venueName: "Stabilimento OMS", venueAddress: "Lucca", guests: 180, hasPizza: true, hasCocktail: true, leadSource: "Passaparola" },
    { id: "ev-8", code: `89-${year}-013`, title: "Sagra di San Rocco", clientId: "cl-8", status: "annullato", date: d(-5), venueName: "Piazza San Rocco", guests: 300, hasPizza: true, hasCocktail: false, notes: "Annullata per maltempo, nessun acconto versato." },
    { id: "ev-9", code: `89-${year}-009`, title: "Matrimonio Galli", clientId: "cl-9", status: "completato", date: d(-48), startTime: "19:30", endTime: "01:30", venueName: "Tenuta Montalbano", venueAddress: "Carmignano (PO)", guests: 110, hasPizza: true, hasCocktail: true, leadSource: "Fiera sposi" },
  ];

  const q = (
    id: string,
    eventId: string,
    status: Quote["status"],
    lines: [Quote["lines"][number]["service"], string, number, number, number][],
    version = 1,
    created = -30,
  ): Quote => ({
    id,
    eventId,
    version,
    status,
    createdAt: d(created),
    lines: lines.map(([service, description, qty, unitPriceCents, vatBp], i) => ({
      id: `${id}-l${i}`,
      service,
      description,
      qty,
      unitPriceCents,
      vatBp,
    })),
  });

  const quotes: Quote[] = [
    q("qt-1a", "ev-1", "rifiutato", [["pizza", "Pizza a buffet", 140, 2000, 1000], ["cocktail", "Open bar 4 ore", 140, 1800, 2200]], 1, -70),
    q("qt-1", "ev-1", "accettato", [["pizza", "Pizza a buffet, 4 gusti a rotazione", 140, 1800, 1000], ["cocktail", "Open bar 3 ore, 6 signature", 140, 1600, 2200], ["extra", "Trasferta e allestimento", 1, 25000, 2200]], 2, -55),
    q("qt-2", "ev-2", "accettato", [["pizza", "Pizza al tavolo, menu degustazione", 60, 2200, 1000], ["extra", "Trasferta", 1, 8000, 2200]], 1, -20),
    q("qt-3", "ev-3", "inviato", [["cocktail", "Aperitivo con 4 cocktail e finger", 80, 2500, 2200]], 1, -6),
    q("qt-4", "ev-4", "bozza", [["pizza", "Pizza a buffet", 45, 2000, 1000], ["cocktail", "Bar 2 ore", 45, 1500, 2200]], 1, -2),
    q("qt-6", "ev-6", "accettato", [["pizza", "Pizza a buffet", 50, 1900, 1000]], 1, -40),
    q("qt-7", "ev-7", "accettato", [["pizza", "Pizza a buffet", 180, 1600, 1000], ["cocktail", "Open bar 3 ore", 180, 1400, 2200], ["extra", "Trasferta Lucca", 1, 30000, 2200]], 1, -60),
    q("qt-9", "ev-9", "accettato", [["pizza", "Pizza a buffet", 110, 1900, 1000], ["cocktail", "Open bar 4 ore", 110, 1900, 2200]], 1, -110),
  ];

  const budget: BudgetLine[] = [
    { id: "bd-1", eventId: "ev-1", service: "pizza", description: "Farine, mozzarella, condimenti", amountCents: 52000, kind: "previsto" },
    { id: "bd-2", eventId: "ev-1", service: "cocktail", description: "Distillati, sciroppi, ghiaccio", amountCents: 61000, kind: "previsto" },
    { id: "bd-3", eventId: "ev-1", service: "generale", description: "Staff extra (3 persone)", amountCents: 54000, kind: "previsto" },
    { id: "bd-4", eventId: "ev-1", service: "generale", description: "Furgone e carburante", amountCents: 18000, kind: "stimato" },
    { id: "bd-5", eventId: "ev-2", service: "pizza", description: "Materie prime", amountCents: 24000, kind: "previsto" },
    { id: "bd-6", eventId: "ev-2", service: "generale", description: "Aiuto pizzaiolo", amountCents: 12000, kind: "previsto" },
    { id: "bd-7", eventId: "ev-3", service: "cocktail", description: "Beverage e finger", amountCents: 70000, kind: "stimato" },
    { id: "bd-8", eventId: "ev-6", service: "pizza", description: "Materie prime", amountCents: 19000, kind: "previsto" },
    { id: "bd-9", eventId: "ev-7", service: "pizza", description: "Materie prime", amountCents: 62000, kind: "previsto" },
    { id: "bd-10", eventId: "ev-7", service: "cocktail", description: "Beverage", amountCents: 74000, kind: "previsto" },
    { id: "bd-11", eventId: "ev-7", service: "generale", description: "Staff e trasferta", amountCents: 90000, kind: "previsto" },
    { id: "bd-12", eventId: "ev-9", service: "pizza", description: "Materie prime", amountCents: 41000, kind: "previsto" },
    { id: "bd-13", eventId: "ev-9", service: "cocktail", description: "Beverage", amountCents: 52000, kind: "previsto" },
    { id: "bd-14", eventId: "ev-9", service: "generale", description: "Staff", amountCents: 48000, kind: "previsto" },
  ];

  let docSeq = 0;
  const doc = (p: Omit<FinDocument, "id" | "vatCents" | "totalCents" | "docType"> & Partial<Pick<FinDocument, "docType">>): FinDocument => {
    const { vat, gross } = fromNet(p.netCents, p.vatBp);
    docSeq++;
    return { id: `doc-${docSeq}`, docType: "fattura", vatCents: vat, totalCents: gross, ...p };
  };

  const documents: FinDocument[] = [
    // Ricavi eventi
    doc({ direction: "in", number: `${year}/21`, documentDate: d(-48), dueDate: d(-48), contactId: "cl-9", categoryId: "cat-ricavi-eventi", eventId: "ev-9", service: "pizza", nature: "evento", description: "Matrimonio Galli — servizio pizza", netCents: 209000, vatBp: 1000 }),
    doc({ direction: "in", number: `${year}/22`, documentDate: d(-48), dueDate: d(-48), contactId: "cl-9", categoryId: "cat-ricavi-eventi", eventId: "ev-9", service: "cocktail", nature: "evento", description: "Matrimonio Galli — cocktail bar", netCents: 209000, vatBp: 2200 }),
    doc({ direction: "in", number: `${year}/24`, documentDate: d(-26), dueDate: d(4), contactId: "cl-7", categoryId: "cat-ricavi-eventi", eventId: "ev-7", service: "pizza", nature: "evento", description: "Festa aziendale OMS — pizza", netCents: 288000, vatBp: 1000 }),
    doc({ direction: "in", number: `${year}/25`, documentDate: d(-26), dueDate: d(4), contactId: "cl-7", categoryId: "cat-ricavi-eventi", eventId: "ev-7", service: "cocktail", nature: "evento", description: "Festa aziendale OMS — cocktail bar e trasferta", netCents: 282000, vatBp: 2200 }),
    doc({ direction: "in", number: `${year}/27`, documentDate: d(-12), dueDate: d(-12), contactId: "cl-6", categoryId: "cat-ricavi-eventi", eventId: "ev-6", service: "pizza", nature: "evento", description: "Battesimo Conti — pizza", netCents: 95000, vatBp: 1000 }),
    doc({ direction: "in", number: `${year}/29`, documentDate: d(-40), dueDate: d(9), contactId: "cl-1", categoryId: "cat-ricavi-eventi", eventId: "ev-1", service: "pizza", nature: "evento", description: "Matrimonio Bianchi–Ferri — pizza", netCents: 252000, vatBp: 1000 }),
    doc({ direction: "in", number: `${year}/30`, documentDate: d(-40), dueDate: d(9), contactId: "cl-1", categoryId: "cat-ricavi-eventi", eventId: "ev-1", service: "cocktail", nature: "evento", description: "Matrimonio Bianchi–Ferri — cocktail bar e trasferta", netCents: 249000, vatBp: 2200 }),
    doc({ direction: "in", number: `${year}/31`, documentDate: d(-15), dueDate: d(3), contactId: "cl-2", categoryId: "cat-ricavi-eventi", eventId: "ev-2", service: "pizza", nature: "evento", description: "40 anni di Marco — pizza e trasferta", netCents: 140000, vatBp: 1000 }),

    // Costi eventi
    doc({ direction: "out", docType: "fattura", number: "M-882", documentDate: d(-50), dueDate: d(-20), contactId: "fo-1", categoryId: "cat-materie-pizza", eventId: "ev-9", service: "pizza", nature: "evento", description: "Farine e semola", netCents: 18400, vatBp: 400, hasAttachment: true }),
    doc({ direction: "out", docType: "scontrino", documentDate: d(-49), contactId: "fo-2", categoryId: "cat-materie-pizza", eventId: "ev-9", service: "pizza", nature: "evento", description: "Fiordilatte e burrata", netCents: 23800, vatBp: 400, hasAttachment: true }),
    doc({ direction: "out", documentDate: d(-50), dueDate: d(-20), contactId: "fo-3", categoryId: "cat-bar", eventId: "ev-9", service: "cocktail", nature: "evento", description: "Distillati e mixer", netCents: 48600, vatBp: 2200, hasAttachment: true }),
    doc({ direction: "out", docType: "ricevuta", documentDate: d(-48), contactId: "co-1", categoryId: "cat-staff", eventId: "ev-9", service: "generale", nature: "evento", description: "Barlady — Elena Fabbri", netCents: 18000, vatBp: 0 }),
    doc({ direction: "out", docType: "ricevuta", documentDate: d(-48), contactId: "co-3", categoryId: "cat-staff", eventId: "ev-9", service: "generale", nature: "evento", description: "Servizio — Yassin Amrani", netCents: 15000, vatBp: 0 }),
    doc({ direction: "out", documentDate: d(-28), dueDate: d(2), contactId: "fo-1", categoryId: "cat-materie-pizza", eventId: "ev-7", service: "pizza", nature: "evento", description: "Farine, semola, lievito", netCents: 26500, vatBp: 400, hasAttachment: true }),
    doc({ direction: "out", docType: "scontrino", documentDate: d(-27), contactId: "fo-2", categoryId: "cat-materie-pizza", eventId: "ev-7", service: "pizza", nature: "evento", description: "Mozzarella e salumi", netCents: 38200, vatBp: 400, hasAttachment: true }),
    doc({ direction: "out", documentDate: d(-28), dueDate: d(-3), contactId: "fo-3", categoryId: "cat-bar", eventId: "ev-7", service: "cocktail", nature: "evento", description: "Beverage festa OMS", netCents: 71200, vatBp: 2200, hasAttachment: true }),
    doc({ direction: "out", documentDate: d(-26), dueDate: d(-26), contactId: "fo-4", categoryId: "cat-noleggi", eventId: "ev-7", service: "generale", nature: "evento", description: "Noleggio furgone frigo 2 giorni", netCents: 22000, vatBp: 2200 }),
    doc({ direction: "out", docType: "ricevuta", documentDate: d(-26), contactId: "co-1", categoryId: "cat-staff", eventId: "ev-7", service: "generale", nature: "evento", description: "Barlady festa OMS — Elena Fabbri", netCents: 20000, vatBp: 0 }),
    doc({ direction: "out", docType: "ricevuta", documentDate: d(-26), contactId: "co-2", categoryId: "cat-staff", eventId: "ev-7", service: "generale", nature: "evento", description: "Aiuto pizzaiolo — Tommaso Ricci", netCents: 18000, vatBp: 0 }),
    doc({ direction: "out", docType: "scontrino", documentDate: d(-26), categoryId: "cat-trasporti", eventId: "ev-7", service: "generale", nature: "evento", description: "Carburante Lucca A/R", netCents: 7377, vatBp: 2200, hasAttachment: true }),
    doc({ direction: "out", docType: "scontrino", documentDate: d(-13), contactId: "fo-2", categoryId: "cat-materie-pizza", eventId: "ev-6", service: "pizza", nature: "evento", description: "Materie prime battesimo", netCents: 17600, vatBp: 400, hasAttachment: true }),
    doc({ direction: "out", docType: "scontrino", documentDate: d(-1), contactId: "fo-1", categoryId: "cat-materie-pizza", eventId: "ev-2", service: "pizza", nature: "evento", description: "Farine per i 40 anni di Marco", netCents: 9200, vatBp: 400, hasAttachment: true }),
    doc({ direction: "out", documentDate: d(-4), dueDate: d(26), contactId: "fo-3", categoryId: "cat-bar", eventId: "ev-1", service: "cocktail", nature: "evento", description: "Ordine beverage matrimonio Bianchi–Ferri", netCents: 58900, vatBp: 2200 }),

    // Investimenti iniziali
    doc({ direction: "out", number: "FMI-1201", documentDate: d(-380), dueDate: d(-350), contactId: "fo-6", categoryId: "cat-attrezzature", service: "pizza", nature: "investimento", description: "Forno a legna mobile su carrello", netCents: 980000, vatBp: 2200, hasAttachment: true }),
    doc({ direction: "out", documentDate: d(-370), contactId: "fo-6", categoryId: "cat-attrezzature", service: "cocktail", nature: "investimento", description: "Banco bar mobile e attrezzatura", netCents: 310000, vatBp: 2200, hasAttachment: true }),
    doc({ direction: "out", documentDate: d(-360), categoryId: "cat-attrezzature", service: "generale", nature: "investimento", description: "Gazebo, tavoli e illuminazione", netCents: 145000, vatBp: 2200 }),

    // Ricorrenti e generali
    doc({ direction: "out", documentDate: d(-35), dueDate: d(-5), contactId: "fo-7", categoryId: "cat-assicurazioni", service: "generale", nature: "ricorrente", description: "RC catering — rata trimestrale", netCents: 34000, vatBp: 0 }),
    doc({ direction: "out", documentDate: d(-6), dueDate: d(24), categoryId: "cat-software", service: "generale", nature: "ricorrente", description: "Software gestionale e dominio", netCents: 2400, vatBp: 2200 }),
    doc({ direction: "out", documentDate: d(-18), dueDate: d(12), contactId: "fo-5", categoryId: "cat-marketing", service: "generale", nature: "marketing", description: "Stampa menu e biglietti da visita", netCents: 16500, vatBp: 2200, hasAttachment: true }),
    doc({ direction: "out", docType: "ricevuta", documentDate: d(-9), categoryId: "cat-marketing", service: "generale", nature: "marketing", description: "Sponsorizzate Instagram ottobre", netCents: 15000, vatBp: 2200 }),
    doc({ direction: "out", docType: "scontrino", documentDate: d(-2), categoryId: "cat-generali", service: "generale", nature: "generale", description: "Detersivi e materiale pulizia", netCents: 3770, vatBp: 2200, hasAttachment: true }),
  ];

  const byDesc = (s: string) => {
    const f = documents.find((x) => x.description.startsWith(s));
    if (!f) throw new Error(`demo: documento ${s} mancante`);
    return f;
  };

  let paySeq = 0;
  const pay = (docPrefix: string, paidOn: string, amount: number | "all", method: Payment["method"], payer?: string): Payment => {
    const f = byDesc(docPrefix);
    paySeq++;
    return {
      id: `pay-${paySeq}`,
      documentId: f.id,
      paidOn,
      amountCents: amount === "all" ? f.totalCents : amount,
      method,
      payer: payer ? "socio" : "azienda",
      partnerId: payer,
    };
  };

  const payments: Payment[] = [
    // Incassi
    pay("Matrimonio Galli — servizio pizza", d(-90), 70000, "bonifico"),
    pay("Matrimonio Galli — servizio pizza", d(-47), byDesc("Matrimonio Galli — servizio pizza").totalCents - 70000, "bonifico"),
    pay("Matrimonio Galli — cocktail bar", d(-47), "all", "bonifico"),
    pay("Festa aziendale OMS — pizza", d(-50), 100000, "bonifico"),
    pay("Battesimo Conti — pizza", d(-12), 60000, "contanti", "pb"),
    pay("Battesimo Conti — pizza", d(-10), byDesc("Battesimo Conti — pizza").totalCents - 60000, "bonifico"),
    pay("Matrimonio Bianchi–Ferri — pizza", d(-38), 83160, "bonifico"),
    pay("Matrimonio Bianchi–Ferri — cocktail", d(-38), 91134, "bonifico"),
    pay("40 anni di Marco", d(-4), 50000, "bonifico"),
    // Uscite
    pay("Farine e semola", d(-22), "all", "bonifico"),
    pay("Fiordilatte e burrata", d(-49), "all", "carta", "pa"),
    pay("Distillati e mixer", d(-21), "all", "bonifico"),
    pay("Barlady — Elena Fabbri", d(-47), 18000, "contanti"),
    pay("Servizio — Yassin Amrani", d(-47), "all", "contanti", "pb"),
    pay("Farine, semola, lievito", d(-10), "all", "bonifico"),
    pay("Mozzarella e salumi", d(-27), "all", "carta", "pa"),
    pay("Noleggio furgone frigo", d(-26), "all", "carta"),
    pay("Barlady festa OMS", d(-25), 20000, "contanti"),
    pay("Aiuto pizzaiolo — Tommaso Ricci", d(-25), "all", "contanti", "pa"),
    pay("Carburante Lucca", d(-26), "all", "carta", "pb"),
    pay("Materie prime battesimo", d(-13), "all", "carta", "pb"),
    pay("Farine per i 40 anni", d(-1), "all", "carta", "pa"),
    pay("Forno a legna mobile", d(-375), 600000, "bonifico", "pa"),
    pay("Forno a legna mobile", d(-350), byDesc("Forno a legna mobile").totalCents - 600000, "bonifico"),
    pay("Banco bar mobile", d(-370), "all", "bonifico", "pb"),
    pay("Gazebo, tavoli", d(-360), "all", "bonifico"),
    pay("Sponsorizzate Instagram", d(-9), "all", "carta", "pb"),
    pay("Detersivi", d(-2), "all", "carta", "pa"),
  ];

  const movements: PartnerMovement[] = [
    { id: "mv-1", partnerId: "pa", type: "conferimento", amountCents: 800000, occurredOn: d(-400), description: "Conferimento iniziale" },
    { id: "mv-2", partnerId: "pb", type: "conferimento", amountCents: 650000, occurredOn: d(-400), description: "Conferimento iniziale" },
    { id: "mv-3", partnerId: "pb", type: "prestito", amountCents: 300000, occurredOn: d(-365), description: "Prestito per avvio stagione" },
    { id: "mv-4", partnerId: "pa", type: "rimborso", amountCents: 400000, occurredOn: d(-200), description: "Rimborso parziale anticipo forno" },
    { id: "mv-5", partnerId: "pb", type: "restituzione_prestito", amountCents: 100000, occurredOn: d(-60), description: "Prima restituzione prestito" },
  ];

  const tasks: EventTask[] = [
    { id: "tk-1", eventId: "ev-2", label: "Confermare menu degustazione", phase: "prima", dueDate: d(-2), done: true, assigneePartnerId: "pa" },
    { id: "tk-2", eventId: "ev-2", label: "Ordinare fiordilatte (60 ospiti)", phase: "prima", dueDate: d(1), done: false, assigneePartnerId: "pa" },
    { id: "tk-3", eventId: "ev-2", label: "Impasti: avvio maturazione 48h", phase: "prima", dueDate: d(1), done: false, assigneePartnerId: "pa" },
    { id: "tk-4", eventId: "ev-2", label: "Check carico forno e legna", phase: "carico", dueDate: d(3), done: false, assigneePartnerId: "pb" },
    { id: "tk-5", eventId: "ev-2", label: "Incassare saldo", phase: "evento", dueDate: d(3), done: false, assigneePartnerId: "pb" },
    { id: "tk-6", eventId: "ev-2", label: "Rientro attrezzatura e pulizia", phase: "rientro", dueDate: d(4), done: false },
    { id: "tk-7", eventId: "ev-1", label: "Sopralluogo Villa Le Corti", phase: "prima", dueDate: d(-6), done: true, assigneePartnerId: "pb" },
    { id: "tk-8", eventId: "ev-1", label: "Definire 6 signature con gli sposi", phase: "prima", dueDate: d(2), done: false, assigneePartnerId: "pb" },
    { id: "tk-9", eventId: "ev-1", label: "Confermare staff (3 persone)", phase: "prima", dueDate: d(4), done: false, assigneePartnerId: "pa" },
    { id: "tk-10", eventId: "ev-1", label: "Ordine ghiaccio 80 kg", phase: "prima", dueDate: d(7), done: false },
    { id: "tk-11", eventId: "ev-1", label: "Carico banco bar e forno", phase: "carico", dueDate: d(9), done: false },
    { id: "tk-12", eventId: "ev-1", label: "Incassare saldo", phase: "evento", dueDate: d(9), done: false, assigneePartnerId: "pa" },
    { id: "tk-13", eventId: "ev-3", label: "Richiamare per conferma preventivo", phase: "prima", dueDate: d(0), done: false, assigneePartnerId: "pb" },
    { id: "tk-14", eventId: "ev-4", label: "Inviare preventivo", phase: "prima", dueDate: d(1), done: false, assigneePartnerId: "pa" },
  ];

  const staff: EventStaff[] = [
    { id: "st-1", eventId: "ev-1", contactId: "co-1", role: "Barlady", hours: 7, agreedCents: 20000 },
    { id: "st-2", eventId: "ev-1", contactId: "co-2", role: "Aiuto pizzaiolo", hours: 7, agreedCents: 18000 },
    { id: "st-3", eventId: "ev-1", contactId: "co-3", role: "Servizio e logistica", hours: 8, agreedCents: 16000 },
    { id: "st-4", eventId: "ev-2", contactId: "co-2", role: "Aiuto pizzaiolo", hours: 5, agreedCents: 12000 },
  ];

  const resources: Resource[] = [
    { id: "rs-1", kind: "attrezzatura", name: "Forno a legna mobile", unit: "pz" },
    { id: "rs-2", kind: "attrezzatura", name: "Banco bar mobile", unit: "pz" },
    { id: "rs-3", kind: "attrezzatura", name: "Gazebo 3×3", unit: "pz" },
    { id: "rs-4", kind: "attrezzatura", name: "Frigo a pozzetto", unit: "pz" },
    { id: "rs-5", kind: "attrezzatura", name: "Pale e accessori forno", unit: "set" },
    { id: "rs-6", kind: "materiale", name: "Legna di faggio", unit: "kg", supplierId: undefined },
    { id: "rs-7", kind: "materiale", name: "Ghiaccio alimentare", unit: "kg", supplierId: "fo-3" },
    { id: "rs-8", kind: "prodotto", name: "Farina tipo 1", unit: "kg", supplierId: "fo-1" },
    { id: "rs-9", kind: "prodotto", name: "Fiordilatte", unit: "kg", supplierId: "fo-2" },
    { id: "rs-10", kind: "materiale", name: "Bicchieri compostabili", unit: "pz" },
  ];

  const eventResources: EventResource[] = [
    { id: "er-1", eventId: "ev-2", resourceId: "rs-1", qty: 1, transport: "Carrello", loaded: false, returned: false },
    { id: "er-2", eventId: "ev-2", resourceId: "rs-5", qty: 1, loaded: false, returned: false },
    { id: "er-3", eventId: "ev-2", resourceId: "rs-6", qty: 40, transport: "Furgone", loaded: false, returned: false },
    { id: "er-4", eventId: "ev-1", resourceId: "rs-1", qty: 1, transport: "Carrello", loaded: false, returned: false },
    { id: "er-5", eventId: "ev-1", resourceId: "rs-2", qty: 1, transport: "Furgone", loaded: false, returned: false },
    { id: "er-6", eventId: "ev-1", resourceId: "rs-3", qty: 2, transport: "Furgone", loaded: false, returned: false },
    { id: "er-7", eventId: "ev-1", resourceId: "rs-7", qty: 80, loaded: false, returned: false },
    { id: "er-8", eventId: "ev-1", resourceId: "rs-10", qty: 500, loaded: false, returned: false },
  ];

  const campaigns: Campaign[] = [
    { id: "cp-1", name: "Stagione matrimoni", startsOn: d(-30), endsOn: d(120), budgetCents: 120000, status: "attiva" },
    { id: "cp-2", name: "Feste aziendali di dicembre", startsOn: d(-5), endsOn: d(40), budgetCents: 60000, status: "attiva" },
  ];

  const marketingTasks: MarketingTask[] = [
    { id: "mk-1", title: "Menu personalizzato Bianchi–Ferri", type: "menu", eventId: "ev-1", ownerPartnerId: "pb", status: "in_approvazione", dueDate: d(4), internalMinutes: 120, fileCount: 3, latestVersion: 3 },
    { id: "mk-2", title: "Cartellino cocktail signature", type: "grafica", eventId: "ev-1", ownerPartnerId: "pb", status: "in_corso", dueDate: d(6), internalMinutes: 60, fileCount: 1, latestVersion: 1 },
    { id: "mk-3", title: "Reel backstage festa OMS", type: "social", eventId: "ev-7", ownerPartnerId: "pa", status: "pubblicato", dueDate: d(-20), internalMinutes: 180 },
    { id: "mk-4", title: "Carosello 'Pizza al matrimonio'", type: "social", campaignId: "cp-1", ownerPartnerId: "pa", status: "da_fare", dueDate: d(2), internalMinutes: 90 },
    { id: "mk-5", title: "Sponsorizzata feste aziendali", type: "social", campaignId: "cp-2", ownerPartnerId: "pb", status: "in_corso", dueDate: d(5), externalCostCents: 30000 },
    { id: "mk-6", title: "Brochure aziendali A5", type: "stampa", campaignId: "cp-2", ownerPartnerId: "pa", status: "in_approvazione", dueDate: d(8), externalCostCents: 21000, fileCount: 2, latestVersion: 2 },
    { id: "mk-7", title: "Biglietti da visita ristampa", type: "stampa", ownerPartnerId: "pa", status: "approvato", dueDate: d(-4), externalCostCents: 6500, fileCount: 1, latestVersion: 1 },
    { id: "mk-8", title: "Foto prodotto nuovo menu", type: "grafica", ownerPartnerId: "pb", status: "da_fare", dueDate: d(14), internalMinutes: 240 },
    { id: "mk-9", title: "Story countdown 40 anni di Marco", type: "social", eventId: "ev-2", ownerPartnerId: "pa", status: "da_fare", dueDate: d(2), internalMinutes: 20 },
    { id: "mk-10", title: "Menu stampato laurea Giulia", type: "menu", eventId: "ev-4", status: "da_fare", dueDate: d(25) },
  ];

  const now = base.getTime();
  const at = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000 + 17 * 3600_000).toISOString();
  const activity: ActivityEntry[] = [
    { id: "ac-1", at: at(2), actorPartnerId: "pa", action: "creato", entity: "Spesa", summary: "Detersivi e materiale pulizia · 46,00 €", href: "/finanze" },
    { id: "ac-2", at: at(5), actorPartnerId: "pb", action: "caricato", entity: "Marketing", summary: "Menu Bianchi–Ferri, versione 3", href: "/marketing" },
    { id: "ac-3", at: at(20), actorPartnerId: "pa", action: "creato", entity: "Spesa", summary: "Farine per i 40 anni di Marco · 95,68 €", href: "/finanze" },
    { id: "ac-4", at: at(30), actorPartnerId: "pb", action: "modificato", entity: "Evento", summary: "Studio Arno passato a Trattativa", href: "/eventi/ev-3" },
    { id: "ac-5", at: at(52), actorPartnerId: "pa", action: "creato", entity: "Preventivo", summary: "Laurea di Giulia, bozza v1", href: "/eventi/ev-4" },
    { id: "ac-6", at: at(96), actorPartnerId: "pb", action: "creato", entity: "Spesa", summary: "Ordine beverage matrimonio Bianchi–Ferri", href: "/finanze" },
    { id: "ac-7", at: at(150), actorPartnerId: "pb", action: "pagato", entity: "Incasso", summary: "Battesimo Conti, saldo ricevuto", href: "/finanze" },
  ];

  return {
    today: d(0),
    currentUser: { name: "Socio A", partnerId: "pa" as string | undefined, role: "admin" as "admin" | "editor" | "viewer" },
    partners,
    shares,
    vatMode,
    categories,
    contacts,
    events,
    quotes,
    budget,
    documents,
    payments,
    movements,
    tasks,
    staff,
    resources,
    eventResources,
    campaigns,
    marketingTasks,
    activity,
  };
}
