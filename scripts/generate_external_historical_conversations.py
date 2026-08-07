#!/usr/bin/env python3
"""Generate 50 counterfactual historical conversations through OpenAI's hosted API.

This file contains transport, validation, and serialization only. All dialogue text is
returned by the external model identified in the manifest.
"""

from __future__ import annotations

import concurrent.futures
import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import sys
import time
import urllib.error
import urllib.request
import uuid
import zipfile
from dataclasses import dataclass
from typing import Any

API_URL = os.environ.get("OPENAI_API_URL", "https://api.openai.com/v1/chat/completions")
MODEL = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")
API_KEY = os.environ.get("OPENAI_API_KEY", "")
OUT_DIR = pathlib.Path(os.environ.get("OUTPUT_DIR", "external-historical-inference-output"))
MAX_WORKERS = max(1, min(8, int(os.environ.get("INFERENCE_CONCURRENCY", "4"))))
RUN_STARTED = dt.datetime.now(dt.timezone.utc)
TAG_RE = re.compile(r"^\|entity\.([a-z0-9_]+)\.([a-z0-9_]+)\|\s+(.+)$")


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

PLANS = [Plan(i + 1, *row) for i, row in enumerate(RAW_PLANS)]

SCHEMA = {
    "name": "historical_conversation",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["title", "messages"],
        "properties": {
            "title": {"type": "string"},
            "messages": {
                "type": "array",
                "minItems": 6,
                "maxItems": 6,
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["alias", "content"],
                    "properties": {
                        "alias": {"type": "string"},
                        "content": {"type": "string"},
                    },
                },
            },
        },
    },
}


def prompt_for(plan: Plan) -> str:
    aliases = [plan.alias_a, plan.alias_b] * 3
    return f"""Create one newly written, counterfactual historical dialogue.

Participants:
- {plan.person_a}, alias exactly `{plan.alias_a}`
- {plan.person_b}, alias exactly `{plan.alias_b}`
Conversation context slug: `{plan.context}`
Subject: {plan.subject}

Return JSON only, matching the supplied schema. Requirements:
1. Exactly six messages, alternating in this exact alias order: {json.dumps(aliases)}.
2. Each message is one to three substantial sentences. The exchange must develop an argument: opening positions, disagreement or qualification, then a useful partial synthesis or sharpened unresolved question.
3. Ground each speaker in positions, methods, vocabulary, institutions, or experiences reasonably associated with that person. Do not manufacture precise biographical facts.
4. This is synthetic counterfactual dialogue. Do not claim they met, and do not present any sentence as an authentic quotation.
5. Do not make every speaker introduce themselves. Do not include speaker tags, Markdown, stage directions, citations, or quotation marks around the whole message.
6. Avoid generic motivational prose, repetitive agreement, caricatured accents, and modern internet language.
7. The title should be concise and descriptive.
"""


def clean_json_text(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return text.strip()


def http_post(payload: dict[str, Any], timeout: int = 150) -> tuple[dict[str, Any], dict[str, str], int]:
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
            "User-Agent": "omega-external-historical-dataset/1.0",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            body = response.read().decode("utf-8")
            return json.loads(body), {k.lower(): v for k, v in response.headers.items()}, response.status
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code}: {body[:1200]}") from exc


def validate_generated(plan: Plan, generated: Any) -> dict[str, Any]:
    if not isinstance(generated, dict):
        raise ValueError("top-level output is not an object")
    title = generated.get("title")
    messages = generated.get("messages")
    if not isinstance(title, str) or not title.strip():
        raise ValueError("missing title")
    if not isinstance(messages, list) or len(messages) != 6:
        raise ValueError(f"expected 6 messages, got {len(messages) if isinstance(messages, list) else 'non-list'}")
    expected = [plan.alias_a, plan.alias_b] * 3
    normalized: list[dict[str, str]] = []
    for index, (message, expected_alias) in enumerate(zip(messages, expected), start=1):
        if not isinstance(message, dict):
            raise ValueError(f"message {index} is not an object")
        alias = message.get("alias")
        content = message.get("content")
        if alias != expected_alias:
            raise ValueError(f"message {index} alias {alias!r}; expected {expected_alias!r}")
        if not isinstance(content, str) or len(content.strip()) < 35:
            raise ValueError(f"message {index} is missing or too short")
        content = " ".join(content.strip().split())
        if "|entity." in content or "```" in content:
            raise ValueError(f"message {index} contains serialization markup")
        normalized.append({"alias": alias, "content": content})
    return {"title": " ".join(title.strip().split()), "messages": normalized}


def infer_one(plan: Plan) -> tuple[dict[str, Any], dict[str, Any]]:
    if not API_KEY:
        raise RuntimeError("OPENAI_API_KEY is not set")
    base_payload: dict[str, Any] = {
        "model": MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You generate historically grounded synthetic training data and obey exact structured-output contracts.",
            },
            {"role": "user", "content": prompt_for(plan)},
        ],
        "temperature": 0.75,
        "max_tokens": 1400,
        "response_format": {"type": "json_schema", "json_schema": SCHEMA},
    }
    errors: list[str] = []
    for attempt in range(1, 5):
        payload = dict(base_payload)
        if errors:
            payload["messages"] = list(base_payload["messages"]) + [
                {
                    "role": "user",
                    "content": "The previous attempt failed validation. Correct the output. Error: " + errors[-1],
                }
            ]
        started = time.time()
        try:
            response, headers, status = http_post(payload)
            elapsed_ms = round((time.time() - started) * 1000, 3)
            choice = response["choices"][0]
            message = choice["message"]
            if message.get("refusal"):
                raise ValueError(f"model refusal: {message['refusal']}")
            parsed = json.loads(clean_json_text(message.get("content") or ""))
            normalized = validate_generated(plan, parsed)
            record = {
                "conversation_id": f"historical_external_{plan.number:03d}",
                "title": normalized["title"],
                "synthetic": True,
                "counterfactual_dialogue": True,
                "authentic_quote": False,
                "context": plan.context,
                "subject": plan.subject,
                "participants": [
                    {"display_name": plan.person_a, "alias": plan.alias_a},
                    {"display_name": plan.person_b, "alias": plan.alias_b},
                ],
                "messages": [
                    {
                        "index": index,
                        "entity": "entity",
                        "alias": item["alias"],
                        "context": plan.context,
                        "speaker": f"entity.{item['alias']}.{plan.context}",
                        "content": item["content"],
                    }
                    for index, item in enumerate(normalized["messages"], start=1)
                ],
                "generation": {
                    "provider": "OpenAI",
                    "endpoint": API_URL,
                    "model": response.get("model", MODEL),
                    "response_id": response.get("id"),
                    "request_id": headers.get("x-request-id"),
                    "system_fingerprint": response.get("system_fingerprint"),
                    "finish_reason": choice.get("finish_reason"),
                    "usage": response.get("usage", {}),
                    "latency_ms": elapsed_ms,
                    "attempt": attempt,
                    "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                },
            }
            record["serialized"] = "\n".join(
                f"|entity.{m['alias']}.{plan.context}| {m['content']}" for m in record["messages"]
            )
            log = {
                "conversation_id": record["conversation_id"],
                "attempt": attempt,
                "request": {k: v for k, v in payload.items()},
                "response": response,
                "http": {
                    "status": status,
                    "request_id": headers.get("x-request-id"),
                    "processing_ms": headers.get("openai-processing-ms"),
                    "latency_ms": elapsed_ms,
                },
            }
            return record, log
        except Exception as exc:
            errors.append(f"{type(exc).__name__}: {exc}")
            if attempt < 4:
                time.sleep(min(2**attempt, 8))
    raise RuntimeError(f"conversation {plan.number} failed after 4 attempts: {' | '.join(errors)}")


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if len(PLANS) != 50:
        raise RuntimeError(f"plan count is {len(PLANS)}, expected 50")

    results: dict[int, tuple[dict[str, Any], dict[str, Any]]] = {}
    failures: list[str] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as pool:
        futures = {pool.submit(infer_one, plan): plan for plan in PLANS}
        for future in concurrent.futures.as_completed(futures):
            plan = futures[future]
            try:
                results[plan.number] = future.result()
                print(f"generated {plan.number:02d}/50: {plan.person_a} + {plan.person_b}", flush=True)
            except Exception as exc:
                failures.append(f"{plan.number}: {exc}")
                print(f"FAILED {plan.number:02d}: {exc}", file=sys.stderr, flush=True)

    if failures:
        (OUT_DIR / "failures.txt").write_text("\n".join(failures) + "\n", encoding="utf-8")
        raise RuntimeError(f"{len(failures)} conversations failed")

    conversations = [results[i][0] for i in range(1, 51)]
    logs = [results[i][1] for i in range(1, 51)]

    txt_path = OUT_DIR / "historical_conversations_external_50.txt"
    jsonl_path = OUT_DIR / "historical_conversations_external_50.jsonl"
    log_path = OUT_DIR / "inference_requests_responses.jsonl"
    validation_path = OUT_DIR / "validation_report.json"
    manifest_path = OUT_DIR / "manifest.json"
    readme_path = OUT_DIR / "README.md"

    txt_path.write_text("\n\n".join(c["serialized"] for c in conversations) + "\n", encoding="utf-8")
    with jsonl_path.open("w", encoding="utf-8") as handle:
        for conversation in conversations:
            handle.write(json.dumps(conversation, ensure_ascii=False, separators=(",", ":")) + "\n")
    with log_path.open("w", encoding="utf-8") as handle:
        for log in logs:
            handle.write(json.dumps(log, ensure_ascii=False, separators=(",", ":")) + "\n")

    all_lines = [line for c in conversations for line in c["serialized"].splitlines()]
    parsed_lines = []
    for line in all_lines:
        match = TAG_RE.match(line)
        if not match:
            raise RuntimeError(f"invalid tagged line: {line[:120]}")
        parsed_lines.append(match.groups())
    unique_texts = {m["content"] for c in conversations for m in c["messages"]}
    response_ids = {c["generation"]["response_id"] for c in conversations}
    request_ids = {c["generation"]["request_id"] for c in conversations if c["generation"]["request_id"]}
    total_usage: dict[str, int] = {}
    for c in conversations:
        for key, value in c["generation"].get("usage", {}).items():
            if isinstance(value, int):
                total_usage[key] = total_usage.get(key, 0) + value

    validation = {
        "valid": True,
        "conversation_count": len(conversations),
        "messages_per_conversation": sorted({len(c["messages"]) for c in conversations}),
        "message_count": sum(len(c["messages"]) for c in conversations),
        "tagged_line_count": len(parsed_lines),
        "unique_message_texts": len(unique_texts),
        "unique_contexts": len({c["context"] for c in conversations}),
        "unique_aliases": len({m["alias"] for c in conversations for m in c["messages"]}),
        "external_api_calls": len(logs),
        "unique_response_ids": len(response_ids),
        "unique_request_ids_present": len(request_ids),
        "all_alternate_exactly": all(
            [m["alias"] for m in c["messages"]]
            == [c["participants"][0]["alias"], c["participants"][1]["alias"]] * 3
            for c in conversations
        ),
        "all_tags_valid": len(parsed_lines) == 300,
        "all_synthetic_marked": all(c["synthetic"] and c["counterfactual_dialogue"] for c in conversations),
        "total_provider_usage": total_usage,
    }
    validation_path.write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    completed = dt.datetime.now(dt.timezone.utc)
    manifest = {
        "dataset": "historical_conversations_external_50",
        "version": "2.0.0",
        "run_id": str(uuid.uuid4()),
        "started_at": RUN_STARTED.isoformat(),
        "completed_at": completed.isoformat(),
        "elapsed_seconds": round((completed - RUN_STARTED).total_seconds(), 3),
        "requested_inference": "existing external hosted model",
        "actual_inference": {
            "provider": "OpenAI",
            "endpoint": API_URL,
            "model_requested": MODEL,
            "models_returned": sorted({c["generation"]["model"] for c in conversations}),
            "api_calls": len(logs),
            "response_ids": len(response_ids),
            "request_ids_present": len(request_ids),
            "local_model_used": False,
            "coded_or_template_model_used": False,
            "client_code_role": "transport, validation, serialization, and provenance logging only",
        },
        "hosted_execution": {
            "surface": "GitHub Actions",
            "repository": os.environ.get("GITHUB_REPOSITORY"),
            "workflow": os.environ.get("GITHUB_WORKFLOW"),
            "run_id": os.environ.get("GITHUB_RUN_ID"),
            "run_attempt": os.environ.get("GITHUB_RUN_ATTEMPT"),
            "sha": os.environ.get("GITHUB_SHA"),
        },
        "dataset_counts": validation,
        "policy": {
            "synthetic": True,
            "counterfactual": True,
            "authentic_quote": False,
            "note": "The model was instructed not to claim real meetings or emit purported verbatim quotations.",
        },
    }
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    readme_path.write_text(
        "# Historical conversations — external inference run\n\n"
        "This corpus contains 50 six-turn counterfactual conversations serialized as "
        "`|entity.alias.context| content`. Dialogue text was generated by the externally hosted "
        f"OpenAI model `{MODEL}` through `{API_URL}`. The Python program only sent requests, "
        "validated responses, serialized records, and wrote provenance. It did not implement or emulate a model.\n\n"
        "Every conversation is synthetic and must not be treated as a transcript or as authentic quotation. "
        "The request/response ledger retains provider response IDs and token usage, but never the API key.\n",
        encoding="utf-8",
    )

    files = [txt_path, jsonl_path, log_path, validation_path, manifest_path, readme_path]
    checksums_path = OUT_DIR / "SHA256SUMS"
    checksums_path.write_text("".join(f"{sha256(path)}  {path.name}\n" for path in files), encoding="utf-8")
    files.append(checksums_path)

    zip_path = OUT_DIR / "historical_conversations_external_50_bundle.zip"
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for path in files:
            archive.write(path, arcname=path.name)

    print(json.dumps(validation, indent=2), flush=True)
    print(f"bundle={zip_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
