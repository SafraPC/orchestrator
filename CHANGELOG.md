# Changelog

## 2.0.1 - 2026-11-25

### Fixed
- Keep the new process ID when a service is restarted inside the two-second health-check window.
- Stop start from killing unrelated processes that occupy the service port; fail with a clear error so the port can be freed in the UI.
- Stop leftover processes before rebuild so clearing runtime cache does not orphan running apps.
- Load `workspace.json` when collection fields are null instead of crashing the core on boot.
- Persist workspace and runtime through a temp file plus move so a crash mid-write cannot empty the workspace.
- Honor per-request IPC timeouts so long Docker prune and remove jobs no longer kill the core at 45 seconds.
- Force-stop a process that survived the first stop before restarting the service.
- Match Spring `server.port` by exact key and a shared config-file list, including `application-local` files.

### Changed
- Updated release metadata to `2.0.1`.

## 2.0.0 - 2026-09-16

### Added
- Added a top-level Docker section to view and manage the real Docker engine, separate from the workspace's logical containers.
- Added Docker engine status detection (CLI, daemon, context, provider) with Colima awareness, plus an option to start the daemon with a configurable command persisted in `docker.json`.
- Added Docker containers, images, and volumes listings with disk usage, in-use markers, text filter, and container sorting by state (default), name, image, or published port.
- Added container lifecycle actions (start, stop, restart) and mixed-type batch removal, allowing containers, images, and volumes to be selected and removed together.
- Added scoped pruning for containers, images, volumes, build cache, and networks, with reclaimable space shown per scope.

### Fixed
- Treat Docker CLI output as authoritative instead of the exit code alone, since `docker rm --force` exits 0 while printing `Error response from daemon` for missing resources.
- Order batch removals as containers, then images, then volumes, so removing a resource still referenced by a container no longer fails.
- Resolve `docker` and `colima` binaries outside the shell `PATH`, so the packaged app launched from Finder still finds them.
- Normalize Docker resource kinds and prune scopes with `Locale.ROOT`, preventing failures under locales such as Turkish.
- Measure tooltip size before positioning, so tooltips stay centered on their trigger and flip below instead of overlapping the toolbar.
- Prevent release checksums from being computed over unsigned Windows installers when SignPath signing is enabled.

### Changed
- CI now runs the core test suite instead of skipping it.
- Updated release metadata to `2.0.0`.

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
