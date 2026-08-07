# Historical conversations generated through public AI Horde inference

This directory contains 50 six-turn, counterfactual historical-person dialogues serialized as `|entity.alias.context| content`. All accepted dialogue was returned by external AI Horde text workers. The generator used AI Horde's documented shared anonymous credential `0000000000`; it did not use a user-owned API key, repository model-provider secret, paid model subscription, or private inference endpoint.

The Python program handled transport, retries, parsing, validation, serialization, checksums, and provenance. It contains no local language model and no template-generated dialogue fallback. Every conversation is synthetic, does not assert a real meeting, and must not be treated as authentic quotation. The inference ledger records every request, public job ID, poll, raw response, model, volunteer worker, seed, and failed formatting attempt.
