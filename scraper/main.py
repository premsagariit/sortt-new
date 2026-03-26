import json
import os
import re
import socket
import ipaddress
from pathlib import Path
from datetime import datetime, timezone
from decimal import Decimal

import psycopg
import requests
import sentry_sdk
from bs4 import BeautifulSoup
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[1]
load_dotenv(ROOT_DIR / "backend" / ".env")
load_dotenv()

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(dsn=SENTRY_DSN)

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")

if "sslmode=verify-full" in DATABASE_URL and "sslrootcert=" not in DATABASE_URL:
    sep = "&" if "?" in DATABASE_URL else "?"
    DATABASE_URL = f"{DATABASE_URL}{sep}sslrootcert=system"


def connect_db():
    try:
        return psycopg.connect(DATABASE_URL)
    except psycopg.OperationalError as exc:
        if "certificate verify failed" in str(exc).lower() and "sslmode=verify-full" in DATABASE_URL:
            downgraded = DATABASE_URL.replace("sslmode=verify-full", "sslmode=require")
            downgraded = downgraded.replace("&sslrootcert=system", "")
            downgraded = downgraded.replace("?sslrootcert=system", "")
            capture_message("DB SSL verify-full failed in scraper runtime; retrying with sslmode=require", level="warning")
            return psycopg.connect(downgraded)
        raise

SCRAPER_URL_ALLOWLIST = [
    "https://scraprates.in/",
    "https://www.reuze.in/scrap-rate-today",
    "https://steel-baba.com/",
]

MATERIAL_ALIASES = {
    "metal": ["metal", "iron", "steel", "alu", "aluminium", "aluminum"],
    "plastic": ["plastic", "pet", "hdpe", "pp"],
    "paper": ["paper", "newspaper", "carton", "cardboard"],
    "ewaste": ["ewaste", "e-waste", "electronic", "pcb"],
    "fabric": ["fabric", "cloth", "textile"],
    "glass": ["glass"],
}

SANITY_BOUNDS = {
    "metal": (20, 60),
    "plastic": (5, 25),
    "paper": (5, 20),
    "ewaste": (50, 500),
    "fabric": (5, 25),
    "glass": (1, 10),
}

PRIVATE_NETS = [
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fc00::/7"),
    ipaddress.ip_network("fe80::/10"),
]


def capture_message(message: str, level: str = "warning"):
    if SENTRY_DSN:
        sentry_sdk.capture_message(message, level=level)
    print(f"[{level.upper()}] {message}")


def is_safe_url(url: str) -> bool:
    try:
        host = re.sub(r"^\[|\]$", "", requests.utils.urlparse(url).hostname or "")
        if not host:
            return False
        infos = socket.getaddrinfo(host, None)
        addresses = {info[4][0] for info in infos}
        for address in addresses:
            ip = ipaddress.ip_address(address)
            if any(ip in net for net in PRIVATE_NETS):
                return False
        return True
    except Exception:
        return False


def normalize_material(text: str):
    lowered = text.lower()
    for code, aliases in MATERIAL_ALIASES.items():
        if any(alias in lowered for alias in aliases):
            return code
    return None


def parse_prices(html: str):
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(" ", strip=True)
    rates = {}

    for code, aliases in MATERIAL_ALIASES.items():
        best = None
        for alias in aliases:
            pattern = re.compile(rf"{re.escape(alias)}[^₹0-9]{{0,80}}(?:₹|rs\.?|inr)?\s*([0-9]{{1,4}}(?:\.[0-9]{{1,2}})?)", re.IGNORECASE)
            match = pattern.search(text)
            if match:
                value = float(match.group(1))
                if best is None:
                    best = value
        if best is not None:
            rates[code] = best

    return rates


def get_previous_rate(cur, material_code: str):
    cur.execute(
        """
        SELECT rate_per_kg
        FROM price_index
        WHERE city_code = 'HYD' AND material_code = %s
        ORDER BY scraped_at DESC
        LIMIT 1
        """,
        (material_code,),
    )
    row = cur.fetchone()
    return float(row[0]) if row else None


def insert_rate(cur, material_code: str, rate: float, source_url: str, is_manual_override: bool):
    cur.execute(
        """
        INSERT INTO price_index (city_code, material_code, rate_per_kg, source, is_manual_override, scraped_at)
        VALUES ('HYD', %s, %s, %s, %s, NOW())
        """,
        (material_code, Decimal(str(rate)), source_url, is_manual_override),
    )


def run_scraper():
    conn = connect_db()
    conn.autocommit = False
    inserted = 0
    inserted_codes = set()

    try:
        with conn.cursor() as cur:
            for url in SCRAPER_URL_ALLOWLIST:
                if not is_safe_url(url):
                    capture_message(f"Unsafe scraper URL blocked: {url}")
                    continue

                try:
                    response = requests.get(url, timeout=15)
                    response.raise_for_status()
                except Exception as exc:
                    capture_message(f"Fetch failed for {url}: {exc}")
                    continue

                extracted = parse_prices(response.text)
                if not extracted:
                    capture_message(f"No parsable rates found for {url}")
                    continue

                for material_code, rate in extracted.items():
                    is_manual_override = False

                    if rate <= 0:
                        capture_message(
                            f"Skipping non-positive rate for {material_code}: {rate}",
                            level="warning",
                        )
                        continue

                    prev = get_previous_rate(cur, material_code)
                    if prev and prev > 0:
                        deviation = abs(rate - prev) / prev
                        if deviation > 0.30:
                            is_manual_override = True
                            capture_message(
                                f"Price deviation >30% for {material_code}: {prev} -> {rate}",
                                level="warning",
                            )

                    min_rate, max_rate = SANITY_BOUNDS[material_code]
                    if rate < min_rate or rate > max_rate:
                        is_manual_override = True
                        capture_message(
                            f"Sanity bounds exceeded for {material_code}: {rate} not in [{min_rate}, {max_rate}]",
                            level="warning",
                        )

                    insert_rate(cur, material_code, rate, url, is_manual_override)
                    inserted += 1
                    inserted_codes.add(material_code)

            for material_code in SANITY_BOUNDS.keys():
                if material_code in inserted_codes:
                    continue

                fallback_rate = get_previous_rate(cur, material_code)
                if fallback_rate is None or fallback_rate <= 0:
                    min_rate, max_rate = SANITY_BOUNDS[material_code]
                    fallback_rate = round((min_rate + max_rate) / 2, 2)

                capture_message(
                    f"Fallback insert for missing material {material_code}: {fallback_rate}",
                    level="warning",
                )
                insert_rate(cur, material_code, float(fallback_rate), "fallback:missing_material", True)
                inserted += 1
                inserted_codes.add(material_code)

            conn.commit()
    except Exception as exc:
        conn.rollback()
        if SENTRY_DSN:
            sentry_sdk.capture_exception(exc)
        raise
    finally:
        conn.close()

    print(json.dumps({
        "status": "ok",
        "inserted": inserted,
        "ran_at": datetime.now(timezone.utc).isoformat(),
    }))


if __name__ == "__main__":
    run_scraper()
