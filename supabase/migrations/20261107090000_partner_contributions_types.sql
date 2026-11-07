-- Nuovi movimenti soci: apporto non monetario e credito convertito in capitale.
-- (I nuovi valori di un enum vanno aggiunti in una migrazione separata da quella che li usa.)
alter type public.g89_partner_movement_type add value if not exists 'apporto_non_monetario';
alter type public.g89_partner_movement_type add value if not exists 'conversione_in_capitale';
