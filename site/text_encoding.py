"""Reject UTF-8 text accidentally decoded as a Windows single-byte encoding."""
import re

# Detect pairs rather than individual letters: Ã and Â can be valid characters.
_CONTINUATION = '[\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013-\u201a\u201c-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]'
BROKEN_TEXT = re.compile(r'(?:[ÃÂ]' + _CONTINUATION + r'|â' + _CONTINUATION + r'{2}|ï¿½|\ufffd)')


def validate_text(value, location='content'):
    if isinstance(value, str):
        match = BROKEN_TEXT.search(value)
        if match:
            raise ValueError(f'{location}: invalid text encoding near {value[max(0, match.start()-16):match.end()+24]!r}')
    elif isinstance(value, dict):
        for key, item in value.items():
            validate_text(key, location + '.key')
            validate_text(item, f'{location}.{key}')
    elif isinstance(value, (list, tuple)):
        for index, item in enumerate(value):
            validate_text(item, f'{location}[{index}]')
