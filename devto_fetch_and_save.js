import axios from 'axios';
import * as fs from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { exec } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function fetchAndSaveData() {
    const url = process.env.DEVTO_API_URL;
    const filename = process.env.OUTPUT_FILE;
    const gitEmail = 'github-actions[bot]@users.noreply.github.com';
    const gitName = 'GitHub Actions Bot';
    const articles = [];
    let page = 1;
    const perPage = 30;

    try {
        if (!url || !filename) {
            console.error(`Error updating ${filename}: DEVTO_API_URL and DEVTO_API_URL are required!`);
            process.exit(1);
        }
        console.log(`Updating ${filename}...`);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            console.log(`fetching page ${page}`);
            const { data } = await axios.get(url, {
                headers: {
                    'api-key': process.env.DEVTO_TOKEN,
                    'Content-Type': 'application/json',
                },
                params: {
                    page,
                    per_page: perPage,
                },
            });
            if (!data || data.length === 0) {
                break;
            }
            console.log(`page ${page} added new ${data.length}!`);
            articles.push(...data);
            page++;
        }
        console.log(`total number of new data ${articles.length}!`);

        await fs.mkdir(join(__dirname, 'data'), { recursive: true });
        const filePath = join(__dirname, 'data', filename);
        await fs.writeFile(filePath, JSON.stringify(articles, null, 2));

        console.log(`commit changes...`);
        await executeCommand(`git config user.email "${gitEmail}"`);
        await executeCommand(`git config user.name "${gitName}"`);

        await executeCommand('git add .');
        await executeCommand(`git commit -am "chore: update data file ${filename}"`);
        console.log(`done!`);
    } catch (err) {
        console.error(`Error updating ${filename}:`, err.message);
        console.error(err);
        process.exit(1);
    }
}

function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error(`Command "${command}" failed.`);
                console.error(`stderr: ${stderr}`);
                return reject(new Error(stderr.trim()));
            }
            console.log(`Command "${command}" succeeded.`);
            resolve(stdout.trim());
        });
    });
}

fetchAndSaveData();
