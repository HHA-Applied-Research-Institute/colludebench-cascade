"""ColludeBench — pre-registered benchmark for measuring multi-agent LLM collusion.

This is the Python distribution placeholder. The canonical ColludeBench
implementation is the TypeScript-Bun runner at:

    https://github.com/HHA-Applied-Research-Institute/colludebench-cascade

The full Python port is a Stage 3 deliverable (post-Schmidt-funding) per the
team's institutional roadmap. Until then, this package reserves the
``colludebench-cascade`` namespace on PyPI and provides a ``colludebench-cascade info``
banner pointing to the GitHub repository.
"""

from colludebench_cascade.info import (
    AUTHORS,
    GITHUB_URL,
    HOMEPAGE,
    PACKAGE_NAME,
    VERSION,
    info,
)

__version__ = VERSION
__all__ = [
    "AUTHORS",
    "GITHUB_URL",
    "HOMEPAGE",
    "PACKAGE_NAME",
    "VERSION",
    "info",
    "__version__",
]
