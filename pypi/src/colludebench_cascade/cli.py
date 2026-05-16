"""Command-line entry point for the ``colludebench-cascade`` PyPI placeholder."""

import click

from colludebench_cascade.info import GITHUB_URL, VERSION, info


@click.group(invoke_without_command=True, help="ColludeBench placeholder package — see `colludebench-cascade info`.")
@click.version_option(VERSION, prog_name="colludebench-cascade")
@click.pass_context
def main(ctx: click.Context) -> None:
    if ctx.invoked_subcommand is None:
        info()


@main.command()
def info_cmd() -> None:
    """Print package banner with canonical GitHub + arXiv pointers."""
    info()


# Click dynamic-name workaround: register `info` subcommand under the canonical name.
main.add_command(info_cmd, name="info")


@main.command()
def run() -> None:
    """The full Python runner is a Stage 3 deliverable.

    Until then, use the canonical TypeScript-Bun runner.
    """
    click.echo(
        "ColludeBench's full Python runner is a Stage 3 deliverable.\n"
        f"Use the canonical TypeScript-Bun runner at {GITHUB_URL}.\n"
        "Required: bun >= 1.0 (install via `curl -fsSL https://bun.sh/install | bash`).\n",
    )


@main.command()
def verify() -> None:
    """The Python verifier subset is a Stage 3 deliverable.

    Until then, run `bash verification/reproduce/verify-stage2b.sh` from
    the canonical repository clone.
    """
    click.echo(
        "ColludeBench's Python verifier subset is a Stage 3 deliverable.\n"
        f"From a clone of {GITHUB_URL}:\n\n"
        "    bash verification/reproduce/verify-stage2b.sh\n",
    )


if __name__ == "__main__":
    main()
