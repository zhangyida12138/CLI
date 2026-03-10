import inquirer from 'inquirer';
import downloadGitRepo from 'download-git-repo';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs-extra';
import { promisify } from 'util';

// 转换 download-git-repo 为 Promise 格式
const download = promisify(downloadGitRepo);

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

            // --- 步骤 4: 修改 package.json ---
            const pkgPath = path.join(this.targetDir, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = await fs.readJson(pkgPath);
                pkg.name = this.name;
                await fs.writeJson(pkgPath, pkg, { spaces: 2 });
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