// The app's version lives only in package.json (see CLAUDE.md); the native build's version is read from it.
const { version } = require("./package.json");

module.exports = ({ config }) => ({ ...config, version });
