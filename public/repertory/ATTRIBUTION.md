# Repertory data attribution

`kent.json` (the "Repertorium Publicum" option in HOM-COMPASS) is derived from
the **OOREP / OpenRep** project's open database.

- **Source:** OOREP — Open Online Repertory — <https://github.com/nondeterministic/oorep>
  (see also <https://www.oorep.com/>)
- **Repertory:** *Repertorium Publicum*, compiled by Vladimir Polony (2008), a
  public Kentian repertory (English).
- **Licence:** **GPL-3.0**, as published with the OpenRep/OOREP source.

The rubric texts, remedy names and grades were extracted from the OOREP
PostgreSQL dump (`oorep.sql.gz`) and reformatted into the compact JSON this app
loads (`scripts/ingestion/gen_publicum.py`). No rubric/remedy/grade content was
altered.

> **Note on licensing:** this repertory dataset is distributed under the GPL-3.0.
> If you redistribute HOM-COMPASS including this file, comply with the GPL-3.0
> terms for this data (retain this attribution and licence notice, and make the
> corresponding source available). The bundled **Study Seed** repertory
> (`seed.json`) is original to this project and is not GPL-encumbered.
