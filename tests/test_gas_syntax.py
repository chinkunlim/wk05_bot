import subprocess
from pathlib import Path


def test_gas_files_exist():
    """Verify all 7 Google Apps Script source files exist in src/."""
    expected_files = [
        "Config.gs",
        "Telegram.gs",
        "WebSearch.gs",
        "Gemini.gs",
        "QuotaManager.gs",
        "Storage.gs",
        "Main.gs",
    ]
    src_dir = Path(__file__).parent.parent / "src"
    for filename in expected_files:
        file_path = src_dir / filename
        assert file_path.exists(), f"Missing required GAS file: {filename}"
        assert file_path.stat().st_size > 0, f"GAS file is empty: {filename}"


def test_gas_javascript_syntax_via_node():
    """Validate that all .gs files parse cleanly as valid JavaScript via Node VM."""
    src_dir = Path(__file__).parent.parent / "src"
    node_script = """
    const fs = require('fs');
    const vm = require('vm');
    const path = require('path');
    const files = ['Config.gs', 'Telegram.gs', 'WebSearch.gs', 'Gemini.gs', 'QuotaManager.gs', 'Storage.gs', 'Main.gs'];
    for (const file of files) {
      const code = fs.readFileSync(path.join(process.argv[1], file), 'utf8');
      new vm.Script(code, { filename: file });
    }
    """
    res = subprocess.run(
        ["node", "-e", node_script, str(src_dir)],
        capture_output=True,
        text=True,
    )
    assert res.returncode == 0, f"Node syntax validation failed:\n{res.stderr}"
