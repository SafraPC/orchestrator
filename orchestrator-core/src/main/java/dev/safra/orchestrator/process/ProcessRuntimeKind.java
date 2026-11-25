package dev.safra.orchestrator.process;

import dev.safra.orchestrator.model.ProjectType;
import java.util.EnumSet;
import java.util.Set;

enum ProcessRuntimeKind {
  JAVA,
  PHP,
  JS;

  private static final Set<ProjectType> PHP_TYPES = EnumSet.of(
      ProjectType.LARAVEL,
      ProjectType.SYMFONY,
      ProjectType.PHP_COMPOSER,
      ProjectType.STANDALONE_PHP);

  static ProcessRuntimeKind of(ProjectType type) {
    if (type == null || type == ProjectType.SPRING_BOOT) {
      return JAVA;
    }
    if (PHP_TYPES.contains(type)) {
      return PHP;
    }
    return JS;
  }
}
