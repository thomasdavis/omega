#!/usr/bin/env python3
"""Repair three malformed corpus rows with per-turn public AI Horde inference.

Each dialogue turn is a separate external model generation. The script only
assembles the six externally returned sentences beneath the requested EAC tags.
It never invents, templates, or locally completes dialogue text.

Inference authentication is AI Horde's documented shared anonymous credential
``0000000000``. No user-owned provider key, paid subscription credential,
repository inference secret, or private endpoint is read or sent.
"""

from __future__ import annotations

import importlib.util
import json
import pathlib
import re
import subprocess
import sys
import time
import traceback
from typing import Any

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
FULL_GENERATOR_PATH = SCRIPT_DIR / "generate-public-aihorde-50.py"
SPEC = importlib.util.spec_from_file_location("aihorde_full_generator", FULL_GENERATOR_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load {FULL_GENERATOR_PATH}")
full = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = full
SPEC.loader.exec_module(full)

REPAIR_NUMBERS = (12, 28, 43)
TURN_MAX_TOKENS = 120
TURN_MAX_ATTEMPTS = 6
TURN_TIMEOUT_SECONDS = 420

PROFILE_NOTES = {
    12: {
        "al_khwarizmi": "a Baghdad scholar associated with systematic algebra, calculation, astronomy, geography, and the transmission of Hindu-Arabic numerals",
        "fibonacci": "the author of Liber Abaci, associated with commercial arithmetic and the adoption of Hindu-Arabic numerals in Latin Europe",
    },
    28: {
        "adam_smith": "a moral philosopher and political economist concerned with division of labour, exchange, institutions, moral sentiments, and the social dangers of repetitive work",
        "karl_marx": "a critic of capitalist production concerned with class relations, exploitation, alienation, commodities, and capital accumulation",
    },
    43: {
        "james_watt": "an engineer and inventor associated with the separate condenser, steam-engine efficiency, industrial partnership, and patents",
        "george_stephenson": "a practical railway engineer associated with locomotives, gradients, track infrastructure, mining transport, and public railways",
    },
}

META_PREFIXES = (
    "sure",
    "here is",
    "here's",
    "the sentence",
    "as an ai",
    "response:",
    "answer:",
)


def load_jsonl(path: pathlib.Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    if not path.exists():
        return rows
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Invalid JSONL at {path}:{line_number}") from exc
            if not isinstance(row, dict):
                raise RuntimeError(f"Expected object at {path}:{line_number}")
            rows.append(row)
    return rows


def sentence_from_raw(plan: Any, alias: str, raw_text: str) -> tuple[str, dict[str, Any]]:
    text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.split("<END>", 1)[0].strip()

    exact_tag = f"|entity.{alias}.{plan.context}|"
    if exact_tag.lower() in text.lower():
        index = text.lower().find(exact_tag.lower())
        text = text[index + len(exact_tag) :].strip()

    speaker_name = plan.person_a if alias == plan.alias_a else plan.person_b
    removable_prefixes = (
        f"{speaker_name}:",
        f"{alias}:",
        f"Speaker {speaker_name}:",
        f"Speaker:",
    )
    for prefix in removable_prefixes:
        if text.lower().startswith(prefix.lower()):
            text = text[len(prefix) :].strip()
            break

    text = re.sub(r"^\s*(?:[-*#]+|\d+[.)])\s*", "", text)
    text = text.strip(" \t\n\"'`*")
    text = re.sub(r"\s+", " ", text)
    words = text.split()
    lower = text.lower()
    validation = {
        "valid": (
            10 <= len(words) <= 80
            and not any(lower.startswith(prefix) for prefix in META_PREFIXES)
            and "|entity." not in lower
            and "<end>" not in lower
        ),
        "word_count": len(words),
        "starts_with_meta_prefix": any(lower.startswith(prefix) for prefix in META_PREFIXES),
        "contains_tag": "|entity." in lower,
        "contains_end_marker": "<end>" in lower,
    }
    return text, validation


def turn_prompt(plan: Any, turn_index: int, prior_messages: list[dict[str, Any]], attempt: int) -> str:
    alias = plan.alias_a if turn_index % 2 == 1 else plan.alias_b
    speaker_name = plan.person_a if alias == plan.alias_a else plan.person_b
    other_name = plan.person_b if alias == plan.alias_a else plan.person_a
    profiles = PROFILE_NOTES[plan.number]
    transcript = "\n".join(
        f"{plan.person_a if row['alias'] == plan.alias_a else plan.person_b}: {row['content']}"
        for row in prior_messages
    )
    if not transcript:
        transcript = "(No previous turns; this is the opening.)"
    stricter = ""
    if attempt > 1:
        stricter = (
            "The preceding attempt was rejected because it contained extra framing or the wrong length. "
            "Return only the requested historical character's sentence. "
        )
    role = (
        "opening position"
        if turn_index == 1
        else "direct challenge or qualification"
        if turn_index == 2
        else "defence with a concrete distinction"
        if turn_index == 3
        else "counterargument addressing the previous turn"
        if turn_index == 4
        else "concession or refinement that preserves a real disagreement"
        if turn_index == 5
        else "partial synthesis or a precise unresolved disagreement"
    )
    return f"""{stricter}Write turn {turn_index} of six in a newly invented counterfactual dialogue.

Topic: {plan.subject}.
Speaker now: {speaker_name}, {profiles[alias]}.
Conversation partner: {other_name}, {profiles[plan.alias_b if alias == plan.alias_a else plan.alias_a]}.
Turn function: {role}.

Previous externally generated turns:
{transcript}

Write exactly one substantial sentence of 18–48 words from {speaker_name}'s historically grounded perspective. It must respond to the dialogue so far and advance the argument. Do not claim the two people met. Do not imitate an accent or present an alleged authentic quotation.

Return the sentence only: no name, tag, label, quotation marks, heading, explanation, Markdown, or second line. End after the sentence with <END>.
"""


def submit_turn(plan: Any, turn_index: int, prior_messages: list[dict[str, Any]], attempt: int) -> tuple[dict[str, Any], str, dict[str, Any]]:
    prompt = turn_prompt(plan, turn_index, prior_messages, attempt)
    payload = {
        "prompt": prompt,
        "params": {
            "n": 1,
            "max_context_length": 4096,
            "max_length": TURN_MAX_TOKENS,
            "temperature": 0.45 if attempt == 1 else 0.30,
            "top_p": 0.9,
            "top_k": 40,
            "min_p": 0.05,
            "typical": 1.0,
            "tfs": 1.0,
            "rep_pen": 1.08,
            "rep_pen_range": 512,
            "stop_sequence": ["<END>"],
            "singleline": True,
            "frmttriminc": True,
        },
        "models": [full.MODEL],
        "trusted_workers": False,
        "validated_backends": True,
        "slow_workers": True,
        "extra_slow_workers": True,
        "worker_blacklist": False,
        "allow_downgrade": False,
        "dry_run": False,
    }
    full.wait_for_submit_slot()
    submit_started = time.monotonic()
    submit_status, submit_response, submit_headers = full.json_request(
        full.BASE_URL + "/generate/text/async",
        method="POST",
        body=payload,
        headers={"apikey": full.ANONYMOUS_KEY, "Client-Agent": full.CLIENT_AGENT},
    )
    job_id = str(submit_response["id"])
    request_record = {
        "payload": payload,
        "job_id": job_id,
        "submission": {
            "http_status": submit_status,
            "response": submit_response,
            "headers": submit_headers,
            "latency_ms": round((time.monotonic() - submit_started) * 1000, 3),
        },
    }
    polls: list[dict[str, Any]] = []
    deadline = time.monotonic() + TURN_TIMEOUT_SECONDS
    final_response: dict[str, Any] | None = None
    while time.monotonic() < deadline:
        time.sleep(5)
        poll_started = time.monotonic()
        status_code, response, response_headers = full.json_request(
            full.BASE_URL + f"/generate/text/status/{job_id}"
        )
        polls.append(
            {
                "at": full.utc_now(),
                "http_status": status_code,
                "latency_ms": round((time.monotonic() - poll_started) * 1000, 3),
                "done": response.get("done"),
                "faulted": response.get("faulted"),
                "is_possible": response.get("is_possible"),
                "queue_position": response.get("queue_position"),
                "wait_time": response.get("wait_time"),
                "generation_count": len(response.get("generations") or []),
                "headers": response_headers,
            }
        )
        if response.get("done") or response.get("faulted") or not response.get("is_possible", True):
            final_response = response
            break
    if final_response is None:
        raise TimeoutError(f"AI Horde turn job {job_id} did not finish")
    generations = final_response.get("generations") or []
    if not generations:
        raise RuntimeError(f"AI Horde turn job {job_id} returned no generation")
    generation = generations[0]
    raw_text = str(generation.get("text") or "")
    metadata = {
        key: generation.get(key)
        for key in ("model", "worker_id", "worker_name", "seed", "state", "gen_metadata")
        if key in generation
    }
    request_record["polls"] = polls
    request_record["final_response"] = final_response
    return request_record, raw_text, metadata


def generate_conversation(plan: Any) -> tuple[dict[str, Any] | None, list[dict[str, Any]], str | None]:
    messages: list[dict[str, Any]] = []
    ledger: list[dict[str, Any]] = []
    turn_jobs: list[str] = []
    workers: set[str] = set()
    worker_ids: set[str] = set()
    seeds: list[Any] = []

    for turn_index in range(1, 7):
        alias = plan.alias_a if turn_index % 2 == 1 else plan.alias_b
        accepted = False
        last_error: str | None = None
        for attempt in range(1, TURN_MAX_ATTEMPTS + 1):
            started_at = full.utc_now()
            try:
                request_record, raw_text, generation_metadata = submit_turn(
                    plan, turn_index, messages, attempt
                )
                sentence, validation = sentence_from_raw(plan, alias, raw_text)
                ledger_row = {
                    "conversation_number": plan.number,
                    "repair_mode": "one_external_generation_per_turn",
                    "turn": turn_index,
                    "attempt": attempt,
                    "started_at": started_at,
                    "completed_at": full.utc_now(),
                    "request": request_record,
                    "raw_text": raw_text,
                    "generation_metadata": generation_metadata,
                    "parsed_sentence": sentence,
                    "validation": validation,
                }
                ledger.append(ledger_row)
                if validation["valid"]:
                    messages.append(
                        {
                            "index": turn_index,
                            "entity": "entity",
                            "alias": alias,
                            "context": plan.context,
                            "speaker": f"entity.{alias}.{plan.context}",
                            "content": sentence,
                        }
                    )
                    turn_jobs.append(request_record["job_id"])
                    if generation_metadata.get("worker_name"):
                        workers.add(str(generation_metadata["worker_name"]))
                    if generation_metadata.get("worker_id"):
                        worker_ids.add(str(generation_metadata["worker_id"]))
                    if "seed" in generation_metadata:
                        seeds.append(generation_metadata["seed"])
                    accepted = True
                    break
                last_error = f"turn validation failed: {validation}"
            except Exception as exc:
                last_error = f"{type(exc).__name__}: {exc}"
                ledger.append(
                    {
                        "conversation_number": plan.number,
                        "repair_mode": "one_external_generation_per_turn",
                        "turn": turn_index,
                        "attempt": attempt,
                        "started_at": started_at,
                        "completed_at": full.utc_now(),
                        "error": last_error,
                        "traceback": traceback.format_exc(),
                        "validation": {"valid": False},
                    }
                )
            if attempt < TURN_MAX_ATTEMPTS:
                time.sleep(2)
        if not accepted:
            return None, ledger, f"turn {turn_index} failed: {last_error}"

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
            "api_base": full.BASE_URL,
            "anonymous": True,
            "per_turn_external_inference": True,
            "job_id": turn_jobs,
            "model": full.MODEL,
            "worker_name": ", ".join(sorted(workers)),
            "worker_id": sorted(worker_ids),
            "seeds": seeds,
        },
    }
    return record, ledger, None


def main() -> int:
    root = pathlib.Path(
        subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
    )
    output_dir = root / full.OUTPUT_ROOT_NAME
    conversation_path = output_dir / "historical_conversations_aihorde_50.jsonl"
    ledger_path = output_dir / "inference_ledger.jsonl"
    manifest_path = output_dir / "manifest.json"
    if not conversation_path.exists() or not ledger_path.exists():
        raise RuntimeError("The 47-conversation base corpus is missing")

    conversations = load_jsonl(conversation_path)
    existing_ledger = load_jsonl(ledger_path)
    existing_manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    existing_ids = {row.get("conversation_id") for row in conversations}
    expected_missing = {f"historical_aihorde_{number:03d}" for number in REPAIR_NUMBERS}
    unexpected_present = expected_missing & existing_ids
    if unexpected_present:
        conversations = [
            row for row in conversations if row.get("conversation_id") not in unexpected_present
        ]

    plan_by_number = {plan.number: plan for plan in full.PLANS}
    repair_records: list[dict[str, Any]] = []
    repair_ledger: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    for number in REPAIR_NUMBERS:
        plan = plan_by_number[number]
        record, ledger, error = generate_conversation(plan)
        repair_ledger.extend(ledger)
        if record is None:
            failures.append(
                {
                    "conversation_number": number,
                    "participants": [plan.person_a, plan.person_b],
                    "context": plan.context,
                    "error": error,
                }
            )
            print(f"FAILED repair {number:02d}: {error}", flush=True)
        else:
            repair_records.append(record)
            print(
                f"repaired {number:02d}/50 {plan.person_a} + {plan.person_b} "
                f"through {len(record['generation']['job_id'])} anonymous external turn jobs",
                flush=True,
            )

    conversations.extend(repair_records)
    combined_ledger = existing_ledger + repair_ledger
    live_model_status = existing_manifest.get("provider", {}).get(
        "live_model_status_at_start", {}
    )
    started_at = existing_manifest.get("started_at") or full.utc_now()
    bundle_path = full.persist_outputs(
        conversations,
        combined_ledger,
        failures,
        live_model_status,
        started_at,
    )
    summary = {
        "base_conversations": len(conversations) - len(repair_records),
        "repairs_completed": len(repair_records),
        "repair_failures": len(failures),
        "final_conversation_count": len(conversations),
        "new_external_turn_attempts": len(repair_ledger),
        "bundle": str(bundle_path),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2), flush=True)
    return 0 if len(conversations) == 50 and not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
