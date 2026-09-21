const JAVA_PACKAGE_NAME_PATTERN = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/

function isValidJavaPackageName(value) {
  return typeof value === "string" && JAVA_PACKAGE_NAME_PATTERN.test(value)
}

module.exports = { JAVA_PACKAGE_NAME_PATTERN, isValidJavaPackageName }
