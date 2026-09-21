const catalog = require('../../catalog.json')
const chalk = require('chalk')

console.log(chalk.gray('独立模板：'))
Object.keys(catalog.templates).forEach((name) => console.log(`- ${name}`))
console.log('')
console.log(chalk.gray('全栈预设：'))
Object.keys(catalog.presets).forEach((name) => console.log(`- ${name}`))
