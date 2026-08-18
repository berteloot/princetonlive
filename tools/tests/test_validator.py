"""
Regression tests for the monitor's json_path validator.

These exist because a check pointed at a health flag once passed while the flag said
false. The bug survived a hand-written test that re-implemented the validator's logic
instead of calling it, so the test agreed with the assumption rather than the code.

Every test below calls validate_http_response directly. If a test here ever needs a copy
of the production logic to make its assertion, the test is wrong.

Run: python3 tools/tests/test_validator.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from site_monitor import HttpResponse, validate_http_response


def check(payload, json_path="ok"):
    item = {"name": "t", "url": "https://example.test/x", "expect_status": [200],
            "json_path": json_path}
    response = HttpResponse(200, json.dumps(payload).encode())
    return validate_http_response(item, response, 1, None, 1)


CASES = [
    ("false must fail, this is the fail-open that shipped", {"ok": False}, True),
    ("null must fail", {"ok": None}, True),
    ("empty string must fail", {"ok": ""}, True),
    ("empty list must fail", {"ok": []}, True),
    ("empty dict must fail", {"ok": {}}, True),
    ("true must pass", {"ok": True}, False),
    ("zero must pass, 0 degrees is a real reading", {"ok": 0}, False),
    ("a number must pass", {"ok": 41.1}, False),
    ("a string must pass", {"ok": "green"}, False),
]

failures = 0
for label, payload, should_fail in CASES:
    result = check(payload)
    did_fail = result is not None and not result.ok
    if did_fail != should_fail:
        print(f"FAIL: {label} (expected fail={should_fail}, got fail={did_fail})")
        failures += 1
    else:
        print(f"ok:   {label}")

print(f"\n{len(CASES) - failures} passed, {failures} failed")
sys.exit(1 if failures else 0)
