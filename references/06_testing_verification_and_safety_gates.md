# 06. Testing, Verification & Mandatory Safety Gates

## 1. Mandatory Pre-Publication Safety Gate

Before any PrestaShop tracking module is committed, packaged, or distributed, it must pass a static code analysis audit checking for syntax, delimiter, and environment safety:

### The 4 Non-Negotiable Checks:
1. **Zero UTF-8 BOM (Byte Order Mark)**: Files beginning with `\xEF\xBB\xBF` cause PHP to send headers prematurely ("Headers already sent"), breaking session cookies, redirects, and AJAX endpoints.
2. **Balanced Delimiters**: All brackets `()`, braces `{}`, and brackets `[]` must be perfectly balanced across PHP and JavaScript files.
3. **`_PS_VERSION_` Direct Execution Guard**: Every PHP file must start with:
   ```php
   if (!defined('_PS_VERSION_')) {
       exit;
   }
   ```
4. **Defensive Global Try-Catch**: Every hook method and Back Office controller must wrap its logic in `try ... catch (\Throwable $e)` to guarantee zero storefront disruption if an unexpected data anomaly occurs.

---

## 2. Automated Static Safety Crosscheck (`systemSafetyCrosscheck.js`)

Implement an automated script that scans all repository files before release:

```javascript
const fs = require('fs');
const path = require('path');

function checkFile(filePath) {
  const buf = fs.readFileSync(filePath);
  // 1. BOM check
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    throw new Error(`UTF-8 BOM detected in ${filePath}`);
  }
  const content = buf.toString('utf8');
  // 2. _PS_VERSION_ guard in PHP files
  if (filePath.endsWith('.php') && !content.includes('_PS_VERSION_')) {
    throw new Error(`Missing _PS_VERSION_ check in ${filePath}`);
  }
  // 3. Balanced braces
  let openBraces = (content.match(/{/g) || []).length;
  let closeBraces = (content.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    throw new Error(`Unbalanced curly braces in ${filePath}: { = ${openBraces}, } = ${closeBraces}`);
  }
}
```

---

## 3. Strict Forward-Slash Archive Packaging

When packaging a PrestaShop module for distribution, Windows PowerShell's native `Compress-Archive` or .NET zip tools can inadvertently embed backslashes (`\`) into directory entry paths:
`ps_gtm_datalayer\classes\PricingEngine.php`

On Linux servers (which host >95% of PrestaShop stores), Linux zip extractors fail to parse backslashes as directory separators. They extract files with literal backslashes in the filename directly into the root folder, completely breaking module class loading and causing fatal crashes (`Class not found`).

### Rule for Release Packaging:
Always normalize all entry paths to forward slashes (`/`):

```powershell
$entryName = $entryName.Replace("\", "/")
```
And verify that the backslash count in the final zip archive is strictly **`0`**.

---

## 4. End-to-End Release & Distribution Checklist

1. **Synchronous Version Bump**: Update version string synchronously across:
   - Module main class (`$this->version = 'X.Y.Z'`)
   - `config.xml` (`<version><![CDATA[X.Y.Z]]></version>`)
   - `update-manifest.json` (`latest_version` and `version`)
   - `CHANGELOG.md`
   - `tests/systemSafetyCrosscheck.js`
2. **Upgrade Script Creation**: Create `upgrade/upgrade-X.Y.Z.php` clearing Smarty and module caches.
3. **Automated Unit Testing**: Run all test suites and ensure 0 failures.
4. **Checksum Verification**: Compute SHA-256 hash of `ps_gtm_datalayer.zip` and record it in `update-manifest.json`.
5. **Git Tagging & Push**: Commit, create annotated tag `vX.Y.Z`, and push to origin with `--tags`.
6. **Release Asset Upload**: Create GitHub Release via API and attach `ps_gtm_datalayer.zip`.
7. **Download Verification**: Make an HTTP HEAD request to the binary download URL and verify `HTTP 302 / 200 OK` (guaranteeing that 1-Click Update never fails with 404).
