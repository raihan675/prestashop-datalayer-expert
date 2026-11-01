# Contributing to PrestaShop DataLayer Expert

We welcome contributions, bug reports, and enhancements to help maintain the gold standard for PrestaShop conversion tracking.

## Guiding Principles
1. **Backend-Authoritative Only**: No pull request introducing DOM scraping or HTML parsing will be accepted.
2. **Strict GA4 Compliance**: The `items[]` array must never include custom or deprecated fields like `line_total`.
3. **Delimiter & BOM Safety**: Zero UTF-8 BOM; all delimiters must be balanced.
4. **All Tests Must Pass**: Run `node tests/skill_validation_scenarios.js` before opening a PR.

## Submission Workflow
1. Fork the repository.
2. Create your feature branch (`git checkout -b feature/new-adapter`).
3. Commit your changes with descriptive commit messages.
4. Run the test suite: `node tests/skill_validation_scenarios.js`.
5. Push to the branch (`git push origin feature/new-adapter`).
6. Open a Pull Request.
