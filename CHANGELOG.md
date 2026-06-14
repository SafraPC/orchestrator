# Changelog

## 1.0.8 - 2026-06-14

### Fixed
- Prevent PHP web runtime warnings and deprecations from being printed into API JSON responses when services are started by Orchestrator.
- Keep PHP web startup logs visible while disabling `display_errors` for `artisan:serve` and `php:serve` commands started directly by the app.

### Changed
- Updated release metadata to `1.0.8`.
