const inquirer = require('inquirer')
const chalk = require('chalk')
const fs = require('fs')
const path = require('path')
const catalog = require('../catalog.json')

const catalogPath = path.join(__dirname, '..', 'catalog.json')

let question = [
    {
        name: 'name',
        type: 'input',
        message: '请输入模板名称',
        validate(val){
            if(val===''){
                console.log(chalk.yellow('模板名称不能为空'))
                return
            }else if(catalog.templates[val]){
                console.log(chalk.yellow('模板名称已存在'))
                return
            }else{
                return  true
            }
        }
    },
    {
        name: 'url',
        type: 'input',
        message: '请输入模板地址',
        validate(url){
            if(url==='') return '模板地址不能为空'
            return true
        }
    }
]

inquirer
    .prompt(question).then(answers => {
        let { name, url } = answers
        catalog.templates[name] = url.replace(/[\u0000-\u0019]/g, '')
        fs.writeFile(catalogPath, JSON.stringify(catalog, null, 2),'utf-8',err=>{
            if(err) console.log(err)
            console.log(chalk.green('模板添加成功'))
            console.log(chalk.grey('当前本地最新模板列表如下：\n'))
            console.log(catalog.templates)
        })
    })
