#!/usr/bin/env python3
"""One-request proof that external historical dialogue comes from public AI Horde.

Inference authentication is AI Horde's documented shared anonymous credential
0000000000. The script never reads an API key, provider token, repository secret,
or paid-account credential from the environment.
"""

from __future__ import annotations

import datetime as dt
import json
import os
import pathlib
import re
import subprocess
import time
import traceback
import urllib.error
import urllib.request
from typing import Any

BASE_URL = "https://aihorde.net/api/v2"
ANONYMOUS_KEY = "0000000000"
CLIENT_AGENT = "ajaxdavis-training-data:0.1:https://github.com/thomasdavis/omega"
PREFERRED_MODELS = [
    "google/gemma-4-31b",
    "aphrodite/TheDrummer/Skyfall-31B-v4.2",
    "aphrodite/TheDrummer/Cydonia-24B-v4.3",
    "koboldcpp/gemma-4-12b-it-UD-Q5_K_XL",
]
EXPECTED_TAGS = [
    "|entity.socrates.virtue_and_learning|",
    "|entity.confucius.virtue_and_learning|",
] * 3


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat()


def json_request(
    url: str,
    *,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    timeout: int = 90,
) -> tuple[int, dict[str, Any], dict[str, str]]:
    request_headers = {"Accept": "application/json"}
    if headers:
        request_headers.update(headers)
    data = None
    if body is not None:
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    request = urllib.request.Request(
        url,
        data=data,
        headers=request_headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return response.status, payload, dict(response.headers.items())
    except urllib.error.HTTPError as exc:
        response_body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {exc.code} from {url}: {response_body[:2000]}") from exc


def choose_models(status_rows: Any) -> tuple[list[str], list[dict[str, Any]]]:
    rows = status_rows if isinstance(status_rows, list) else []
    by_name = {
        str(row.get("name")): row
        for row in rows
        if isinstance(row, dict) and row.get("name")
    }
    selected = [name for name in PREFERRED_MODELS if name in by_name]
    if not selected:
        candidates = []
        for row in rows:
            if not isinstance(row, dict):
                continue
            name = str(row.get("name", ""))
            workers = int(row.get("count") or row.get("workers") or 0)
            queued = int(row.get("queued") or row.get("queued_jobs") or 0)
            lowered = name.lower()
            if workers > 0 and any(token in lowered for token in ("gemma", "31b", "24b", "qwen")):
                candidates.append((queued, -workers, name))
        selected = [item[2] for item in sorted(candidates)[:4]]
    if not selected:
        selected = list(PREFERRED_MODELS)
    selected_rows = [by_name[name] for name in selected if name in by_name]
    return selected, selected_rows


def extract_messages(text: str) -> tuple[list[dict[str, str]], dict[str, Any]]:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    marker = re.compile(
        r"\|entity\.(socrates|confucius)\.virtue_and_learning\|\s*",
        re.IGNORECASE,
    )
    matches = list(marker.finditer(normalized))
    messages: list[dict[str, str]] = []
    for index, match in enumerate(matches):
        end = matches[index + 1].start() if index + 1 < len(matches) else len(normalized)
        content = normalized[match.end() : end]
        content = content.split("<END>", 1)[0]
        content = re.sub(r"\s+", " ", content).strip(" \n\t-*#")
        messages.append({"alias": match.group(1).lower(), "content": content})
    expected_aliases = ["socrates", "confucius"] * 3
    valid = (
        len(messages) == 6
        and [message["alias"] for message in messages] == expected_aliases
        and all(len(message["content"]) >= 25 for message in messages)
    )
    return messages, {
        "valid": valid,
        "message_count": len(messages),
        "aliases": [message["alias"] for message in messages],
        "all_content_nontrivial": all(len(message["content"]) >= 25 for message in messages),
    }


def persist_result(result: dict[str, Any], text: str) -> None:
    root = pathlib.Path(
        subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip()
    )
    output_dir = root / "public-inference-output"
    output_dir.mkdir(parents=True, exist_ok=True)
    (output_dir / "probe.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    (output_dir / "probe.txt").write_text(text, encoding="utf-8")

    branch = os.environ.get("GITHUB_HEAD_REF") or subprocess.check_output(
        ["git", "branch", "--show-current"], text=True
    ).strip()
    if not branch:
        branch = "tmp/aihorde-public-probe-20260808"

    subprocess.run(["git", "-C", str(root), "add", "public-inference-output/probe.json", "public-inference-output/probe.txt"], check=True)
    diff = subprocess.run(["git", "-C", str(root), "diff", "--cached", "--quiet"])
    if diff.returncode != 0:
        subprocess.run(
            [
                "git",
                "-C",
                str(root),
                "commit",
                "-m",
                "chore: record public AI Horde probe result [skip ci]",
            ],
            check=True,
        )
        subprocess.run(
            ["git", "-C", str(root), "push", "origin", f"HEAD:{branch}"],
            check=True,
        )


def main() -> int:
    started_at = utc_now()
    result: dict[str, Any] = {
        "run_type": "public_external_inference_probe",
        "provider": "AI Horde",
        "api_base": BASE_URL,
        "inference_credential": {
            "value": ANONYMOUS_KEY,
            "ownership": "AI Horde documented shared anonymous credential",
            "user_owned": False,
        },
        "user_keys_or_provider_secrets_read": False,
        "started_at": started_at,
    }
    generated_text = ""
    try:
        model_status_code, model_status, model_headers = json_request(
            BASE_URL + "/status/models?type=text"
        )
        selected_models, selected_rows = choose_models(model_status)
        result["model_status"] = {
            "http_status": model_status_code,
            "selected_models": selected_models,
            "selected_model_rows": selected_rows,
            "response_headers": model_headers,
        }

        prompt = """You are generating synthetic historical-dialogue training data.
Create exactly one six-turn counterfactual conversation between Socrates and Confucius about whether virtue is taught, practised, or discovered through examination.

Return exactly six non-empty lines and nothing else. Alternate speakers exactly. Use this exact syntax:
|entity.socrates.virtue_and_learning| message
|entity.confucius.virtue_and_learning| message
|entity.socrates.virtue_and_learning| message
|entity.confucius.virtue_and_learning| message
|entity.socrates.virtue_and_learning| message
|entity.confucius.virtue_and_learning| message

Each message must be one or two historically grounded sentences. Develop a real disagreement and partial synthesis. Do not claim they actually met. Do not present any sentence as an authentic quotation. Do not add Markdown, headings, commentary, or stage directions. End after the sixth line with <END>.
"""
        request_payload = {
            "prompt": prompt,
            "params": {
                "n": 1,
                "max_context_length": 4096,
                "max_length": 650,
                "temperature": 0.45,
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
            "models": selected_models,
            "trusted_workers": False,
            "validated_backends": True,
            "slow_workers": True,
            "extra_slow_workers": True,
            "worker_blacklist": False,
            "allow_downgrade": False,
            "dry_run": False,
        }
        result["request"] = request_payload
        submit_started = time.monotonic()
        submit_code, submit_response, submit_headers = json_request(
            BASE_URL + "/generate/text/async",
            method="POST",
            body=request_payload,
            headers={
                "apikey": ANONYMOUS_KEY,
                "Client-Agent": CLIENT_AGENT,
            },
        )
        result["submission"] = {
            "http_status": submit_code,
            "response": submit_response,
            "headers": submit_headers,
            "latency_ms": round((time.monotonic() - submit_started) * 1000, 3),
        }
        job_id = str(submit_response["id"])
        result["job_id"] = job_id

        polls: list[dict[str, Any]] = []
        deadline = time.monotonic() + 660
        final_status: dict[str, Any] | None = None
        while time.monotonic() < deadline:
            time.sleep(5)
            poll_started = time.monotonic()
            poll_code, status, poll_headers = json_request(
                BASE_URL + f"/generate/text/status/{job_id}"
            )
            polls.append(
                {
                    "at": utc_now(),
                    "http_status": poll_code,
                    "latency_ms": round((time.monotonic() - poll_started) * 1000, 3),
                    "done": status.get("done"),
                    "faulted": status.get("faulted"),
                    "is_possible": status.get("is_possible"),
                    "queue_position": status.get("queue_position"),
                    "wait_time": status.get("wait_time"),
                    "generation_count": len(status.get("generations") or []),
                    "headers": poll_headers,
                }
            )
            if status.get("done") or status.get("faulted") or not status.get("is_possible", True):
                final_status = status
                break
        result["polls"] = polls
        if final_status is None:
            raise TimeoutError("AI Horde request did not finish within 660 seconds")
        result["final_response"] = final_status
        generations = final_status.get("generations") or []
        if not generations:
            raise RuntimeError("AI Horde returned no generation")
        generation = generations[0]
        generated_text = str(generation.get("text") or "")
        messages, validation = extract_messages(generated_text)
        result["generation_metadata"] = {
            key: generation.get(key)
            for key in (
                "model",
                "worker_id",
                "worker_name",
                "seed",
                "state",
                "gen_metadata",
            )
            if key in generation
        }
        result["messages"] = messages
        result["validation"] = validation
    except Exception as exc:
        result["error"] = f"{type(exc).__name__}: {exc}"
        result["traceback"] = traceback.format_exc()
        result.setdefault("validation", {"valid": False})
    result["completed_at"] = utc_now()
    persist_result(result, generated_text)
    print(json.dumps({"job_id": result.get("job_id"), "validation": result.get("validation"), "error": result.get("error")}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
