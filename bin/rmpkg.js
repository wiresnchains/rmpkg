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

    switch (process.platform) {
        case "win32":
            await win32Download();
            break;
        case "linux":
            await linuxDownload();
            break;
        default:
            console.error(`${picocolors.red("RAGE:MP server is not supported on your system")}`);
            return;
    }

    console.log(`${picocolors.greenBright("===== Complete ======")}`);
}

/**
 * Downloads windows server files
 */
async function win32Download() {
    await downloadFiles(FILES_WIN32);
}

/**
 * Downloads and unpacks linux server files
 */
async function linuxDownload() {
    await downloadFiles(FILES_LINUX);

    console.log(`${picocolors.greenBright("===== Unpacking ======")}`);

    try {
        await tar.x({
            file: FILES_LINUX[0]
        });

        const folderPath = `./${UNPACK_FOLDER_LINUX}`;
        const files = fs.readdirSync(folderPath);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(file);

            const srcPath = path.join(folderPath, file);
            const targetPath = path.join("./", file);
            fs.renameSync(srcPath, targetPath);
        }

        fs.rmSync(`./${UNPACK_FOLDER_LINUX}`, { recursive: true, force: true });
        fs.rmSync(FILES_LINUX[0], { recursive: true, force: true });
    }
    catch (err) {
        console.error(`${picocolors.redBright("Failed to unpack:")} ${picocolors.reset(FILES_LINUX[0])}`);
    }
}

/**
 * Downloads all files from the given array from the HTTPS server specified in the BASE_URL constant
 * @param {Array<string>} files 
 */
async function downloadFiles(files) {
    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        console.log(file);
        
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
