import type { BasisPoints, Cents } from "@/lib/money";

/** Data ISO yyyy-mm-dd */
export type ISODate = string;

export type Service = "pizza" | "cocktail" | "extra";
export type CostService = "pizza" | "cocktail" | "generale";
export type VatMode = "ordinario" | "forfettario" | "da_definire";

export type Partner = {
  id: string;
  name: string;
  shortName: string;
  color: string;
};

export type PartnerShare = { partnerId: string; shareBp: BasisPoints; validFrom: ISODate };

export type EventStatus =
  | "richiesta"
  | "preventivo"
  | "trattativa"
  | "confermato"
  | "in_preparazione"
  | "completato"
  | "annullato";

export type Contact = {
  id: string;
  kind: "cliente" | "fornitore" | "collaboratore";
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  notes?: string;
};

export type QuoteLine = {
  id: string;
  service: Service;
  description: string;
  qty: number;
  unitPriceCents: Cents;
  vatBp: BasisPoints;
};

export type Quote = {
  id: string;
  eventId: string;
  version: number;
  status: "bozza" | "inviato" | "accettato" | "rifiutato";
  lines: QuoteLine[];
  createdAt: ISODate;
};

export type BudgetLine = {
  id: string;
  eventId: string;
  service: CostService;
  description: string;
  amountCents: Cents;
  /** previsto = da preventivo fornitore; stimato = stima interna */
  kind: "previsto" | "stimato";
};

export type EventTask = {
  id: string;
  eventId: string;
  label: string;
  phase: "prima" | "carico" | "evento" | "rientro";
  dueDate?: ISODate;
  done: boolean;
  assigneePartnerId?: string;
};

export type EventStaff = {
  id: string;
  eventId: string;
  contactId: string;
  role: string;
  hours?: number;
  agreedCents?: Cents;
};

export type EventResource = {
  id: string;
  eventId: string;
  resourceId: string;
  qty: number;
  transport?: string;
  loaded: boolean;
  returned: boolean;
};

export type EventRecord = {
  id: string;
  code: string;
  title: string;
  clientId: string;
  status: EventStatus;
  date: ISODate;
  startTime?: string;
  endTime?: string;
  venueName: string;
  venueAddress?: string;
  guests: number;
  hasPizza: boolean;
  hasCocktail: boolean;
  leadSource?: string;
  notes?: string;
};

export type DocDirection = "in" | "out";
export type CostNature = "evento" | "generale" | "ricorrente" | "investimento" | "marketing";
export type PaymentMethod = "contanti" | "carta" | "bonifico" | "pos" | "altro";

export type FinDocument = {
  id: string;
  direction: DocDirection;
  docType: "fattura" | "ricevuta" | "scontrino" | "proforma" | "altro";
  number?: string;
  documentDate: ISODate;
  dueDate?: ISODate;
  contactId?: string;
  categoryId: string;
  eventId?: string;
  service?: CostService;
  nature: CostNature;
  description: string;
  netCents: Cents;
  vatBp: BasisPoints;
  vatCents: Cents;
  totalCents: Cents;
  hasAttachment?: boolean;
};

export type Payment = {
  id: string;
  documentId: string;
  paidOn: ISODate;
  amountCents: Cents;
  method: PaymentMethod;
  payer: "azienda" | "socio";
  partnerId?: string;
};

export type Category = {
  id: string;
  name: string;
  direction: DocDirection;
  nature: CostNature;
};

export type PartnerMovementType =
  | "conferimento"
  | "prestito"
  | "restituzione_prestito"
  | "rimborso"
  | "versamento"
  | "prelievo"
  | "compensazione";

export type PartnerAccount = "finanziamento" | "capitale";

export type PartnerMovement = {
  id: string;
  partnerId: string;
  /** solo per compensazione: il socio che riceve il credito */
  counterpartPartnerId?: string;
  type: PartnerMovementType;
  /** usato da "versamento" per scegliere il conto; per gli altri tipi è derivato */
  account?: PartnerAccount;
  amountCents: Cents;
  occurredOn: ISODate;
  description: string;
};

export type Campaign = {
  id: string;
  name: string;
  startsOn: ISODate;
  endsOn?: ISODate;
  budgetCents: Cents;
  status: "pianificata" | "attiva" | "conclusa";
};

export type MarketingTaskStatus =
  | "da_fare"
  | "in_corso"
  | "in_approvazione"
  | "approvato"
  | "pubblicato"
  | "annullato";

export type MarketingTask = {
  id: string;
  title: string;
  type: "social" | "stampa" | "grafica" | "menu" | "altro";
  eventId?: string;
  campaignId?: string;
  ownerPartnerId?: string;
  status: MarketingTaskStatus;
  dueDate?: ISODate;
  externalCostCents?: Cents;
  internalMinutes?: number;
  fileCount?: number;
  latestVersion?: number;
  notes?: string;
};

export type Resource = {
  id: string;
  kind: "attrezzatura" | "materiale" | "prodotto";
  name: string;
  unit: string;
  supplierId?: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  actorPartnerId: string;
  action: "creato" | "modificato" | "eliminato" | "pagato" | "caricato" | "approvato";
  entity: string;
  summary: string;
  href?: string;
};
