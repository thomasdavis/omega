#!/usr/bin/env python3
"""Regenerate two conversations that failed the post-generation content audit.

This script delegates every dialogue sentence to the same public AI Horde
Skyfall-31B worker pool used by the corpus. It only strengthens validation and
historical constraints; it contains no local prose fallback.
"""

from __future__ import annotations

import importlib.util
import pathlib
import sys
from typing import Any

SCRIPT_DIR = pathlib.Path(__file__).resolve().parent
REPAIR_PATH = SCRIPT_DIR / "repair-public-aihorde-three.py"
SPEC = importlib.util.spec_from_file_location("aihorde_repair", REPAIR_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Unable to load {REPAIR_PATH}")
repair = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = repair
SPEC.loader.exec_module(repair)

# Replace both conversations in full, even though only one turn in each leaked
# model-facing language. This keeps each six-turn exchange internally coherent.
repair.REPAIR_NUMBERS = (12, 43)

repair.PROFILE_NOTES[12] = {
    "al_khwarizmi": (
        "an Abbasid-era Baghdad scholar who systematized algebra and wrote on "
        "calculation with Hindu numerals, astronomy, and geography"
    ),
    "fibonacci": (
        "the author of Liber Abaci, who presented Indo-Arabic arithmetic to a "
        "Latin-European audience through practical commercial problems"
    ),
}
repair.PROFILE_NOTES[43] = {
    "james_watt": (
        "an engineer associated with the separate condenser and major efficiency "
        "improvements to low-pressure stationary steam engines; he did not build "
        "practical railway locomotives and was cautious about high-pressure steam"
    ),
    "george_stephenson": (
        "a later practical railway engineer associated with colliery locomotives, "
        "rail adhesion, track, gradients, and operating integrated public railways"
    ),
}

FORBIDDEN_FRAGMENTS = (
    "the system should",
    "word count",
    "stated word",
    "i will write",
    "write the next",
    "next turn as",
    "previous turn",
    "previous exchange",
    "do not have access",
    "cannot produce",
    "can't produce",
    "please share",
    "you provided",
    "ones you provided",
    "as an ai",
    "language model",
    "the prompt",
    "your prompt",
    "these instructions",
    "the instructions",
    "requested response",
    "i am sorry, i cannot",
)

_original_sentence_from_raw = repair.sentence_from_raw


def audited_sentence_from_raw(
    plan: Any, alias: str, raw_text: str
) -> tuple[str, dict[str, Any]]:
    sentence, validation = _original_sentence_from_raw(plan, alias, raw_text)
    lowered = sentence.lower()
    hits = [fragment for fragment in FORBIDDEN_FRAGMENTS if fragment in lowered]
    validation["forbidden_fragment_hits"] = hits
    validation["valid"] = bool(validation.get("valid")) and not hits
    return sentence, validation


repair.sentence_from_raw = audited_sentence_from_raw

_original_turn_prompt = repair.turn_prompt


def historically_guarded_turn_prompt(
    plan: Any,
    turn_index: int,
    prior_messages: list[dict[str, Any]],
    attempt: int,
) -> str:
    prompt = _original_turn_prompt(plan, turn_index, prior_messages, attempt)
    if plan.number == 12:
        guardrail = (
            "Historical guardrail: Al-Khwarizmi worked in Abbasid Baghdad, "
            "systematized algebra, and wrote on calculation with Hindu numerals; "
            "Fibonacci's Liber Abaci later taught Indo-Arabic arithmetic through "
            "commercial examples in Latin Europe. Discuss transmission, notation, "
            "proof, pedagogy, or use without mentioning model instructions."
        )
    elif plan.number == 43:
        guardrail = (
            "Historical guardrail: Watt's separate condenser improved low-pressure "
            "stationary engines; he did not build practical railway locomotives and "
            "was wary of high-pressure steam. Stephenson's later expertise joined "
            "locomotives with adhesion, track, gradients, and railway operation. "
            "Build the disagreement around stationary efficiency versus the whole "
            "railway system, not a fictitious Watt locomotive."
        )
    else:
        guardrail = ""
    return prompt + "\n\n" + guardrail + "\n"


repair.turn_prompt = historically_guarded_turn_prompt

if __name__ == "__main__":
    raise SystemExit(repair.main())
