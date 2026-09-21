function isValidProjectName(value) {
  return typeof value === "string" && value !== ""
}

module.exports = { isValidProjectName }
