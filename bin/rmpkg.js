#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");
const picocolors = require("picocolors");
const tar = require("tar");

const BASE_URL = "https://cdn.rage.mp/updater/prerelease_server/server-files";

const FILES_WIN32 = [
    "ragemp-server.exe",
    "BugTrap-x64.dll",
    "bin/bt.dat",
    "bin/enc.dat",
    "bin/loader.mjs"
];

const FILES_LINUX = [
    "linux_x64.tar.gz"
];

const UNPACK_FOLDER_LINUX = "ragemp-srv";

async function main() {
    console.log(`${picocolors.greenBright("==== rmpkg =====")}`);
    console.log(`System: ${picocolors.yellowBright(process.platform)}`);

    console.log(`${picocolors.greenBright("===== Download ======")}`);

    const ignoredFiles = [];

    for (let i = 0; i < process.argv.length; i++) {
        const arg = process.argv[i];

        if (arg == "--ignore") {
            const value = process.argv[i + 1];

            if (!value) {
                console.error(`${picocolors.red("Failed to parse ignored file (undefined)")}`);
                return;
            }

            ignoredFiles.push(value);
        }
    }

    switch (process.platform) {
        case "win32":
            await win32Download(ignoredFiles);
            break;
        case "linux":
            await linuxDownload(ignoredFiles);
            break;
        default:
            console.error(`${picocolors.red("RAGE:MP server is not supported on your system")}`);
            return;
    }

    console.log(`${picocolors.greenBright("===== Complete ======")}`);
}

/**
 * Downloads windows server files
 * @param {Array<string>} ignoredFiles Files that won't be downloaded
 */
async function win32Download(ignoredFiles) {
    await downloadFiles(FILES_WIN32, ignoredFiles);
}

/**
 * Downloads and unpacks linux server files
 * @param {Array<string>} ignoredFiles Files that won't be downloaded
 */
async function linuxDownload(ignoredFiles) {
    await downloadFiles(FILES_LINUX, []);

    console.log(`${picocolors.greenBright("===== Unpacking ======")}`);

    try {
        await tar.x({
            file: FILES_LINUX[0]
        });

        const folderPath = `./${UNPACK_FOLDER_LINUX}`;
        const files = getAllFiles(folderPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            const srcPath = path.join(folderPath, file);
            const targetPath = path.join("./", file);

            let ignore = false;

            for (let j = 0; j < files.length; j++) {
                const ignoredFileName = ignoredFiles[j];

                if (file.endsWith(ignoredFileName)) {
                    ignore = true;
                    break;
                }
            }

            if (ignore) {
                console.log(`${file} ${picocolors.red("[IGNORED]")}`);
                continue;
            }
            else {
                console.log(file);
            }
            
            fs.cpSync(srcPath, targetPath, { recursive: true, force: true });
        }

        fs.rmSync(`./${UNPACK_FOLDER_LINUX}`, { recursive: true, force: true });
        fs.rmSync(FILES_LINUX[0], { recursive: true, force: true });
    }
    catch (err) {
        console.error(`${picocolors.redBright("Failed to unpack:")} ${picocolors.reset(FILES_LINUX[0])}`);
    }
}

function getAllFiles(dirPath) {
    const result = [];

    function walk(currentPath) {
        const entries = fs.readdirSync(currentPath);

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                walk(fullPath);
            } else {
                result.push(path.relative(dirPath, fullPath));
            }
        }
    }

    walk(dirPath);

    return result;
}

/**
 * Downloads all files from the given array from the HTTPS server specified in the BASE_URL constant
 * @param {Array<string>} files
 * @param {Array<string>} ignoredFiles Files that won't be downloaded
 */
async function downloadFiles(files, ignoredFiles) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        let ignore = false;

        for (let j = 0; j < files.length; j++) {
            const ignoredFileName = ignoredFiles[j];

            if (file.endsWith(ignoredFileName)) {
                ignore = true;
                break;
            }
        }

        if (ignore) {
            console.log(`${file} ${picocolors.red("[IGNORED]")}`);
            continue;
        }
        else {
            console.log(file);
        }

        try {
            await downloadFile(`${BASE_URL}/${file}`, `./${file}`);
        }
        catch (err) {
            console.error(err);
        }
    }
}

/**
 * Downloads a file from an HTTPS server to the target path
 * @param {string} url 
 * @param {string} targetPath 
 * @returns 
 */
async function downloadFile(url, targetPath){
    return new Promise((resolve, reject) => {
        const dirName = path.dirname(targetPath);

        if (!fs.existsSync(dirName))
            fs.mkdirSync(dirName, { recursive: true });

        const stream = fs.createWriteStream(targetPath);

        https.get(url, (res) => {
            if (res.statusCode !== 200)
                throw new Error(`${picocolors.redBright("Failed to download file:")} ${url} ${res.statusCode}`);

            res.pipe(stream);

            stream.on("finish", () => {
                stream.close();
                resolve();
            });

        }).on("error", (err) => {
            fs.unlink(targetPath, () => reject(err));
        });
    });
}

main();
