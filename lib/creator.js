import inquirer from 'inquirer';
import Handlebars from 'handlebars';
import downloadGitRepo from 'download-git-repo';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { promisify } from 'util';

// 转换 download-git-repo 为 Promise 格式
const download = promisify(downloadGitRepo);

async function renderTemplate(filePath, data) {
    try {
        // 读取文件内容
        const content = await fs.readFile(filePath, 'utf8');
        // 使用handlebars编译
        const template = Handlebars.compile(content);
        // 渲染模板
        const result = template(data);
        // 将渲染结果写回文件
        await fs.writeFile(filePath, result, 'utf8');
    } catch (err){
        console.error(chalk.red(`渲染失败: ${filePath}`), err);
    }
}

export default class Creator {
    constructor(projectName, options) {
        this.name = projectName;
        this.options = options;
        // 注意：ESM 环境下没有 __dirname，但 process.cwd() 依然有效
        this.targetDir = path.resolve(process.cwd(), projectName);
    }

    async create() {
        // --- 步骤 1: 检查目录冲突 ---
        if (fs.existsSync(this.targetDir)) {
            if (this.options.force) {
                await fs.remove(this.targetDir);
            } else {
                const { action } = await inquirer.prompt([{
                    name: 'action',
                    type: 'list',
                    message: `目录 ${chalk.cyan(this.name)} 已存在，请选择操作：`,
                    choices: [
                        { name: '覆盖', value: 'overwrite' },
                        { name: '取消', value: 'cancel' }
                    ]
                }]);

                if (action === 'cancel' || !action) return;
                if (action === 'overwrite') {
                    await fs.remove(this.targetDir);
                }
            }
        }
        
    console.log('stdin isTTY:', process.stdin.isTTY);
    console.log('stdout isTTY:', process.stdout.isTTY);
        // --- 步骤 2: 收集用户偏好 ---
        const { template } = await inquirer.prompt([{
            name: 'template',
            type: 'list',
            message: '请选择项目模板：',
            choices: [
                { name: 'Vue3 企业级模板', value: 'direct:https://github.com/ygs-code/vue.git' },
                { name: 'React18 后台管理系统', value: 'direct:https://github.com/typescript-cheatsheets/react.git' }
            ]
        }]);

        // --- 步骤 3: 开始下载 ---
        await this.downloadTemplate(template);
    }

    async downloadTemplate(template) {
        const spinner = ora('正在下载模板...').start();

        try {
            // 下载模板
            await download(template, this.targetDir, { clone: true });
            spinner.succeed(chalk.green('模板下载成功！'));
            
            const renderData = {
                name: this.name,
                description: template.description || '一个由 CLI 创建的项目',
                author: template.author || '未知作者'
            }

            // --- 步骤 4: 修改 package.json ---
            const pkgPath = path.join(this.targetDir, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = await fs.readJson(pkgPath);
                pkg.name = this.name;
                await fs.writeJson(pkgPath, pkg, { spaces: 2 });
                await renderTemplate(pkgPath, renderData);
            }

            // 如果有 README.md 也可以顺便渲染了
            const readmePath = path.join(this.targetDir, 'README.md');
            if (fs.existsSync(readmePath)) {
                await renderTemplate(readmePath, renderData);
            }
            // 完成提示
            console.log(`\n项目已成功创建：${chalk.cyan(this.name)}`);
            console.log(`\n  cd ${this.name}`);
            console.log(chalk.yellow('  npm install'));
            console.log(chalk.yellow('  npm run dev\n'));

        } catch (err) {
            spinner.fail(chalk.red('模板下载失败！'));
            console.error(chalk.red(err));
        }
    }
}