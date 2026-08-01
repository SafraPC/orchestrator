# Changelog

## 1.0.10 - 2026-08-01

### Fixed
- Isolate Unix service launches in a new session (`setsid`) so scripts with `trap "kill 0"` (e.g. intranet `composer serve`) cannot kill the Orchestrator process group on stop.
- Stop shared-PGID services with SIGKILL-only trees; never SIGTERM when the service still shares the JVM process group.
- Kill Unix ports via LISTEN-focused `lsof`, isolated process groups when safe, and full service trees without touching the JVM.
- Cap log-tail reads and avoid loading entire log files on health check to reduce crashes under noisy PHP/Composer output.
- Improve containers sidebar layout so names are readable and action icons no longer overflow when a container is running.

### Changed
- Updated release metadata to `1.0.10`.

## 1.0.9 - 2026-07-02

### Added
- Added manual PHP command selection per service, including custom commands.
- Added bulk service selection with Shift-click, aggregated logs for selected services, and selected-service container actions.
- Added container restart action to restart all services in a logical container.

### Fixed
- Prevent Composer-managed PHP scripts from receiving Orchestrator-managed ports.
- Avoid detecting Node, HTML, JavaScript, and standalone PHP services inside imported PHP project trees.

### Changed
- Reorganized the Java runtime package into contextual subpackages for workspace, services, containers, logs, discovery, and tools.
- Updated release metadata to `1.0.9`.

## 1.0.8 - 2026-06-14

### Fixed
- Prevent PHP web runtime warnings and deprecations from being printed into API JSON responses when services are started by Orchestrator.
- Keep PHP web startup logs visible while disabling `display_errors` for `artisan:serve` and `php:serve` commands started directly by the app.

### Changed
- Updated release metadata to `1.0.8`.
