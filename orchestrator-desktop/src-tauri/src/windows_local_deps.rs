use std::env;
use std::fs;
use std::path::PathBuf;

pub fn local_java_home() -> Option<PathBuf> {
  let mut roots = Vec::new();
  if let Some(local_app_data) = env::var_os("LOCALAPPDATA") {
    roots.push(PathBuf::from(local_app_data).join("OrchestratorBuildDeps"));
  }
  if let Some(home) = env::var_os("HOME") {
    roots.push(PathBuf::from(home).join(".local").join("share").join("OrchestratorBuildDeps"));
  }
  let mut homes = Vec::new();
  for deps_root in roots {
    if !deps_root.is_dir() {
      continue;
    }
    let entries = fs::read_dir(deps_root).ok()?;
    for entry in entries.flatten() {
      let path = entry.path();
      let direct = path.join("bin").join("java");
      let windows = path.join("bin").join("java.exe");
      let bundle = path.join("Contents").join("Home").join("bin").join("java");
      let java_home = if direct.is_file() || windows.is_file() {
        Some(path.clone())
      } else if bundle.is_file() {
        Some(path.join("Contents").join("Home"))
      } else {
        None
      };
      if let Some(java_home) = java_home {
        let modified = entry
          .metadata()
          .ok()
          .and_then(|metadata| metadata.modified().ok());
        homes.push((modified, java_home));
      }
    }
  }
  homes.sort_by(|left, right| right.0.cmp(&left.0));
  homes.into_iter().map(|(_, path)| path).next()
}
