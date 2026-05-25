#!/usr/bin/env python3
"""
MYE030 — one-shot orchestrator.

Detects what is available on disk, picks the right scenario, brings
the stack up. Cross-platform (Windows + macOS + Linux). Standard
library only — needs Python 3.10+ but no third-party packages.

Usage:
    python run.py                  # auto-detect scenario and bring up
    python run.py --etl            # force the ETL path (ignore backup)
    python run.py --status         # show health of the running stack
    python run.py --down           # stop containers (volume kept)
    python run.py --reset          # stop containers + wipe volume
    python run.py --verify         # run the data-quality report
    python run.py --help           # show this message

Scenarios (auto-detected from disk):
    A. deliverables/db_backup.sql.gz present   →  auto-restore (~3 min)
    B. data/ raw CSVs present, no backup       →  full ETL (~5 min)
    C. neither                                  →  print Drive link, exit
"""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKUP = REPO_ROOT / "deliverables" / "db_backup.sql.gz"
DATA_DIRS = [
    REPO_ROOT / "data" / "dblp_dataset",
    REPO_ROOT / "data" / "icore26_data",
    REPO_ROOT / "data" / "journal_ranking_data_raw",
]
ENV_FILE = REPO_ROOT / ".env"
ENV_EXAMPLE = REPO_ROOT / ".env.example"
SQL_DIR = REPO_ROOT / "sql_scripts"
QUALITY_REPORT = REPO_ROOT / "scripts" / "data_quality_report.sql"

DRIVE_LINK_HINT = (
    "Open deliverables/AM2403_prj.txt and copy the Google Drive link "
    "into your browser; the asset is db_backup.sql.gz (~172 MiB)."
)

# ANSI colours. Enabling on Windows 10+ via a no-op shell call.
if os.name == "nt":
    os.system("")
RED, GREEN, YELLOW, CYAN, BOLD, RESET = (
    "\033[31m", "\033[32m", "\033[33m", "\033[36m", "\033[1m", "\033[0m",
)


def step(msg: str) -> None:
    print(f"{CYAN}{BOLD}==>{RESET} {msg}")


def ok(msg: str) -> None:
    print(f"  {GREEN}OK{RESET} {msg}")


def warn(msg: str) -> None:
    print(f"  {YELLOW}!!{RESET} {msg}")


def fail(msg: str, code: int = 1) -> None:
    print(f"  {RED}XX{RESET} {msg}", file=sys.stderr)
    sys.exit(code)


def run_cmd(
    args: list[str],
    *,
    check: bool = True,
    stdin_path: Path | None = None,
    capture: bool = False,
) -> subprocess.CompletedProcess[str]:
    """Run a shell command at REPO_ROOT, streaming stdout/stderr."""
    printable = " ".join(str(a) for a in args)
    if stdin_path is not None:
        printable += f"  < {stdin_path.name}"
    print(f"  $ {printable}")
    stdin = open(stdin_path, "rb") if stdin_path else None
    try:
        result = subprocess.run(
            args,
            cwd=REPO_ROOT,
            check=check,
            stdin=stdin,
            text=True,
            capture_output=capture,
        )
        return result
    finally:
        if stdin is not None:
            stdin.close()


def get_env_value(key: str, default: str = "") -> str:
    """Read a single key from .env (no third-party parser)."""
    if not ENV_FILE.exists():
        return default
    for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
        if line.startswith(f"{key}="):
            return line.split("=", 1)[1].strip()
    return default


def check_docker() -> None:
    if shutil.which("docker") is None:
        fail("Docker not installed or not on PATH. Install Docker Desktop.")
    try:
        subprocess.run(
            ["docker", "info"],
            capture_output=True,
            check=True,
            timeout=10,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        fail("Docker daemon is not running. Start Docker Desktop and re-run.")
    ok("Docker daemon reachable")


def ensure_env() -> None:
    if ENV_FILE.exists():
        ok(".env already present")
        return
    if not ENV_EXAMPLE.exists():
        fail(".env.example missing — re-clone the repository.")
    shutil.copy(ENV_EXAMPLE, ENV_FILE)
    ok(".env created from .env.example")


def detect_scenario(force_etl: bool) -> str:
    has_backup = BACKUP.exists() and BACKUP.stat().st_size > 1_000_000
    has_data = all(d.is_dir() and any(d.iterdir()) for d in DATA_DIRS)
    if force_etl and has_data:
        return "B"
    if has_backup:
        return "A"
    if has_data:
        return "B"
    return "C"


def scenario_A() -> None:
    step("Scenario A — auto-restore from gzipped backup")
    ok(f"backup: {BACKUP.name} ({BACKUP.stat().st_size / 1024 / 1024:.1f} MiB)")
    step("docker compose up -d --wait (one shot, ~2-3 min on first boot)")
    started = time.time()
    run_cmd(["docker", "compose", "up", "-d", "--wait", "--build"])
    elapsed = time.time() - started
    ok(f"All three services healthy in {elapsed:.0f}s")


def scenario_B() -> None:
    step("Scenario B — full ETL from raw CSVs")
    for d in DATA_DIRS:
        ok(f"data/: {d.relative_to(REPO_ROOT)}")

    step("Booting MySQL container (empty schema for now)")
    run_cmd(["docker", "compose", "up", "-d", "--wait", "mysql_db"])
    container = get_env_value("MYSQL_CONTAINER_NAME", "mye030_mysql")
    root_pwd = get_env_value("MYSQL_ROOT_PASSWORD", "root")
    db_name = get_env_value("MYSQL_DATABASE", "mye030")

    step("Running ETL inside the backend image (Polars + rapidfuzz)")
    run_cmd(["docker", "compose", "run", "--rm", "backend",
             "python", "-m", "etl.exporter"])

    step("Loading 01_schema.sql")
    run_cmd(
        ["docker", "exec", "-i", container,
         "mysql", "--local-infile=1", "-uroot", f"-p{root_pwd}"],
        stdin_path=SQL_DIR / "01_schema.sql",
    )

    step("Granting application user")
    run_cmd(["docker", "exec", container,
             "mysql", "-uroot", f"-p{root_pwd}", "-e",
             f"GRANT ALL PRIVILEGES ON {db_name}.* TO "
             f"'{get_env_value('MYSQL_USER', 'Angelakos')}'@'%'; FLUSH PRIVILEGES;"])

    step("Loading 02_load.sql (LOAD DATA LOCAL INFILE; takes ~1-2 min)")
    run_cmd(
        ["docker", "exec", "-i", container,
         "mysql", "--local-infile=1", "-uroot", f"-p{root_pwd}", db_name],
        stdin_path=SQL_DIR / "02_load.sql",
    )

    step("Building 03_views.sql (11 views + 6 materialised tables)")
    run_cmd(
        ["docker", "exec", "-i", container,
         "mysql", "-uroot", f"-p{root_pwd}", db_name],
        stdin_path=SQL_DIR / "03_views.sql",
    )

    step("Bringing up backend + frontend")
    run_cmd(["docker", "compose", "up", "-d", "--wait", "--build"])
    ok("Stack ready")


def scenario_C() -> None:
    print()
    print(f"{YELLOW}{BOLD}################################################################{RESET}")
    print(f"{YELLOW}{BOLD}#   No backup AND no raw CSVs found.                           #{RESET}")
    print(f"{YELLOW}{BOLD}################################################################{RESET}")
    print()
    print("Two ways to fix this — pick one, then re-run python run.py:")
    print()
    print(f"  {BOLD}Option 1 (recommended): download the backup{RESET}")
    print(f"     {DRIVE_LINK_HINT}")
    print(f"     Place it at: deliverables/db_backup.sql.gz")
    print()
    print(f"  {BOLD}Option 2: download the raw CSVs and run the ETL{RESET}")
    print( "     DBLP:   https://dblp.org/xml/release/")
    print( "     iCore:  http://portal.core.edu.au/conf-ranks/")
    print( "     Kaggle: search for 'Scimago Journal Ranking'")
    print( "     Place them under data/dblp_dataset, data/icore26_data,")
    print( "     and data/journal_ranking_data_raw — full layout is in")
    print( "     docs/ONBOARDING.md (Step 4, Path B).")
    print()
    sys.exit(2)


def show_status() -> None:
    step("Container status")
    run_cmd(["docker", "compose", "ps"])
    print()
    step("/health probe")
    try:
        result = subprocess.run(
            ["curl", "-sf", f"http://localhost:{get_env_value('BACKEND_PORT', '8000')}/health"],
            capture_output=True, text=True, check=True, timeout=5,
        )
        ok(result.stdout.strip() or "OK")
    except Exception:
        warn("backend not reachable on the host port")
    print()
    step("/api/meta/totals")
    try:
        result = subprocess.run(
            ["curl", "-sf", f"http://localhost:{get_env_value('FRONTEND_PORT', '5173')}/api/meta/totals"],
            capture_output=True, text=True, check=True, timeout=10,
        )
        print(f"  {result.stdout}")
    except Exception:
        warn("could not reach the API through the nginx proxy")


def verify_quality() -> None:
    container = get_env_value("MYSQL_CONTAINER_NAME", "mye030_mysql")
    root_pwd = get_env_value("MYSQL_ROOT_PASSWORD", "root")
    db_name = get_env_value("MYSQL_DATABASE", "mye030")
    step(f"Running scripts/data_quality_report.sql against {db_name}")
    run_cmd(
        ["docker", "exec", "-i", container,
         "mysql", "-uroot", f"-p{root_pwd}", db_name],
        stdin_path=QUALITY_REPORT,
    )


def down(reset: bool) -> None:
    if reset:
        step("docker compose down -v (wipes MySQL volume)")
        run_cmd(["docker", "compose", "down", "-v"])
    else:
        step("docker compose down (data volume kept)")
        run_cmd(["docker", "compose", "down"])
    ok("Stack stopped")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="MYE030 one-shot orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--etl", action="store_true",
                       help="Force the ETL path, ignore any existing backup")
    group.add_argument("--status", action="store_true",
                       help="Show container health and a couple of probes")
    group.add_argument("--down", action="store_true",
                       help="Stop the stack but keep the data volume")
    group.add_argument("--reset", action="store_true",
                       help="Stop the stack and wipe the data volume")
    group.add_argument("--verify", action="store_true",
                       help="Run the data-quality SQL report")
    args = parser.parse_args()

    print()
    print(f"{BOLD}MYE030 — Data Integration & Visualisation Platform{RESET}")
    print(f"{BOLD}{'=' * 50}{RESET}")
    print()

    if args.status:
        show_status()
        return
    if args.down:
        down(reset=False)
        return
    if args.reset:
        down(reset=True)
        return
    if args.verify:
        verify_quality()
        return

    step("Pre-flight checks")
    check_docker()
    ensure_env()

    scenario = detect_scenario(force_etl=args.etl)
    print()
    print(f"  {BOLD}Detected scenario: {scenario}{RESET}")
    print()

    started = time.time()
    if scenario == "A":
        scenario_A()
    elif scenario == "B":
        scenario_B()
    else:
        scenario_C()

    elapsed = time.time() - started
    print()
    print(f"{GREEN}{BOLD}Done in {elapsed:.0f}s.{RESET}")
    print()
    print(f"Open {BOLD}http://localhost:{get_env_value('FRONTEND_PORT', '5173')}{RESET} for the app")
    print(f"          /docs            for Swagger UI")
    print(f"          /redoc           for ReDoc")
    print(f"          /openapi.json    for the raw contract")
    print()
    print(f"Useful follow-ups:")
    print(f"  python run.py --verify   run the data-quality report")
    print(f"  python run.py --status   list container health")
    print(f"  python run.py --down     stop everything (volume kept)")
    print(f"  python run.py --reset    stop everything + wipe data")


if __name__ == "__main__":
    main()
