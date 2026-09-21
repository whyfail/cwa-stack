const inquirer = require('inquirer')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const catalog = require('../catalog.json')

const catalogPath = path.join(__dirname, '..', 'catalog.json')

let question = [
    {
        name: 'name',
        type: 'list',
        message: '请选择要删除的模板',
        choices: Object.keys(catalog.templates)
    },
]

inquirer
    .prompt(question)
    .then(answers=>{
        let {name} = answers
        const usedByPreset = Object.entries(catalog.presets)
            .filter(([, preset]) => preset.frontend === name || preset.backend === name)
            .map(([presetName]) => presetName)

        if (usedByPreset.length) {
            console.log(chalk.yellow(`模板 ${name} 被全栈预设使用：${usedByPreset.join(', ')}，请先删除相关预设`))
            return
        }

        delete catalog.templates[name]
        // 更新catalog.json
        fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8', err=>{
            if(err) console.log(err)
            console.log(chalk.green('模板删除成功'))
            console.log(chalk.gray('当前可用模板列表如下：\n'))
            console.log(catalog.templates)

        })
    })
