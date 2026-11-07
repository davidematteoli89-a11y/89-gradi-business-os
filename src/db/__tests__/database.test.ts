/**
 * Test del database: applica le migrazioni su un Postgres in memoria (PGlite)
 * con uno stub minimo di Supabase (schema auth, ruoli, storage) e verifica
 * permessi RLS, vincoli contabili e viste.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const MIGRATIONS = join(process.cwd(), "supabase", "migrations");

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to authenticated, anon;
  grant execute on function auth.uid() to authenticated, anon;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
  grant usage on schema storage to authenticated;
  grant select, insert, update, delete on storage.objects to authenticated;
  -- come Supabase: privilegi di default sulle nuove tabelle
  grant usage on schema public to authenticated, anon;
  alter default privileges in schema public grant select, insert, update, delete on tables to authenticated, anon;
  alter default privileges in schema public grant usage on sequences to authenticated, anon;
  -- tabelle di altre applicazioni nello stesso progetto: non devono essere toccate
  create table public.contacts (id int primary key, name text);
  create table public.publications (id int primary key);
  insert into public.publications values (1);
  grant select on public.publications to anon;
`;

const U = {
  admin: "00000000-0000-0000-0000-00000000000a",
  editor: "00000000-0000-0000-0000-00000000000b",
  viewer: "00000000-0000-0000-0000-00000000000c",
  stranger: "00000000-0000-0000-0000-00000000000d",
};

let db: PGlite;

async function as<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${userId ? "authenticated" : "anon"}`);
  await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [userId ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query(`select set_config('request.jwt.claim.sub', '', false)`);
  }
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
  }
  await db.exec(`
    insert into auth.users (id) values ('${U.admin}'), ('${U.editor}'), ('${U.viewer}'), ('${U.stranger}');
    insert into public.g89_partners (id, name, short_name) values
      ('10000000-0000-0000-0000-00000000000a', 'Socio A', 'A'),
      ('10000000-0000-0000-0000-00000000000b', 'Socio B', 'B');
    insert into public.g89_app_users (user_id, role, partner_id, display_name) values
      ('${U.admin}', 'admin', '10000000-0000-0000-0000-00000000000a', 'Socio A'),
      ('${U.editor}', 'editor', '10000000-0000-0000-0000-00000000000b', 'Socio B'),
      ('${U.viewer}', 'viewer', null, 'Commercialista');
    insert into public.g89_categories (id, name, direction, nature) values
      ('20000000-0000-0000-0000-000000000001', 'Test materie', 'out', 'evento'),
      ('20000000-0000-0000-0000-000000000002', 'Test ricavi', 'in', 'evento'),
      ('20000000-0000-0000-0000-000000000003', 'Test generali', 'out', 'generale');
  `);
}, 60_000);

afterAll(async () => {
  await db?.close();
});

describe("progetto condiviso", () => {
  it("non tocca le tabelle delle altre applicazioni", async () => {
    const r = await as(null, () => db.query("select * from public.publications"));
    expect(r.rows).toHaveLength(1);
    const c = await db.query("select count(*)::int as n from public.contacts");
    expect(c.rows).toEqual([{ n: 0 }]);
  });
});

describe("RLS e permessi", () => {
  it("un utente non membro non vede nulla", async () => {
    const r = await as(U.stranger, () => db.query("select * from public.g89_categories"));
    expect(r.rows).toHaveLength(0);
  });

  it("anon non ha accesso alle tabelle", async () => {
    await expect(as(null, () => db.query("select * from public.g89_categories"))).rejects.toThrow();
  });

  it("il viewer legge ma non scrive", async () => {
    const r = await as(U.viewer, () => db.query("select * from public.g89_categories"));
    expect(r.rows).toHaveLength(15); // 12 di configurazione + 3 del test
    await expect(
      as(U.viewer, () => db.query(`insert into public.g89_contacts (kind, name) values ('cliente', 'X')`)),
    ).rejects.toThrow(/row-level security/);
  });

  it("l'editor scrive ma non modifica impostazioni e quote", async () => {
    await as(U.editor, () => db.query(`insert into public.g89_contacts (kind, name) values ('fornitore', 'Molino')`));
    const upd = await as(U.editor, () => db.query(`update public.g89_settings set vat_mode = 'ordinario' returning *`));
    expect(upd.rows).toHaveLength(0);
  });

  it("l'admin modifica le impostazioni", async () => {
    const upd = await as(U.admin, () => db.query(`update public.g89_settings set vat_mode = 'ordinario' returning vat_mode`));
    expect(upd.rows).toEqual([{ vat_mode: "ordinario" }]);
  });

  it("il non membro non può scrivere sullo storage privato", async () => {
    await expect(
      as(U.stranger, () => db.query(`insert into storage.objects (bucket_id, name) values ('g89-documenti', 'x.jpg')`)),
    ).rejects.toThrow();
    const ok = await as(U.editor, () =>
      db.query(`insert into storage.objects (bucket_id, name) values ('g89-documenti', 'ricevuta.jpg') returning name`),
    );
    expect(ok.rows).toHaveLength(1);
  });
});

describe("vincoli contabili", () => {
  it("spesa rapida: documento + pagamento con scorporo esatto e anticipo socio", async () => {
    const r = await as(U.editor, () =>
      db.query<{ id: string }>(
        `select public.g89_create_quick_expense(
          p_description => 'Mozzarella', p_document_date => '2026-06-01', p_category_id => '20000000-0000-0000-0000-000000000001',
          p_total_cents => 12345, p_vat_bp => 400, p_method => 'carta', p_payer => 'socio',
          p_partner_id => '10000000-0000-0000-0000-00000000000b') as id`,
      ),
    );
    const id = r.rows[0].id;
    const doc = await db.query<{ net_cents: number; vat_cents: number; total_cents: number }>(
      `select net_cents::int, vat_cents::int, total_cents::int from public.g89_fin_documents where id = $1`,
      [id],
    );
    expect(doc.rows[0]).toEqual({ net_cents: 11870, vat_cents: 475, total_cents: 12345 });
    const ledger = await as(U.viewer, () =>
      db.query<{ kind: string; amount_cents: number }>(
        `select kind, amount_cents::int from public.g89_v_partner_ledger where source_type = 'payment'`,
      ),
    );
    expect(ledger.rows).toEqual([{ kind: "anticipo_spesa", amount_cents: 12345 }]);
    const bal = await db.query<{ state: string }>(`select state from public.g89_v_document_balance where id = $1`, [id]);
    expect(bal.rows[0].state).toBe("pagato");
  });

  it("il viewer non può usare la spesa rapida", async () => {
    await expect(
      as(U.viewer, () =>
        db.query(
          `select public.g89_create_quick_expense('X', '2026-06-01', '20000000-0000-0000-0000-000000000003', 100, 2200)`,
        ),
      ),
    ).rejects.toThrow(/Permesso negato/);
  });

  it("rifiuta documenti con totale incoerente", async () => {
    await expect(
      db.query(`insert into public.g89_fin_documents (direction, document_date, category_id, nature, description, net_cents, vat_bp, vat_cents, total_cents)
        values ('out', '2026-01-01', '20000000-0000-0000-0000-000000000003', 'generale', 'x', 100, 2200, 22, 123)`),
    ).rejects.toThrow(/fin_documents_total_check/);
  });

  it("acconto + saldo non superano il totale del documento", async () => {
    const d = await db.query<{ id: string }>(`insert into public.g89_fin_documents (direction, document_date, category_id, nature, description, net_cents, vat_bp, vat_cents, total_cents)
      values ('in', '2026-05-01', '20000000-0000-0000-0000-000000000002', 'evento', 'Evento', 100000, 1000, 10000, 110000) returning id`);
    const id = d.rows[0].id;
    await db.query(`insert into public.g89_fin_payments (document_id, paid_on, amount_cents, method) values ($1, '2026-04-01', 33000, 'bonifico')`, [id]);
    await expect(
      db.query(`insert into public.g89_fin_payments (document_id, paid_on, amount_cents, method) values ($1, '2026-05-02', 77001, 'bonifico')`, [id]),
    ).rejects.toThrow(/supera il residuo/);
    await db.query(`insert into public.g89_fin_payments (document_id, paid_on, amount_cents, method) values ($1, '2026-05-02', 77000, 'bonifico')`, [id]);
    const bal = await db.query<{ state: string; paid_cents: number }>(
      `select state, paid_cents::int from public.g89_v_document_balance where id = $1`,
      [id],
    );
    expect(bal.rows[0]).toEqual({ state: "pagato", paid_cents: 110000 });
  });

  it("un pagamento del socio richiede il socio", async () => {
    const d = await db.query<{ id: string }>(`insert into public.g89_fin_documents (direction, document_date, category_id, nature, description, net_cents, vat_bp, vat_cents, total_cents)
      values ('in', '2026-05-01', '20000000-0000-0000-0000-000000000002', 'evento', 'Contanti', 1000, 0, 0, 1000) returning id`);
    await expect(
      db.query(`insert into public.g89_fin_payments (document_id, paid_on, amount_cents, method, payer) values ($1, '2026-05-02', 1, 'contanti', 'socio')`, [d.rows[0].id]),
    ).rejects.toThrow(/fin_payments_partner_check/);
  });

  it("un solo preventivo accettato per evento", async () => {
    const e = await db.query<{ id: string }>(`insert into public.g89_events (code, title, event_date) values ('89-2026-001', 'Test', '2026-07-01') returning id`);
    const id = e.rows[0].id;
    await db.query(`insert into public.g89_event_quotes (event_id, version, status) values ($1, 1, 'accettato')`, [id]);
    await expect(
      db.query(`insert into public.g89_event_quotes (event_id, version, status) values ($1, 2, 'accettato')`, [id]),
    ).rejects.toThrow();
  });

  it("le quote soci devono sommare al 100% (verifica a fine transazione)", async () => {
    await expect(
      db.exec(`begin; insert into public.g89_partner_shares (partner_id, share_bp, valid_from) values ('10000000-0000-0000-0000-00000000000a', 6000, '2026-01-01'); commit;`),
    ).rejects.toThrow(/100%/);
    await db.exec("rollback").catch(() => {});
    await db.exec(`begin;
      insert into public.g89_partner_shares (partner_id, share_bp, valid_from) values ('10000000-0000-0000-0000-00000000000a', 6000, '2026-01-01');
      insert into public.g89_partner_shares (partner_id, share_bp, valid_from) values ('10000000-0000-0000-0000-00000000000b', 4000, '2026-01-01');
      commit;`);
    const r = await db.query(`select * from public.g89_partner_shares`);
    expect(r.rows).toHaveLength(2);
  });

  it("la compensazione genera due voci opposte nell'estratto conto", async () => {
    await db.query(`insert into public.g89_partner_movements (partner_id, counterpart_partner_id, type, amount_cents, occurred_on, description)
      values ('10000000-0000-0000-0000-00000000000a', '10000000-0000-0000-0000-00000000000b', 'compensazione', 5000, '2026-06-01', 'B paga A')`);
    const r = await db.query<{ partner_id: string; amount_cents: number }>(
      `select partner_id, amount_cents::int from public.g89_v_partner_ledger where kind = 'compensazione' order by amount_cents`,
    );
    expect(r.rows).toEqual([
      { partner_id: "10000000-0000-0000-0000-00000000000a", amount_cents: -5000 },
      { partner_id: "10000000-0000-0000-0000-00000000000b", amount_cents: 5000 },
    ]);
  });

  it("apporto non monetario e credito convertito vanno a capitale, senza toccare la cassa", async () => {
    await db.query(`insert into public.g89_partner_movements (partner_id, type, amount_cents, occurred_on, description)
      values ('10000000-0000-0000-0000-00000000000a', 'apporto_non_monetario', 150000, '2026-06-30', 'Compenso marketing rinunciato, giugno'),
             ('10000000-0000-0000-0000-00000000000a', 'conversione_in_capitale', 2000, '2026-07-01', 'Rinuncia al rimborso')`);
    const r = await db.query<{ account: string; amount_cents: number }>(
      `select account::text, sum(amount_cents)::int as amount_cents from public.g89_v_partner_ledger
       where partner_id = '10000000-0000-0000-0000-00000000000a' and kind in ('apporto_non_monetario', 'conversione_in_capitale')
       group by account order by account`,
    );
    expect(r.rows).toEqual([
      { account: "capitale", amount_cents: 152000 },
      { account: "finanziamento", amount_cents: -2000 },
    ]);
    await expect(
      db.query(`insert into public.g89_partner_movements (partner_id, type, amount_cents, occurred_on, description)
        values ('10000000-0000-0000-0000-00000000000a', 'apporto_non_monetario', 100, '2026-06-30', '')`),
    ).rejects.toThrow(/non_cash_description/);
  });

  it("l'audit log registra autore e modifiche", async () => {
    const r = await db.query<{ n: number }>(
      `select count(*)::int as n from public.g89_audit_log where table_name = 'g89_fin_documents' and actor = $1`,
      [U.editor],
    );
    expect(r.rows[0].n).toBeGreaterThan(0);
    await expect(as(U.admin, () => db.query(`delete from public.g89_audit_log`))).rejects.toThrow();
  });
});

describe("seed dimostrativo", () => {
  it("è bloccato senza consenso esplicito", async () => {
    const seed = readFileSync(join(process.cwd(), "supabase", "seed", "demo.sql"), "utf8");
    const fresh = new PGlite();
    await fresh.exec(SUPABASE_STUB);
    for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
      await fresh.exec(readFileSync(join(MIGRATIONS, file), "utf8"));
    }
    await expect(fresh.exec(seed)).rejects.toThrow(/Seed demo bloccato/);
    await fresh.exec("set app.allow_demo_seed = 'on';");
    await fresh.exec(seed);
    const r = await fresh.query<{ n: number }>("select count(*)::int as n from public.g89_events");
    expect(r.rows[0].n).toBe(1);
    await fresh.close();
  }, 60_000);
});

describe("gestione soci", () => {
  it("solo l'admin collega un account a un socio, cercandolo per email", async () => {
    await db.exec(`update auth.users set email = 'socio.b@esempio.it' where id = '${U.stranger}'`);
    await expect(
      as(U.editor, () => db.query(`select public.g89_link_user('socio.b@esempio.it', '10000000-0000-0000-0000-00000000000b', 'editor', 'Socio B')`)),
    ).rejects.toThrow(/Permesso negato/);
    await expect(
      as(U.admin, () => db.query(`select public.g89_link_user('nessuno@esempio.it', '10000000-0000-0000-0000-00000000000b', 'editor', 'X')`)),
    ).rejects.toThrow(/Nessun account/);
    await as(U.admin, () => db.query(`select public.g89_link_user(' Socio.B@esempio.it ', '10000000-0000-0000-0000-00000000000b', 'editor', 'Socio B')`));
    const r = await as(U.admin, () => db.query<{ email: string; role: string }>(`select email, role::text from public.g89_list_access() where email = 'socio.b@esempio.it'`));
    expect(r.rows).toEqual([{ email: "socio.b@esempio.it", role: "editor" }]);
    const none = await as(U.editor, () => db.query(`select * from public.g89_list_access()`));
    expect(none.rows).toHaveLength(0);
  });
});
