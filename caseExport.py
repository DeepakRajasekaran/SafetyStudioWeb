#!/usr/bin/env python3
"""
generate_casesxml.py
====================
Generates a monitoring case table (.casesxml) from a field definition file
(.sdxml) for use in SICK Safety Designer with nanoScan3 Pro safety lidars.

NEW BEHAVIOUR (to prevent invalid checksum / Hash error)
---------------------------------------------------------
* Reads a TEMPLATE .casesxml file (provided via --template).
* Keeps the **exact** root <SdImportExport> attributes (including both xmlns
  declarations, Timestamp and Hash) **and** the entire <FileInfo> section
  100% untouched from the template.
* Only replaces <Configuration>, <Cases>, <Evals> and <FieldsConfiguration>.
* Uses clean pretty-printing that produces the exact formatting style you
  showed (no extra blank lines, correct 2-space indentation).

All original logic for case building, field assignment, binary pins, etc.
remains exactly the same.

Usage (command-line)
--------------------
    python generate_casesxml.py
    python generate_casesxml.py --input RightRear.sdxml --output my_table.casesxml --template my_template.casesxml

Edit the three path constants below if you prefer not to use CLI arguments.
"""
import xml.etree.ElementTree as ET
from xml.dom import minidom
import argparse
import sys
import os

# ┌─────────────────────────────────────────────────────────────────────────┐
# │ USER-EDITABLE PATHS – change these to match your project layout         │
# └─────────────────────────────────────────────────────────────────────────┘
INPUT_SDXML = "LeftFront1.sdxml"                    # path to your .sdxml
OUTPUT_CASESXML = "Monitoring case table 1.casesxml"  # desired output
TEMPLATE_CASESXML = "Monitoring case table template1.casesxml"            # your working template

# ──────────────────────────────────────────────────────────────────────────
# Fixed constants (do not change unless you change lidar hardware config)
MAX_BINARY_CASES = 16
MC16_BINARY_IDX = 15
NUM_CUTOFF_PATHS = 2

# ──────────────────────────────────────────────────────────────────────────
# Parsing
# ──────────────────────────────────────────────────────────────────────────
def parse_sdxml(filepath: str) -> list[dict]:
    if not os.path.isfile(filepath):
        sys.exit(f"[ERROR] Input file not found: {filepath}")
    tree = ET.parse(filepath)
    root = tree.getroot()
    fieldsets_elem = root.find("Fieldsets")
    if fieldsets_elem is None:
        sys.exit("[ERROR] <Fieldsets> element not found in the sdxml file.")
    records = []
    for fs_idx, fieldset in enumerate(fieldsets_elem.findall("Fieldset")):
        fs_name = fieldset.get("Name", f"Set {fs_idx + 1}")
        for f_idx, field in enumerate(fieldset.findall("Field")):
            records.append({
                "fieldset_name": fs_name,
                "fieldset_index": fs_idx,
                "field_index_in_set": f_idx,
                "field_name": field.get("Name", ""),
                "fieldtype": field.get("Fieldtype", "ProtectiveSafeBlanking"),
                "multiple_sampling": int(field.get("MultipleSampling", "2")),
                "resolution": int(field.get("Resolution", "70")),
                "tolerance_positive": int(field.get("TolerancePositive", "0")),
                "tolerance_negative": int(field.get("ToleranceNegative", "0")),
            })
    if not records:
        sys.exit("[ERROR] No <Field> elements found inside <Fieldsets>.")
    return records

# ──────────────────────────────────────────────────────────────────────────
# Binary-pin encoding
# ──────────────────────────────────────────────────────────────────────────
def binary_pin_matches(case_index: int) -> tuple[str, str, str, str]:
    return (
        "High" if (case_index >> 3) & 1 else "Low",
        "High" if (case_index >> 2) & 1 else "Low",
        "High" if (case_index >> 1) & 1 else "Low",
        "High" if (case_index >> 0) & 1 else "Low",
    )

# ──────────────────────────────────────────────────────────────────────────
# Field-ID resolver
# ──────────────────────────────────────────────────────────────────────────
def get_user_field_id(case_index: int, cutoff_path: int,
                      n_user_fields: int, perm_green_id: int) -> int:
    if cutoff_path == 1:
        uid = 2 * case_index + 1
    else:
        uid = 2 * case_index + 2
    return uid if uid <= n_user_fields else perm_green_id

# ──────────────────────────────────────────────────────────────────────────
# Active-case list builder
# ──────────────────────────────────────────────────────────────────────────
def build_active_cases(n_user_fields: int) -> list[int]:
    active = [ci for ci in range(MC16_BINARY_IDX)
              if (2 * ci + 1) <= n_user_fields]
    active.append(MC16_BINARY_IDX)
    return active

def _sub(parent, tag, text=None):
    """Shorthand: create sub-element, optionally set .text, return element."""
    el = ET.SubElement(parent, tag)
    if text is not None:
        el.text = str(text)
    return el

# ──────────────────────────────────────────────────────────────────────────
# Core generation – now based on template with exact formatting
# ──────────────────────────────────────────────────────────────────────────
def generate_casesxml(sdxml_fields: list[dict], template_path: str, output_path: str = None) -> str:
    """Load template, keep root + FileInfo untouched, replace everything else."""
    n = len(sdxml_fields)
    perm_red_id = n + 1
    perm_green_id = n + 2
    perm_green_wf_id = n + 3

    active_cases = build_active_cases(n)

    def fid(ci: int, cutoff_path: int) -> int:
        if ci == MC16_BINARY_IDX:
            return perm_green_id
        return get_user_field_id(ci, cutoff_path, n, perm_green_id)

    # ── Load template ─────────────────────────────────────────────────────
    if not os.path.isfile(template_path):
        sys.exit(f"[ERROR] Template file not found: {template_path}")

    tree = ET.parse(template_path)
    root = tree.getroot()

    # Save the EXACT original root attributes (xmlns + Timestamp + Hash)
    # This guarantees they are never lost during rebuild.
    original_attrib = dict(root.attrib)

    # Remove ONLY the sections we will regenerate.
    # <FileInfo> is left completely untouched.
    for tag in ["Configuration", "Cases", "Evals", "FieldsConfiguration"]:
        for elem in list(root.findall(tag)):
            root.remove(elem)

    # ── Rebuild Configuration ─────────────────────────────────────────────
    cfg = _sub(root, "Configuration")
    _sub(cfg, "Name", "Monitoring case table 1")
    sis_src = _sub(cfg, "StaticInputSource")
    _sub(sis_src, "Source", "StaticInputSource_LocalIo")
    _sub(sis_src, "StaticActivation", "Antivalent")

    pin_cfg = [
        (2, "false"), (1, "false"),
        (3, "true"), (4, "true"), (5, "true"), (6, "true"),
    ]
    sis = _sub(cfg, "StaticInputs")
    for ranking, evaluate in pin_cfg:
        si = _sub(sis, "StaticInput")
        _sub(si, "Ranking", ranking)
        _sub(si, "Evaluate", evaluate)

    _sub(cfg, "UseSpeed", "false")
    _sub(cfg, "InputDelay", "12")
    _sub(cfg, "CaseSequenceEnabled", "false")
    _sub(cfg, "ShowPermanentPreset", "false")

    # ── Rebuild Cases ─────────────────────────────────────────────────────
    cases_el = _sub(root, "Cases")
    for display_idx, ci in enumerate(active_cases):
        c_pin, d_pin, e_pin, f_pin = binary_pin_matches(ci)
        case_el = ET.SubElement(cases_el, "Case")
        case_el.set("Id", str(display_idx))
        _sub(case_el, "Name", f"Monitoring case {ci + 1}")
        _sub(case_el, "SleepMode", "false")
        _sub(case_el, "DisplayOrder", display_idx)
        act = _sub(case_el, "Activation")
        act_sis = _sub(act, "StaticInputs")
        for match in ["DontCare", "DontCare", c_pin, d_pin, e_pin, f_pin]:
            si = _sub(act_sis, "StaticInput")
            _sub(si, "Match", match)
        _sub(act, "StaticInputs1ofNIndex", "-1")
        _sub(act, "SpeedActivation", "Off")
        _sub(act, "MinSpeed", "0")
        _sub(act, "MaxSpeed", "0")
        _sub(act, "CaseNumber", ci + 1)
        foll = _sub(act, "FollowingCases")
        for _ in range(NUM_CUTOFF_PATHS):
            fc = _sub(foll, "FollowingCase")
            _sub(fc, "CaseIndex", "-1")
        _sub(act, "SingleStepSequencePos", "-1")

    # ── Rebuild Evals ─────────────────────────────────────────────────────
    evals_el = _sub(root, "Evals")
    eval_defs = [
        (1, "true", "false", 1),
        (2, "false", "true", 2),
    ]
    for eval_id, ossd1, ossd2, q_val in eval_defs:
        ev = ET.SubElement(evals_el, "Eval")
        ev.set("Id", str(eval_id))
        _sub(ev, "Name", f"Cut-off path {eval_id}")
        ossds = _sub(ev, "OSSDs")
        for rank, use in [(1, ossd1), (2, ossd2)]:
            ossd = _sub(ossds, "OSSD")
            _sub(ossd, "Ranking", rank)
            _sub(ossd, "Use", use)
        uni_ios = _sub(ev, "UniIos")
        for rank in range(1, 5):
            uio = _sub(uni_ios, "UniIo")
            _sub(uio, "Ranking", rank)
            _sub(uio, "Use", "false")
        _sub(ev, "Q", q_val)
        reset = _sub(ev, "Reset")
        _sub(reset, "ResetType", "NoReset")
        _sub(reset, "AutoResetTime", "2")
        _sub(reset, "EvalResetSource", "EvalResetSource_None")

        eval_cases = _sub(ev, "Cases")
        for display_idx, ci in enumerate(active_cases):
            ec = ET.SubElement(eval_cases, "Case")
            ec.set("Id", str(display_idx))
            sps = _sub(ec, "ScanPlanes")
            sp = ET.SubElement(sps, "ScanPlane")
            sp.set("Id", "1")
            _sub(sp, "UserFieldId", fid(ci, eval_id))
            _sub(sp, "IsSplitted", "true")

        pp = _sub(ev, "PermanentPreset")
        pps = _sub(pp, "ScanPlanes")
        psp = ET.SubElement(pps, "ScanPlane")
        psp.set("Id", "1")
        _sub(psp, "FieldMode", perm_green_id)

    # ── Rebuild FieldsConfiguration ───────────────────────────────────────
    fc_el = _sub(root, "FieldsConfiguration")
    sp_el = _sub(fc_el, "ScanPlanes")
    spl = ET.SubElement(sp_el, "ScanPlane")
    spl.set("Id", "1")
    _sub(spl, "Index", "0")
    _sub(spl, "Name", "Monitoring plane 1")
    ufs_el = _sub(spl, "UserFieldsets")

    uid = 1
    field_in_set_idx = 0
    prev_fs_idx = None
    uf_set_el = None
    uf_list_el = None
    for record in sdxml_fields:
        fs_idx = record["fieldset_index"]
        if fs_idx != prev_fs_idx:
            uf_set_el = ET.SubElement(ufs_el, "UserFieldset")
            uf_set_el.set("Id", str(fs_idx + 1))
            _sub(uf_set_el, "Index", fs_idx)
            _sub(uf_set_el, "Name", record["fieldset_name"])
            uf_list_el = _sub(uf_set_el, "UserFields")
            prev_fs_idx = fs_idx
            field_in_set_idx = 0
        uf = ET.SubElement(uf_list_el, "UserField")
        uf.set("Id", str(uid))
        _sub(uf, "Index", field_in_set_idx)
        _sub(uf, "Name", record["field_name"])
        _sub(uf, "FieldType", record["fieldtype"])
        _sub(uf, "MultipleSampling", record["multiple_sampling"])
        _sub(uf, "ObjectResolution", record["resolution"])
        _sub(uf, "ContourNegative", record["tolerance_negative"])
        _sub(uf, "ContourPositive", record["tolerance_positive"])
        uid += 1
        field_in_set_idx += 1

    stat = _sub(fc_el, "StatFields")
    ET.SubElement(stat, "PermRed").set("Id", str(perm_red_id))
    ET.SubElement(stat, "PermGreen").set("Id", str(perm_green_id))
    ET.SubElement(stat, "PermGreenWf").set("Id", str(perm_green_wf_id))

    # ──────────────────────────────────────────────────────────
    # SAFE WRITE (DO NOT TOUCH HEADER / FILEINFO)
    # ──────────────────────────────────────────────────────────

    # 1. Read template as RAW TEXT
    with open(template_path, "r", encoding="utf-8") as f:
        template_text = f.read()

    # 2. Split EXACTLY at </FileInfo>
    split_marker = "</FileInfo>"
    if split_marker not in template_text:
        sys.exit("[ERROR] </FileInfo> not found in template!")

    header, _ = template_text.split(split_marker, 1)

    # Keep EVERYTHING up to </FileInfo> EXACTLY unchanged
    header = header + split_marker + "\n"

    # 3. Serialize ONLY the dynamic part (children after FileInfo)
    body_parts = []

    for child in root:
        if child.tag == "FileInfo":
            continue

        raw = ET.tostring(child, encoding="unicode")
        dom = minidom.parseString(raw)
        pretty = dom.toprettyxml(indent="  ")

        # remove xml declaration + blank lines
        lines = [l for l in pretty.splitlines() if l.strip() and not l.startswith("<?xml")]
        body_parts.append("\n".join(lines))

    # 4. Combine safely
    final_output = header + "\n".join(body_parts) + "\n</SdImportExport>\n"

    # 5. Write file or return
    if output_path:
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(final_output)

        _print_summary(sdxml_fields, n, perm_green_id,
                       perm_red_id, perm_green_wf_id, output_path, fid,
                       active_cases)
    
    return final_output

# ──────────────────────────────────────────────────────────────────────────
# Console summary (unchanged)
# ──────────────────────────────────────────────────────────────────────────
def _print_summary(fields, n, perm_green_id,
                   perm_red_id, perm_green_wf_id, out_path, fid_fn,
                   active_cases):
    print(f"\n✔ Generated: {out_path} (based on template)")
    print(f" Total user fields : {n} (UserField IDs 1–{n})")
    print(f" Active monitoring MCs: {len(active_cases)} "
          f"(cases {', '.join(str(ci+1) for ci in active_cases)})")
    print(f" PermRed Id : {perm_red_id} (Always OFF – danger)")
    print(f" PermGreen Id : {perm_green_id} (Always ON – safe) ← PermanentPreset + MC16")
    print(f" PermGreenWf Id : {perm_green_wf_id}")
    print()
    pad_c = max(len(r["field_name"]) for r in fields)
    header = (f"{'Pos':>4} {'MC':>4} {'c':1} {'d':1} {'e':1} {'f':1} "
              f"{'Path-1 (OSSD1)':<{pad_c+8}} {'Path-2 (OSSD2)'}")
    print(" " + header)
    print(" " + "-" * len(header))
    for display_idx, ci in enumerate(active_cases):
        c, d, e, f = binary_pin_matches(ci)
        p1 = fid_fn(ci, 1)
        p2 = fid_fn(ci, 2)
        p1_label = (f"UF{p1} – {fields[p1-1]['field_name']}"
                    if p1 <= n else "PermGreen (Always On safe)")
        p2_label = (f"UF{p2} – {fields[p2-1]['field_name']}"
                    if p2 <= n else "PermGreen (Always On safe)")
        print(f" {display_idx:>4} MC{ci+1:>2} {c[0]} {d[0]} {e[0]} {f[0]} "
              f"{p1_label:<{pad_c+8}} {p2_label}")
    print()

# ──────────────────────────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description=(
            "Generate a monitoring case table (.casesxml) from a field "
            "definition file (.sdxml) for SICK Safety Designer / nanoScan3 Pro."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "The script uses a template .casesxml to preserve the original\n"
            "xmlns / Timestamp / Hash / FileInfo (avoids checksum error).\n"
            "If --input / --output / --template are omitted, the constants\n"
            "at the top of this script are used."
        ),
    )
    parser.add_argument(
        "--input", "-i",
        default=INPUT_SDXML,
        metavar="FILE.sdxml",
        help=f"Input .sdxml file (default: {INPUT_SDXML})",
    )
    parser.add_argument(
        "--output", "-o",
        default=OUTPUT_CASESXML,
        metavar="FILE.casesxml",
        help=f"Output .casesxml file (default: {OUTPUT_CASESXML})",
    )
    parser.add_argument(
        "--template", "-t",
        default=TEMPLATE_CASESXML,
        metavar="TEMPLATE.casesxml",
        help=f"Template .casesxml (preserves exact header + FileInfo). Default: {TEMPLATE_CASESXML}",
    )
    args = parser.parse_args()

    print(f"\nParsing sdxml     : {args.input}")
    print(f"Using template    : {args.template}")
    fields = parse_sdxml(args.input)
    print(f" Found {len(fields)} field(s) across "
          f"{len(set(r['fieldset_index'] for r in fields))} fieldset(s)")

    generate_casesxml(fields, args.template, args.output)

if __name__ == "__main__":
    main()