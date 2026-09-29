"""Build data/elements.json for the periodic table page.

Inputs
  data/elemental-property-list.xlsx
                 the lab property list, one row per element (sheet 1). Never modified here,
                 so it stays identical to the copy in pca-plsda-activity.
  data/element-meta.csv
                 one row per column: key, label, unit, category, scale, description, source.
                 scale: linear | log | symlog | category
  data/element-corrections.csv
                 cell fixes applied on top of the xlsx; a blank value hides the cell.
                 status "reviewed" keeps the cell as is and silences its validation warning.
  mendeleev      names, series and electron configurations for all 118 elements, plus the
                 extra properties listed in MENDELEEV_PROPERTIES.

Run
  .venv/bin/python scripts/build_elements.py          validate, then write data/elements.json
  .venv/bin/python scripts/build_elements.py --check  validation report only
  .venv/bin/python scripts/build_elements.py --raw    validate the sheet without corrections
"""

import argparse
import json
import math
import unicodedata
import warnings
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

warnings.filterwarnings("ignore")  # mendeleev/SQLAlchemy deprecation chatter

ROOT = Path(__file__).resolve().parent.parent
XLSX = ROOT / "data" / "elemental-property-list.xlsx"
META_CSV = ROOT / "data" / "element-meta.csv"
CORRECTIONS_CSV = ROOT / "data" / "element-corrections.csv"
OUT = ROOT / "data" / "elements.json"

HARTREE_EV = 27.211386245988
SIG_DIGITS = 5

CATEGORY_ORDER = [
    "Basics", "Chemical scales", "Electronic structure", "Ionization & affinity",
    "Electronegativity", "Radii", "Thermal & physical", "Mechanical", "Electrical",
    "Nuclear", "Structure", "Miedema model", "History & supply", "Derived",
    "DFT (free atom, NIST SRD 141)",
]

# mendeleev column -> (key, label, unit, category, scale, description)
MENDELEEV_PROPERTIES = {
    "pettifor_number": ("pettifor_number", "Pettifor number", "", "Chemical scales", "linear",
                        "Pettifor's chemical scale: similar elements get neighbouring numbers."),
    "glawe_number": ("glawe_number", "Glawe number", "", "Chemical scales", "linear",
                     "Data-driven chemical scale from Glawe et al. (2016)."),
    "atomic_radius_rahm": ("atomic_radius_rahm", "Atomic radius (Rahm)", "pm", "Radii", "linear",
                           "Computed radii that also cover the noble gases."),
    "lattice_structure": ("lattice_structure", "Crystal structure of the element", "", "Structure",
                          "category", "Ground-state lattice of the pure element."),
    "lattice_constant": ("lattice_constant", "Lattice constant", "Å", "Structure", "linear", ""),
    "en_miedema": ("miedema_phi", "Miedema φ*", "V", "Miedema model", "linear",
                   "Electronegativity-like parameter of Miedema's model for alloy formation enthalpies."),
    "miedema_electron_density": ("miedema_nws", "Miedema electron density n_ws^1/3", "d.u.^1/3",
                                 "Miedema model", "linear", ""),
    "miedema_molar_volume": ("miedema_volume", "Miedema molar volume V^2/3", "cm²", "Miedema model",
                             "linear", ""),
    "discovery_year": ("discovery_year", "Discovery year", "", "History & supply", "linear",
                       "Blank for elements known since antiquity."),
    "abundance_crust": ("abundance_crust", "Abundance in Earth's crust", "mg/kg", "History & supply",
                        "log", ""),
    "price_per_kg": ("price_per_kg", "Price", "USD/kg", "History & supply", "log", ""),
    "relative_supply_risk": ("supply_risk", "Relative supply risk", "1–10", "History & supply",
                             "linear", "Royal Society of Chemistry supply-risk index."),
}

DERIVED = {
    "spin_polarization": ("Spin-polarization energy", "eV", "Derived", "linear",
                          "E(LDA) − E(LSD) of the free atom: the energy gained by letting spins "
                          "polarize. Zero for closed shells, largest for half-filled shells (Hund's rule)."),
    "relativistic_energy": ("Relativistic energy", "eV", "Derived", "log",
                            "E(LDA) − E(RLDA) of the free atom: the extra binding from relativity, "
                            "growing roughly as Z⁴. It is why gold is yellow and mercury is liquid."),
    "pugh_ratio": ("Pugh ratio B/G", "", "Derived", "linear",
                   "Bulk over shear modulus; above about 1.75 a metal tends to be ductile."),
    "poisson_ratio": ("Poisson's ratio", "", "Derived", "linear",
                      "From the bulk and shear moduli: (3B − 2G) / (6B + 2G)."),
    "pc1": ("PCA component 1", "", "Derived", "linear", "First principal component of the element properties."),
    "pc2": ("PCA component 2", "", "Derived", "linear", "Second principal component of the element properties."),
}

CATEGORY_LABELS = {
    "quantum_l": {0: "s", 1: "p", 2: "d", 3: "f"},
    "metal_class": {1: "metal", 2: "metalloid", 3: "nonmetal"},
    "family_code": {1: "alkali metals", 2: "alkaline earth metals", 3: "Sc, Y, lanthanides & actinides",
                    4: "transition metals", 5: "post-transition metals", 6: "metalloids",
                    7: "nonmetals", 8: "halogens"},
    "lattice_structure": {"BCC": "body-centred cubic", "FCC": "face-centred cubic", "HEX": "hexagonal",
                          "DIA": "diamond", "ORC": "orthorhombic", "RHL": "rhombohedral",
                          "TET": "tetragonal", "CUB": "cubic (complex)", "MCL": "monoclinic",
                          "SC": "simple cubic"},
}

# The 72 features of FEATURE_GROUPS_PCA in the pca-plsda-activity project
# (config/feature_groups.py), processed the same way as its server/pca.py.
PCA_COLUMNS = [
    # Basic atomic properties
    "Atomic weight", "Atomic number", "Period", "Group", "Families",
    # Atomic & ionic radii
    "Atomic radius calculated", "Covalent radius", "Ionic radius", "Effective ionic radius",
    "Miracle radius", "van der Waals radius", "Zunger radii sum", "Crystal radius",
    "Covalent CSD radius", "Slater radius", "Orbital radius", "polarizability, A^3",
    "1st Bohr radius (a0)",
    # Electronegativity & electron affinity
    "Ionization energy (eV)", "Electron affinity (ev)", "Pauling EN", "Martynov Batsanov EN",
    "Mulliken EN", "Allred EN", "Allred Rockow EN", "Nagle EN", "Ghosh EN",
    # Thermal & physical properties
    "Melting point, K", "Boiling point, K", "Density,  g/mL", "Specific heat, J/g K",
    "Heat of fusion,  kJ/mol", "Heat of vaporization,  kJ/mol", "Heat of atomization,  kJ/mol",
    "Thermal conductivity, W/m K", "Cohesive  energy", "Bulk modulus, GPa",
    # Electronic structure
    "Mendeleev number", "quantum  number l", "valence s", "valence p", "valence d", "valence f",
    "unfilled s", "unfilled p", "unfilled d", "unfilled f", "no. of  valence  electrons",
    "outer shell electrons", "Gilman no. of valence electrons", "Metallic  valence", "Zeff",
    # DFT
    *[f"DFT {fun} {part}" for fun in ("LDA", "LSD", "RLDA", "ScRLDA")
      for part in ("Etot", "Ekin", "Ecoul", "Eenuc", "Exc")],
]
PCA_ANCHORS = ("Atomic number", "Pauling EN")  # loadings made positive on PC1, PC2

GASES = {"H", "He", "N", "O", "F", "Ne", "Cl", "Ar", "Kr", "Xe", "Rn"}
LIQUIDS = {"Br", "Hg"}


def norm(text):
    return unicodedata.normalize("NFKC", str(text)).strip()


def round_sig(x, digits=SIG_DIGITS):
    if x is None or isinstance(x, str):
        return x
    x = float(x)
    if not math.isfinite(x):
        return None
    return 0.0 if x == 0 else float(f"{x:.{digits}g}")


# ---------------------------------------------------------------- inputs
def read_workbook(apply_corrections):
    props = pd.read_excel(XLSX, sheet_name=0)
    meta = pd.read_csv(META_CSV, encoding="utf-8-sig").fillna("")
    fixes = pd.read_csv(CORRECTIONS_CSV, encoding="utf-8-sig")

    props.columns = [norm(c) for c in props.columns]
    meta["column"] = meta["column"].map(norm)
    props = props.set_index("Symbol")

    unknown = sorted(set(props.columns) - set(meta["column"]))
    if unknown:
        print(f"! columns without a meta row (using defaults): {unknown}")
        for col in unknown:
            meta.loc[len(meta)] = {"column": col, "key": col.lower().replace(" ", "_"),
                                   "label": col, "unit": "", "category": "Other", "scale": "",
                                   "description": "", "source": ""}

    applied, reviewed = [], set()
    if apply_corrections:
        for fix in fixes.itertuples(index=False):
            col, sym = norm(fix.column), fix.symbol
            if col not in props.columns or sym not in props.index:
                print(f"! correction skipped, no cell {sym} / {col}")
                continue
            if fix.status == "reviewed":
                reviewed.add((sym, col))
                continue
            old = props.at[sym, col]
            props.at[sym, col] = np.nan if pd.isna(fix.value) else float(fix.value)
            applied.append({"symbol": sym, "column": col, "old": old, "new": fix.value,
                            "status": fix.status, "note": fix.note})
    return props, meta, applied, reviewed


def read_mendeleev():
    from mendeleev.fetch import fetch_table

    els = fetch_table("elements")
    series = fetch_table("series").set_index("id")["name"]
    els["series"] = els["series_id"].map(series)
    return els.set_index("atomic_number").sort_index()


# ---------------------------------------------------------------- checks
def neighbours(props):
    """Table neighbours of each element: Z±1 in the same period, same group in period±1."""
    pos = {s: (int(r["Period"]), int(r["Group"]), int(r["Atomic number"])) for s, r in props.iterrows()}
    by_z = {z: s for s, (_, _, z) in pos.items()}
    by_pg = {}
    for s, (p, g, z) in pos.items():
        by_pg.setdefault((p, g), []).append(s)
    out = {}
    for s, (p, g, z) in pos.items():
        near = [by_z[n] for n in (z - 1, z + 1) if n in by_z and pos[by_z[n]][0] == p]
        for dp in (-1, 1):
            near += [t for t in by_pg.get((p + dp, g), []) if t != s]
        out[s] = near
    return out


def validate(props, meta, reviewed=frozenset()):
    issues = []

    # 1. Copy-paste rows: an element whose whole DFT block equals another element's.
    for fun in ("LDA", "LSD", "RLDA", "ScRLDA"):
        cols = [c for c in props.columns if c.startswith(f"DFT {fun} ")]
        block = props[cols].round(6)
        dupes = block[block.duplicated(keep=False)]
        for key, group in dupes.groupby(list(cols)):
            issues.append(f"DFT {fun} block identical for {', '.join(group.index)}")

    # 2. Free-atom total energies must fall monotonically with Z.
    by_z = props.sort_values("Atomic number")
    for fun in ("LDA", "LSD", "RLDA", "ScRLDA"):
        etot = by_z[f"DFT {fun} Etot"]
        for a, b in zip(etot.index[:-1], etot.index[1:]):
            if etot[b] >= etot[a]:
                issues.append(f"DFT {fun} Etot does not decrease from {a} to {b}")

    # 3. Likely typos: far from the table neighbours and a statistical outlier.
    near = neighbours(props)
    scales = dict(zip(meta["column"], meta["scale"]))
    for col in props.columns:
        if col.startswith("DFT ") or scales.get(col) == "category":
            continue
        values = pd.to_numeric(props[col], errors="coerce")
        log = scales.get(col) == "log" and (values.dropna() > 0).all()
        t = np.log10(values) if log else values
        med = t.median()
        mad = (t - med).abs().median() * 1.4826 or t.std()
        if not mad or np.isnan(mad):
            continue
        for sym, v in t.dropna().items():
            ref = t[near[sym]].dropna()
            if (sym, col) in reviewed or len(ref) < 2 or abs(v - med) / mad < 5:
                continue
            gap = abs(v - ref.median()) if log else abs(values[sym]) / max(abs(values[near[sym]].median()), 1e-12)
            if (log and gap > 3) or (not log and (gap > 2.5 or gap < 0.4)):
                shown = values[near[sym]].dropna().round(4).to_dict()
                issues.append(f"{sym}: {col} = {values[sym]:.4g} (neighbours {shown})")
    return issues


# ---------------------------------------------------------------- build
def derived_values(props):
    def col(name):
        return pd.to_numeric(props[name], errors="coerce")

    spin = (col("DFT LDA Etot") - col("DFT LSD Etot")) * HARTREE_EV
    rel = (col("DFT LDA Etot") - col("DFT RLDA Etot")) * HARTREE_EV
    bulk, shear = col("Bulk modulus, GPa"), col("Sheer modulus, GPa")
    return {
        "spin_polarization": spin.clip(lower=0),
        "relativistic_energy": rel.where(rel > 0),
        "pugh_ratio": bulk / shear,
        "poisson_ratio": (3 * bulk - 2 * shear) / (6 * bulk + 2 * shear),
    }


def pca(props, meta):
    """As in pca-plsda-activity: raw values (no log), drop columns with any NaN,
    drop zero-variance columns, standardize (StandardScaler, ddof=0), PCA."""
    columns = [norm(c) for c in PCA_COLUMNS]
    missing = [c for c in columns if c not in props.columns]
    if missing:
        print(f"! PCA columns not in the sheet: {missing}")
    frame = props[[c for c in columns if c in props.columns]].astype(float)
    frame = frame.dropna(axis=1, how="any")
    frame = frame.loc[:, frame.std(ddof=0) > 0]
    z = (frame - frame.mean()) / frame.std(ddof=0)
    u, s, vt = np.linalg.svd(z.to_numpy(), full_matrices=False)
    # Fix the arbitrary SVD sign with anchors (heavier -> right, more electronegative
    # -> up) rather than "largest loading positive", which flips on near-tied loadings.
    for i, anchor in enumerate(PCA_ANCHORS):
        if vt[i, list(frame.columns).index(norm(anchor))] < 0:
            u[:, i] *= -1
            vt[i] *= -1
    scores = u[:, :2] * s[:2]
    explained = (s ** 2 / (s ** 2).sum())[:2]
    labels = dict(zip(meta["column"], meta["label"]))
    top = lambda i: [[labels[k], round(float(w), 3)] for k, w in
                     sorted(zip(frame.columns, vt[i]), key=lambda kw: -abs(kw[1]))[:6]]
    summary = {"n": len(frame), "features": [labels[k] for k in frame.columns],
               "explained": [round(float(e), 4) for e in explained],
               "loadings": {"pc1": top(0), "pc2": top(1)}}
    return pd.Series(scores[:, 0], index=frame.index), pd.Series(scores[:, 1], index=frame.index), summary


def build(props, meta, applied):
    els = read_mendeleev()
    symbols = els["symbol"].tolist()
    in_sheet = set(props.index)

    elements = []
    for z, row in els.iterrows():
        sym = row["symbol"]
        year = row["discovery_year"]
        state = "unknown" if z >= 100 else "gas" if sym in GASES else "liquid" if sym in LIQUIDS else "solid"
        elements.append({
            "Z": int(z), "symbol": sym, "name": row["name"], "block": row["block"],
            "series": row["series"], "econf": row["electronic_configuration"],
            "state": state, "radioactive": bool(row["is_radioactive"]), "inSheet": sym in in_sheet,
            "ancient": bool(pd.isna(year) and z <= 83),
            "discoverers": None if pd.isna(row["discoverers"]) else row["discoverers"],
            "discoveryLocation": None if pd.isna(row["discovery_location"]) else row["discovery_location"],
        })

    def aligned(series):
        """Reindex a per-symbol series to Z order (all 118 elements)."""
        return [round_sig(v) if not pd.isna(v) else None for v in series.reindex(symbols)]

    prop_meta, values = [], {}
    for m in meta.itertuples(index=False):
        values[m.key] = aligned(pd.to_numeric(props[m.column], errors="coerce"))
        prop_meta.append({"key": m.key, "label": m.label, "unit": m.unit, "category": m.category,
                          "scale": m.scale or "linear", "description": m.description,
                          "source": m.source or "Lab elemental property list", "source_sheet": True})

    for col, (key, label, unit, cat, scale, desc) in MENDELEEV_PROPERTIES.items():
        series = els.set_index("symbol")[col]
        values[key] = [None if pd.isna(v) else (v if isinstance(v, str) else round_sig(v))
                       for v in series.reindex(symbols)]
        prop_meta.append({"key": key, "label": label, "unit": unit, "category": cat, "scale": scale,
                          "description": desc, "source": "mendeleev (Python package)", "source_sheet": False})

    for key, series in derived_values(props).items():
        label, unit, cat, scale, desc = DERIVED[key]
        values[key] = aligned(series)
        prop_meta.append({"key": key, "label": label, "unit": unit, "category": cat, "scale": scale,
                          "description": desc, "source": "Computed from the lab property list",
                          "source_sheet": False})

    pc1, pc2, pca_summary = pca(props, meta)
    for key, series in (("pc1", pc1), ("pc2", pc2)):
        label, unit, cat, scale, desc = DERIVED[key]
        values[key] = [round_sig(v, 4) if not pd.isna(v) else None for v in series.reindex(symbols)]
        prop_meta.append({"key": key, "label": label, "unit": unit, "category": cat, "scale": scale,
                          "description": desc, "source": "Computed from the lab property list",
                          "source_sheet": False})

    for p in prop_meta:
        p.pop("source_sheet")
        if p["key"] in CATEGORY_LABELS:
            p["labels"] = {str(k): v for k, v in CATEGORY_LABELS[p["key"]].items()}
        present = sum(v is not None for v in values[p["key"]])
        p["coverage"] = present

    keys_by_column = dict(zip(meta["column"], meta["key"]))
    corrections = [{"symbol": a["symbol"], "key": keys_by_column[a["column"]],
                    "status": a["status"], "note": a["note"]} for a in applied]

    categories = [c for c in CATEGORY_ORDER if any(p["category"] == c for p in prop_meta)]
    categories += sorted({p["category"] for p in prop_meta} - set(categories))
    return {
        "generated": date.today().isoformat(),
        "categories": categories,
        "properties": prop_meta,
        "elements": elements,
        "values": values,
        "pca": pca_summary,
        "corrections": corrections,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--check", action="store_true", help="validation report only")
    parser.add_argument("--raw", action="store_true", help="validate without applying corrections")
    args = parser.parse_args()

    props, meta, applied, reviewed = read_workbook(apply_corrections=not args.raw)
    if applied:
        by_status = {}
        for a in applied:
            by_status.setdefault(a["status"], []).append(a["symbol"])
        summary = "; ".join(f"{s}: {', '.join(sorted(set(v)))}" for s, v in by_status.items())
        print(f"Applied {len(applied)} corrections ({summary}); {len(reviewed)} cells marked reviewed")

    issues = validate(props, meta, reviewed)
    print(f"Validation: {len(issues)} issue(s)" + (":" if issues else " — clean"))
    for issue in issues:
        print(f"  ! {issue}")
    if args.check or args.raw:
        return

    data = build(props, meta, applied)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"Wrote {OUT.relative_to(ROOT)}: {len(data['elements'])} elements, "
          f"{len(data['properties'])} properties, {OUT.stat().st_size / 1024:.0f} KB; "
          f"PCA on {data['pca']['n']} elements explains "
          f"{sum(data['pca']['explained']):.0%} in 2 components")


if __name__ == "__main__":
    main()
