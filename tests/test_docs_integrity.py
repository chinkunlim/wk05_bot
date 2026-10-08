from pathlib import Path


def test_core_docs_exist():
    """Verify all expected root and architecture markdown documentation exists."""
    root_dir = Path(__file__).parent.parent
    expected_docs = [
        "README.md",
        "AGENTS.md",
        "WORKFLOW_GUIDE.md",
        "CHANGELOG.md",
        "DECISIONS.md",
        "KNOWN_ISSUES.md",
        "LICENSE",
        "docs/ARCHITECTURE.md",
        "docs/TOOLS.md",
        "docs/CONTEXT.md",
        "docs/DEPLOYMENT.md",
        "docs/PROMPT_TEMPLATES.md",
        "conversations/README.md",
    ]
    for doc in expected_docs:
        doc_path = root_dir / doc
        assert doc_path.exists(), f"Missing required documentation: {doc}"
        assert doc_path.stat().st_size > 0, f"Document is empty: {doc}"


def test_reports_and_presentations_exist():
    """Verify final reports and presentation PDFs exist in reports/."""
    root_dir = Path(__file__).parent.parent
    reports_dir = root_dir / "reports"
    assert (reports_dir / "TelegramBot-AI智慧助理Bot改善版-成果簡報.pdf").exists()
    assert (reports_dir / "LINEBot-AI智慧助理Bot第一版-成果簡報.pdf").exists()
    assert (reports_dir / "專題計畫書_AI智慧助理Bot第一版.pdf").exists()
    assert (reports_dir / "02-課後作業-LINEBot開發與成果展示.docx").exists()


def test_proof_screenshots_exist():
    """Verify all 22 proof screenshots exist in assets/ and docs/assets/."""
    root_dir = Path(__file__).parent.parent
    assets_dir = root_dir / "assets"
    docs_assets_dir = root_dir / "docs" / "assets"

    for i in range(1, 23):
        # proof_01 to proof_22
        prefix = f"proof_{i:02d}_"
        matches_root = list(assets_dir.glob(f"{prefix}*.png"))
        matches_docs = list(docs_assets_dir.glob(f"{prefix}*.png"))
        assert len(matches_root) == 1, f"Missing proof in assets/: {prefix}"
        assert len(matches_docs) == 1, f"Missing proof in docs/assets/: {prefix}"
