#!/usr/bin/env node

import { program } from 'commander';
import Creator from '../lib/creator.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM 环境下获取 __dirname 的标准做法
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 假设 package.json 在 bin 的上一层目录
const pkg = fs.readJsonSync(path.resolve(__dirname, '../package.json'));

program
    .version(`v${pkg.version}`)
    .description('一个前端脚手架工具，用于快速创建项目模板');


program
    .command('create <projectName>')
    .description('克隆一个Github项目模板到本地')
    .option('-f, --force', '如果目录已经存在，强制覆盖')
    .action((projectName, options) => {
        // 具体执行逻辑
        const creator = new Creator(projectName, options);
        creator.create();
    });

program.parse(process.argv);