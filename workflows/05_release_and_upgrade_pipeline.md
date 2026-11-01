# Runbook 05: Autonomous Release & Upgrade Pipeline

Whenever a change, bugfix, or feature is applied to the module, execute this automated end-to-end pipeline.

---

## Step 1: Pre-Publication Safety Checks
Run automated test suites and static checks:
```powershell
node tests/systemSafetyCrosscheck.js
node --test tests/advertisingCatalogMatching.test.js
node --test tests/catalogIdentity.test.js
node tests/eventPrefix.test.js
```
All tests must pass with 0 failures before proceeding.

---

## Step 2: Synchronous Version Bumping
Bump semantic version (e.g. `1.45.5` -> `1.46.0`) across all 5 mandatory files:
1. `ps_gtm_datalayer.php` (`$this->version = '1.46.0';`)
2. `config.xml` (`<version><![CDATA[1.46.0]]></version>`)
3. `update-manifest.json` (`version` AND `latest_version`)
4. `CHANGELOG.md` (New entry with bulleted changes)
5. `tests/systemSafetyCrosscheck.js` (Update expected version constant)

---

## Step 3: Create Upgrade Script
Create `upgrade/upgrade-X.Y.Z.php`:
```php
<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

function upgrade_module_X_Y_Z($module)
{
    // Register any new hooks
    $module->registerHook('displayHeader');
    // Clear Smarty and PrestaShop core caches
    Tools::clearAllCache();
    return true;
}
```

---

## Step 4: Clean Packaging (Forward Slashes Only)
Run `scripts/package-release.ps1` to generate `ps_gtm_datalayer.zip`:
- Ensure 0 backslashes (`\`) in the ZIP archive index.
- Calculate SHA-256 hash of the zip file.
- Update `update-manifest.json` with the new hash.
- Copy release zip to `Downloads/ps_gtm_datalayer.zip`.

---

## Step 5: Git Commit, Tag & Push
```bash
git add -A
git commit -m "feat(core): release vX.Y.Z with authoritative pricing fixes"
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin main --tags
```

---

## Step 6: GitHub Release & Asset Verification
1. Create GitHub Release for tag `vX.Y.Z` via GitHub API.
2. Upload `ps_gtm_datalayer.zip` as binary release asset.
3. Test HTTP download endpoint (`curl -I https://github.com/<user>/<repo>/releases/download/vX.Y.Z/ps_gtm_datalayer.zip`).
4. Ensure HTTP 302 / 200 OK response to guarantee PrestaShop 1-Click Update succeeds.
