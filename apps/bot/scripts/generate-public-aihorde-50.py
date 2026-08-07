#!/usr/bin/env python3
"""Generate 50 historical-person conversations using public AI Horde inference.

Inference uses only AI Horde's documented shared anonymous credential
``0000000000``. The program never reads a user-owned provider key, a repository
inference secret, a paid subscription credential, or a private endpoint.

The code is a transport, validation, provenance, and serialization client. It
contains no local language model and no template-generated dialogue fallback.
Every accepted message must be returned by a remote AI Horde text worker.
"""

from __future__ import annotations

import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import subprocess
import tempfile
import threading
import time
import traceback
import uuid
import zipfile
from dataclasses import dataclass
from typing import Any

BASE_URL = "https://aihorde.net/api/v2"
ANONYMOUS_KEY = "0000000000"
CLIENT_AGENT = "ajaxdavis-training-data:1.0:https://github.com/thomasdavis/omega"
MODEL = "aphrodite/TheDrummer/Skyfall-31B-v4.2"
OUTPUT_ROOT_NAME = "public-inference-output/aihorde-50"
MAX_WORKERS = 2
MAX_ATTEMPTS = 5
MAX_OUTPUT_TOKENS = 480
POLL_INTERVAL_SECONDS = 6
JOB_TIMEOUT_SECONDS = 660
SUBMIT_INTERVAL_SECONDS = 1.1


@dataclass(frozen=True)
class Plan:
    number: int
    person_a: str
    alias_a: str
    person_b: str
    alias_b: str
    context: str
    subject: str


RAW_PLANS = [
    ("Socrates", "socrates", "Confucius", "confucius", "virtue_and_learning", "whether virtue is taught, practised, or discovered through examination"),
    ("Plato", "plato", "Aristotle", "aristotle", "forms_and_observation", "whether knowledge begins from ideal forms or careful observation of particulars"),
    ("Mahatma Gandhi", "mahatma_gandhi", "Martin Luther King Jr.", "martin_luther_king_jr", "nonviolent_resistance", "the disciplines, limits, and political force of nonviolent resistance"),
    ("Ada Lovelace", "ada_lovelace", "Alan Turing", "alan_turing", "machines_and_thought", "what symbolic machines can calculate and whether computation can resemble thought"),
    ("Ibn Sina", "ibn_sina", "Hildegard of Bingen", "hildegard_of_bingen", "medicine_and_wholeness", "observation, inherited medical systems, and the relation between bodily and spiritual care"),
    ("Hatshepsut", "hatshepsut", "Elizabeth I", "elizabeth_i", "legitimacy_and_rule", "how women rulers establish legitimacy in political systems built around male succession"),
    ("Cleopatra VII", "cleopatra_vii", "Wu Zetian", "wu_zetian", "sovereignty_and_reputation", "statecraft, court power, and how hostile chroniclers shape a ruler's reputation"),
    ("Ashoka", "ashoka", "Marcus Aurelius", "marcus_aurelius", "power_and_moral_duty", "whether an emperor can reconcile coercive power with ethical self-restraint"),
    ("Sun Tzu", "sun_tzu", "Carl von Clausewitz", "carl_von_clausewitz", "strategy_and_uncertainty", "deception, friction, political purpose, and uncertainty in war"),
    ("Herodotus", "herodotus", "Ibn Khaldun", "ibn_khaldun", "writing_history", "how historians distinguish report, explanation, collective memory, and political myth"),
    ("Hypatia", "hypatia", "Emmy Noether", "emmy_noether", "mathematical_structure", "mathematical abstraction, symmetry, teaching, and intellectual life under institutional pressure"),
    ("Al-Khwarizmi", "al_khwarizmi", "Fibonacci", "fibonacci", "numbers_in_motion", "how mathematical methods travel between languages, commercial practice, and scholarly traditions"),
    ("Isaac Newton", "isaac_newton", "Albert Einstein", "albert_einstein", "space_time_and_gravity", "absolute versus relational accounts of space, time, motion, and gravitation"),
    ("Galileo Galilei", "galileo_galilei", "Johannes Kepler", "johannes_kepler", "evidence_in_astronomy", "mathematical elegance, telescopic observation, and the interpretation of planetary motion"),
    ("Charles Darwin", "charles_darwin", "Al-Jahiz", "al_jahiz", "change_in_living_nature", "competition, adaptation, environmental influence, and explaining change among living things"),
    ("Marie Curie", "marie_curie", "Rosalind Franklin", "rosalind_franklin", "evidence_and_credit", "experimental evidence, hazardous research, collaboration, and the allocation of scientific credit"),
    ("Louis Pasteur", "louis_pasteur", "Ibn al-Nafis", "ibn_al_nafis", "challenging_medical_orthodoxy", "how anatomy and experiment can overturn authoritative medical explanations"),
    ("Florence Nightingale", "florence_nightingale", "W. E. B. Du Bois", "w_e_b_du_bois", "statistics_and_reform", "using statistical graphics and social evidence to make preventable suffering politically visible"),
    ("Rachel Carson", "rachel_carson", "Alexander von Humboldt", "alexander_von_humboldt", "interconnected_nature", "ecological interdependence and how scientific description can change public responsibility"),
    ("Wangari Maathai", "wangari_maathai", "John Muir", "john_muir", "conservation_and_community", "conservation, local livelihoods, political action, and competing ideas of wilderness"),
    ("Frederick Douglass", "frederick_douglass", "Harriet Tubman", "harriet_tubman", "abolition_and_action", "the relationship between public argument, clandestine action, self-emancipation, and political pressure"),
    ("Abraham Lincoln", "abraham_lincoln", "Ulysses S. Grant", "ulysses_s_grant", "union_and_reconstruction", "military victory, emancipation, citizenship, and the unfinished obligations of reconstruction"),
    ("Toussaint Louverture", "toussaint_louverture", "Simón Bolívar", "simon_bolivar", "revolution_and_liberty", "independence, abolition, central authority, and the fragility of post-revolutionary institutions"),
    ("Nelson Mandela", "nelson_mandela", "Desmond Tutu", "desmond_tutu", "justice_and_reconciliation", "how truth, accountability, political compromise, and reconciliation can coexist after apartheid"),
    ("Susan B. Anthony", "susan_b_anthony", "Sojourner Truth", "sojourner_truth", "suffrage_and_universal_rights", "suffrage strategy and the danger of treating race, sex, and class as separable struggles"),
    ("Mary Wollstonecraft", "mary_wollstonecraft", "Simone de Beauvoir", "simone_de_beauvoir", "education_and_equality", "education, social construction, dependence, and women's political equality"),
    ("Olympe de Gouges", "olympe_de_gouges", "Qiu Jin", "qiu_jin", "women_and_revolution", "why revolutions proclaim universal liberty while restricting women's citizenship and action"),
    ("Adam Smith", "adam_smith", "Karl Marx", "karl_marx", "labour_and_markets", "division of labour, capital, exploitation, moral sentiment, and the social consequences of markets"),
    ("John Maynard Keynes", "john_maynard_keynes", "Friedrich Hayek", "friedrich_hayek", "knowledge_and_economic_order", "economic coordination, dispersed knowledge, unemployment, and the proper scope of state intervention"),
    ("Niccolò Machiavelli", "niccolo_machiavelli", "Thomas More", "thomas_more", "realism_and_utopia", "whether political thought should begin from existing power or imagined institutions"),
    ("Thomas Hobbes", "thomas_hobbes", "John Locke", "john_locke", "authority_and_consent", "security, natural rights, consent, resistance, and the grounds of legitimate government"),
    ("Jean-Jacques Rousseau", "jean_jacques_rousseau", "Edmund Burke", "edmund_burke", "revolution_and_tradition", "popular sovereignty, inherited institutions, political rupture, and unintended consequences"),
    ("W. E. B. Du Bois", "w_e_b_du_bois", "Booker T. Washington", "booker_t_washington", "education_and_emancipation", "education, economic advancement, political rights, and strategies against racial domination"),
    ("Frantz Fanon", "frantz_fanon", "Amílcar Cabral", "amilcar_cabral", "decolonization_and_culture", "colonial violence, national culture, class, and the risks faced after liberation"),
    ("Rumi", "rumi", "Rainer Maria Rilke", "rainer_maria_rilke", "poetry_and_transformation", "longing, inward transformation, love, solitude, and the work performed by poetic language"),
    ("Matsuo Bashō", "matsuo_basho", "Emily Dickinson", "emily_dickinson", "brevity_and_attention", "how compressed poetic forms make ordinary perception strange and exact"),
    ("William Shakespeare", "william_shakespeare", "Kālidāsa", "kalidasa", "drama_and_human_motives", "dramatic character, love, duty, recognition, and the staging of conflicting motives"),
    ("Murasaki Shikibu", "murasaki_shikibu", "Jane Austen", "jane_austen", "courtship_and_social_observation", "courtship, rank, interior life, and indirect criticism within constrained social worlds"),
    ("Miguel de Cervantes", "miguel_de_cervantes", "Lu Xun", "lu_xun", "satire_and_disillusion", "satire, failed ideals, social illness, and fiction's power to expose collective self-deception"),
    ("Dante Alighieri", "dante_alighieri", "John Milton", "john_milton", "epic_and_moral_order", "freedom, rebellion, judgment, and constructing a moral cosmos through epic poetry"),
    ("Leonardo da Vinci", "leonardo_da_vinci", "Al-Jazari", "al_jazari", "machines_and_observation", "mechanical invention, careful observation, automata, and the relation between diagrams and working devices"),
    ("Michael Faraday", "michael_faraday", "Nikola Tesla", "nikola_tesla", "electricity_and_invention", "experimental intuition, fields, alternating current, and turning physical insight into public infrastructure"),
    ("James Watt", "james_watt", "George Stephenson", "george_stephenson", "engines_and_industry", "steam power, transport, engineering improvement, labour, and industrial transformation"),
    ("Zheng He", "zheng_he", "Ibn Battuta", "ibn_battuta", "travel_and_exchange", "how state-sponsored voyages and personal travel reveal trade, diplomacy, custom, and unequal power"),
    ("Sacagawea", "sacagawea", "Matthew Henson", "matthew_henson", "exploration_and_erasure", "translation, practical expertise, survival, and why expedition narratives marginalize indispensable participants"),
    ("Tecumseh", "tecumseh", "Túpac Amaru II", "tupac_amaru_ii", "sovereignty_and_resistance", "building coalitions against expansion, defending sovereignty, and the difficulties of unified resistance"),
    ("Shaka", "shaka", "Napoleon Bonaparte", "napoleon_bonaparte", "war_and_state_building", "military reorganization, centralization, mobility, conscription, and the human cost of state-building"),
    ("Mansa Musa", "mansa_musa", "Cosimo de' Medici", "cosimo_de_medici", "wealth_and_patronage", "wealth, credit, architecture, scholarship, and how patronage converts resources into political memory"),
    ("Akbar", "akbar", "Suleiman the Magnificent", "suleiman_the_magnificent", "law_and_plural_empire", "law, religious plurality, administrative integration, and governing large multiethnic empires"),
    ("Mahatma Gandhi", "mahatma_gandhi", "B. R. Ambedkar", "b_r_ambedkar", "caste_and_social_justice", "their real disagreements over caste, political safeguards, social reform, and the meaning of freedom"),
]

PLANS = [Plan(index + 1, *row) for index, row in enumerate(RAW_PLANS)]
_SUBMIT_LOCK = threading.Lock()
_NEXT_SUBMIT_AT = 0.0


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def parse_headers(raw: str) -> dict[str, str]:
    blocks = re.split(r"\r?\n\r?\n", raw.strip())
    for block in reversed(blocks):
        lines = [line.strip() for line in block.splitlines() if line.strip()]
        if not lines or not lines[0].startswith("HTTP/"):
            continue
        parsed: dict[str, str] = {":status-line": lines[0]}
        for line in lines[1:]:
            if ":" in line:
                key, value = line.split(":", 1)
                parsed[key.strip().lower()] = value.strip()
        return parsed
    return {}


def json_request(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 90,
) -> tuple[int, Any, dict[str, str]]:
    request_headers = {"Accept": "application/json"}
    if body is not None:
        request_headers["Content-Type"] = "application/json"
    if headers:
        request_headers.update(headers)

    with tempfile.TemporaryDirectory(prefix="aihorde-http-") as temp_dir:
        temp = pathlib.Path(temp_dir)
        body_path = temp / "response.json"
        headers_path = temp / "headers.txt"
        request_path = temp / "request.json"
        command = [
            "curl",
            "--silent",
            "--show-error",
            "--location",
            "--http1.1",
            "--max-time",
            str(timeout),
            "--request",
            method,
            "--dump-header",
            str(headers_path),
            "--output",
            str(body_path),
            "--write-out",
            "%{http_code}",
        ]
        for key, value in request_headers.items():
            command.extend(["--header", f"{key}: {value}"])
        if body is not None:
            request_path.write_text(
                json.dumps(body, ensure_ascii=False, separators=(",", ":")),
                encoding="utf-8",
            )
            command.extend(["--data-binary", f"@{request_path}"])
        command.append(url)
        completed = subprocess.run(
            command,
            check=False,
            capture_output=True,
            text=True,
            timeout=timeout + 15,
        )
        if completed.returncode != 0:
            raise RuntimeError(
                f"curl exit {completed.returncode} for {url}: {completed.stderr.strip()[:1200]}"
            )
        try:
            status = int(completed.stdout.strip()[-3:])
        except ValueError as exc:
            raise RuntimeError(f"Unreadable curl status: {completed.stdout!r}") from exc
        response_text = body_path.read_text(encoding="utf-8", errors="replace")
        response_headers = parse_headers(
            headers_path.read_text(encoding="utf-8", errors="replace")
        )
        if not 200 <= status < 300:
            raise RuntimeError(f"HTTP {status} from {url}: {response_text[:1200]}")
        try:
            payload = json.loads(response_text)
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"Non-JSON response from {url}: {response_text[:1200]}") from exc
        return status, payload, response_headers


def wait_for_submit_slot() -> None:
    global _NEXT_SUBMIT_AT
    with _SUBMIT_LOCK:
        delay = _NEXT_SUBMIT_AT - time.monotonic()
        if delay > 0:
            time.sleep(delay)
        _NEXT_SUBMIT_AT = time.monotonic() + SUBMIT_INTERVAL_SECONDS


def build_prompt(plan: Plan, attempt: int) -> str:
    correction = ""
    if attempt > 1:
        correction = (
            "A previous model response failed the six-tag parser. Be stricter: begin with the first tag, "
            "write exactly six tagged lines, and stop immediately after line six. "
        )
    return f"""{correction}Write one newly invented counterfactual historical dialogue.

Speaker A: {plan.person_a}; alias `{plan.alias_a}`.
Speaker B: {plan.person_b}; alias `{plan.alias_b}`.
Topic: {plan.subject}.

Return exactly six lines and no other text. Alternate A, B, A, B, A, B. Use these exact line prefixes in this exact order:
|entity.{plan.alias_a}.{plan.context}|
|entity.{plan.alias_b}.{plan.context}|
|entity.{plan.alias_a}.{plan.context}|
|entity.{plan.alias_b}.{plan.context}|
|entity.{plan.alias_a}.{plan.context}|
|entity.{plan.alias_b}.{plan.context}|

After each prefix, write one substantial sentence of 18–48 words. The six turns must form an argument: opening position, challenge, defence, counterargument, concession or refinement, then a partial synthesis or precise unresolved disagreement. Ground each speaker in ideas, methods, institutions, or experiences reasonably associated with that person. Do not claim they met. Do not imitate accents. Do not use alleged verbatim quotations. Do not add headings, numbering, Markdown commentary, analysis, or stage directions. End after line six with <END>.
"""


def extract_messages(plan: Plan, raw_text: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    tag_pattern = re.compile(
        rf"\|entity\.({re.escape(plan.alias_a)}|{re.escape(plan.alias_b)})\.{re.escape(plan.context)}\|\s*",
        re.IGNORECASE,
    )
    matches = list(tag_pattern.finditer(text))
    messages: list[dict[str, Any]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        content = text[match.end() : end].split("<END>", 1)[0]
        content = re.sub(r"\s+", " ", content).strip(" \n\t-*#0123456789.)")
        content = content.replace("**", "").replace("*", "")
        messages.append(
            {
                "index": index + 1,
                "entity": "entity",
                "alias": match.group(1).lower(),
                "context": plan.context,
                "speaker": f"entity.{match.group(1).lower()}.{plan.context}",
                "content": content,
            }
        )
    expected_aliases = [plan.alias_a, plan.alias_b] * 3
    aliases = [message["alias"] for message in messages]
    word_counts = [len(message["content"].split()) for message in messages]
    valid = (
        len(messages) == 6
        and aliases == expected_aliases
        and all(10 <= count <= 80 for count in word_counts)
        and all("|entity." not in message["content"] for message in messages)
    )
    return messages, {
        "valid": valid,
        "message_count": len(messages),
        "expected_aliases": expected_aliases,
        "actual_aliases": aliases,
        "word_counts": word_counts,
    }


def submit_and_wait(plan: Plan, attempt: int) -> tuple[dict[str, Any], list[dict[str, Any]], dict[str, Any]]:
    prompt = build_prompt(plan, attempt)
    payload = {
        "prompt": prompt,
        "params": {
            "n": 1,
            "max_context_length": 4096,
            "max_length": MAX_OUTPUT_TOKENS,
            "temperature": 0.50 if attempt == 1 else 0.35,
            "top_p": 0.9,
            "top_k": 40,
            "min_p": 0.05,
            "typical": 1.0,
            "tfs": 1.0,
            "rep_pen": 1.08,
            "rep_pen_range": 1024,
            "stop_sequence": ["<END>"],
            "singleline": False,
            "frmttriminc": True,
        },
        "models": [MODEL],
        "trusted_workers": False,
        "validated_backends": True,
        "slow_workers": True,
        "extra_slow_workers": True,
        "worker_blacklist": False,
        "allow_downgrade": False,
        "dry_run": False,
    }
    wait_for_submit_slot()
    submit_started = time.monotonic()
    submit_status, submit_response, submit_headers = json_request(
        BASE_URL + "/generate/text/async",
        method="POST",
        body=payload,
        headers={"apikey": ANONYMOUS_KEY, "Client-Agent": CLIENT_AGENT},
    )
    submission = {
        "http_status": submit_status,
        "response": submit_response,
        "headers": submit_headers,
        "latency_ms": round((time.monotonic() - submit_started) * 1000, 3),
    }
    job_id = str(submit_response["id"])
    polls: list[dict[str, Any]] = []
    deadline = time.monotonic() + JOB_TIMEOUT_SECONDS
    final_response: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        time.sleep(POLL_INTERVAL_SECONDS)
        poll_started = time.monotonic()
        poll_status, response, poll_headers = json_request(
            BASE_URL + f"/generate/text/status/{job_id}"
        )
        polls.append(
            {
                "at": utc_now(),
                "http_status": poll_status,
                "latency_ms": round((time.monotonic() - poll_started) * 1000, 3),
                "done": response.get("done"),
                "faulted": response.get("faulted"),
                "is_possible": response.get("is_possible"),
                "queue_position": response.get("queue_position"),
                "wait_time": response.get("wait_time"),
                "generation_count": len(response.get("generations") or []),
                "headers": poll_headers,
            }
        )
        if response.get("done") or response.get("faulted") or not response.get("is_possible", True):
            final_response = response
            break
    if final_response is None:
        raise TimeoutError(f"AI Horde job {job_id} did not finish")
    return {"payload": payload, "job_id": job_id, "submission": submission}, polls, final_response


def generate_one(plan: Plan) -> tuple[dict[str, Any] | None, list[dict[str, Any]], str | None]:
    attempt_ledger: list[dict[str, Any]] = []
    last_error: str | None = None
    for attempt in range(1, MAX_ATTEMPTS + 1):
        attempt_started = utc_now()
        try:
            request_record, polls, final_response = submit_and_wait(plan, attempt)
            generations = final_response.get("generations") or []
            if not generations:
                raise RuntimeError("AI Horde returned no generation")
            generation = generations[0]
            raw_text = str(generation.get("text") or "")
            messages, validation = extract_messages(plan, raw_text)
            attempt_record = {
                "conversation_number": plan.number,
                "attempt": attempt,
                "started_at": attempt_started,
                "completed_at": utc_now(),
                "request": request_record,
                "polls": polls,
                "final_response": final_response,
                "raw_text": raw_text,
                "generation_metadata": {
                    key: generation.get(key)
                    for key in ("model", "worker_id", "worker_name", "seed", "state", "gen_metadata")
                    if key in generation
                },
                "validation": validation,
            }
            attempt_ledger.append(attempt_record)
            if validation["valid"]:
                serialized = "\n".join(
                    f"|entity.{message['alias']}.{plan.context}| {message['content']}"
                    for message in messages
                )
                record = {
                    "conversation_id": f"historical_aihorde_{plan.number:03d}",
                    "title": f"{plan.person_a} and {plan.person_b}: {plan.context.replace('_', ' ')}",
                    "synthetic": True,
                    "counterfactual_dialogue": True,
                    "authentic_quote": False,
                    "context": plan.context,
                    "subject": plan.subject,
                    "participants": [
                        {"display_name": plan.person_a, "alias": plan.alias_a},
                        {"display_name": plan.person_b, "alias": plan.alias_b},
                    ],
                    "messages": messages,
                    "serialized": serialized,
                    "generation": {
                        "provider": "AI Horde",
                        "api_base": BASE_URL,
                        "anonymous": True,
                        "job_id": request_record["job_id"],
                        "attempt": attempt,
                        **attempt_record["generation_metadata"],
                    },
                }
                return record, attempt_ledger, None
            last_error = f"format validation failed: {validation}"
        except Exception as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            attempt_ledger.append(
                {
                    "conversation_number": plan.number,
                    "attempt": attempt,
                    "started_at": attempt_started,
                    "completed_at": utc_now(),
                    "error": last_error,
                    "traceback": traceback.format_exc(),
                    "validation": {"valid": False},
                }
            )
        if attempt < MAX_ATTEMPTS:
            time.sleep(2)
    return None, attempt_ledger, last_error


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def persist_outputs(
    conversations: list[dict[str, Any]],
    ledger: list[dict[str, Any]],
    failures: list[dict[str, Any]],
    live_model_status: Any,
    started_at: str,
) -> pathlib.Path:
    root = pathlib.Path(
        subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
    )
    output_dir = root / OUTPUT_ROOT_NAME
    output_dir.mkdir(parents=True, exist_ok=True)
    text_path = output_dir / "historical_conversations_aihorde_50.txt"
    jsonl_path = output_dir / "historical_conversations_aihorde_50.jsonl"
    ledger_path = output_dir / "inference_ledger.jsonl"
    validation_path = output_dir / "validation_report.json"
    manifest_path = output_dir / "manifest.json"
    failures_path = output_dir / "failures.json"
    readme_path = output_dir / "README.md"
    checksum_path = output_dir / "SHA256SUMS"
    bundle_path = output_dir / "historical_conversations_aihorde_50_bundle.zip"

    conversations = sorted(conversations, key=lambda row: row["conversation_id"])
    text_path.write_text(
        "\n\n".join(row["serialized"] for row in conversations) + ("\n" if conversations else ""),
        encoding="utf-8",
    )
    with jsonl_path.open("w", encoding="utf-8") as handle:
        for row in conversations:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    with ledger_path.open("w", encoding="utf-8") as handle:
        for row in ledger:
            handle.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    failures_path.write_text(json.dumps(failures, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    all_messages = [message for row in conversations for message in row["messages"]]
    validation = {
        "valid": len(conversations) == 50 and not failures,
        "conversation_count": len(conversations),
        "failure_count": len(failures),
        "message_count": len(all_messages),
        "messages_per_conversation": sorted({len(row["messages"]) for row in conversations}),
        "unique_contexts": len({row["context"] for row in conversations}),
        "unique_aliases": len({message["alias"] for message in all_messages}),
        "unique_message_texts": len({message["content"] for message in all_messages}),
        "external_jobs_accepted": sum(1 for row in ledger if row.get("request", {}).get("job_id")),
        "inference_attempts": len(ledger),
        "all_exact_alternation": all(
            [message["alias"] for message in row["messages"]]
            == [row["participants"][0]["alias"], row["participants"][1]["alias"]] * 3
            for row in conversations
        ),
        "all_synthetic_marked": all(
            row["synthetic"] and row["counterfactual_dialogue"] and not row["authentic_quote"]
            for row in conversations
        ),
        "models_returned": sorted({row["generation"].get("model") for row in conversations}),
        "workers_returned": sorted({row["generation"].get("worker_name") for row in conversations}),
    }
    validation_path.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    completed_at = utc_now()
    manifest = {
        "dataset": "historical_conversations_aihorde_50",
        "version": "1.0.0",
        "run_id": str(uuid.uuid4()),
        "started_at": started_at,
        "completed_at": completed_at,
        "provider": {
            "name": "AI Horde",
            "api_base": BASE_URL,
            "requested_model": MODEL,
            "service_type": "public volunteer-distributed external text inference",
            "credential": {
                "value": ANONYMOUS_KEY,
                "ownership": "AI Horde documented shared anonymous credential",
                "user_owned": False,
                "registration_required": False,
            },
            "live_model_status_at_start": live_model_status,
        },
        "credential_boundary": {
            "user_owned_model_keys_used": False,
            "repository_provider_secrets_used": False,
            "paid_model_subscription_used": False,
            "private_inference_endpoint_used": False,
            "github_ephemeral_token_role": "repository checkout and returning generated files only; never sent to AI Horde",
        },
        "generation": {
            "conversation_count_requested": 50,
            "conversation_count_completed": len(conversations),
            "inference_attempts": len(ledger),
            "max_workers": MAX_WORKERS,
            "max_output_tokens": MAX_OUTPUT_TOKENS,
            "template_or_local_model_fallback": False,
        },
        "validation": validation,
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    readme_path.write_text(
        "# Historical conversations generated through public AI Horde inference\n\n"
        "This directory contains 50 six-turn, counterfactual historical-person dialogues serialized as "
        "`|entity.alias.context| content`. All accepted dialogue was returned by external AI Horde text workers. "
        "The generator used AI Horde's documented shared anonymous credential `0000000000`; it did not use a "
        "user-owned API key, repository model-provider secret, paid model subscription, or private inference endpoint.\n\n"
        "The Python program handled transport, retries, parsing, validation, serialization, checksums, and provenance. "
        "It contains no local language model and no template-generated dialogue fallback. Every conversation is synthetic, "
        "does not assert a real meeting, and must not be treated as authentic quotation. The inference ledger records every "
        "request, public job ID, poll, raw response, model, volunteer worker, seed, and failed formatting attempt.\n",
        encoding="utf-8",
    )

    files = [text_path, jsonl_path, ledger_path, validation_path, manifest_path, failures_path, readme_path]
    checksum_path.write_text(
        "".join(f"{sha256(path)}  {path.name}\n" for path in files),
        encoding="utf-8",
    )
    files.append(checksum_path)
    with zipfile.ZipFile(bundle_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, arcname=path.name)

    branch = os.environ.get("GITHUB_HEAD_REF") or subprocess.check_output(
        ["git", "branch", "--show-current"], text=True
    ).strip()
    if not branch:
        branch = "tmp/aihorde-public-probe-20260808"
    subprocess.run(["git", "-C", str(root), "add", OUTPUT_ROOT_NAME], check=True)
    if subprocess.run(["git", "-C", str(root), "diff", "--cached", "--quiet"]).returncode != 0:
        subprocess.run(
            ["git", "-C", str(root), "commit", "-m", "chore: record 50 public AI Horde conversations [skip ci]"],
            check=True,
        )
        subprocess.run(
            ["git", "-C", str(root), "push", "origin", f"HEAD:{branch}"],
            check=True,
        )
    return bundle_path


def main() -> int:
    if len(PLANS) != 50:
        raise RuntimeError(f"Expected 50 plans, found {len(PLANS)}")
    started_at = utc_now()
    status_code, model_status, status_headers = json_request(BASE_URL + "/status/models?type=text")
    skyfall_rows = [
        row for row in model_status if isinstance(row, dict) and row.get("name") == MODEL
    ] if isinstance(model_status, list) else []
    live_model_status = {
        "http_status": status_code,
        "response_headers": status_headers,
        "requested_model_rows": skyfall_rows,
    }
    if not skyfall_rows or int(skyfall_rows[0].get("count") or 0) < 1:
        raise RuntimeError(f"Requested public model is not active: {MODEL}")

    conversations: list[dict[str, Any]] = []
    ledger: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        future_map = {pool.submit(generate_one, plan): plan for plan in PLANS}
        for future in concurrent.futures.as_completed(future_map):
            plan = future_map[future]
            try:
                record, attempts, error = future.result()
            except Exception as exc:
                record = None
                attempts = [{"conversation_number": plan.number, "error": f"{type(exc).__name__}: {exc}", "traceback": traceback.format_exc()}]
                error = f"{type(exc).__name__}: {exc}"
            ledger.extend(attempts)
            if record is None:
                failures.append(
                    {
                        "conversation_number": plan.number,
                        "participants": [plan.person_a, plan.person_b],
                        "context": plan.context,
                        "error": error,
                    }
                )
                print(f"FAILED {plan.number:02d}/50 {plan.person_a} + {plan.person_b}: {error}", flush=True)
            else:
                conversations.append(record)
                print(
                    f"generated {plan.number:02d}/50 {plan.person_a} + {plan.person_b} "
                    f"via {record['generation'].get('model')} / {record['generation'].get('worker_name')}",
                    flush=True,
                )

    bundle_path = persist_outputs(
        conversations,
        ledger,
        failures,
        live_model_status,
        started_at,
    )
    summary = {
        "completed": len(conversations),
        "failures": len(failures),
        "attempts": len(ledger),
        "bundle": str(bundle_path),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0 if len(conversations) == 50 and not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
