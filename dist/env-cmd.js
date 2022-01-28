"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvCmd = exports.CLI = void 0;
const signal_termination_1 = require("./signal-termination");
const parse_args_1 = require("./parse-args");
const get_env_vars_1 = require("./get-env-vars");
const fs_1 = require("fs");
const child_process_1 = require("child_process");
/**
 * Executes env - cmd using command line arguments
 * @export
 * @param {string[]} args Command line argument to pass in ['-f', './.env']
 * @returns {Promise<{ [key: string]: any }>}
 */
async function CLI(args) {
    // Parse the args from the command line
    const parsedArgs = parse_args_1.parseArgs(args);
    // Run EnvCmd
    try {
        return await exports.EnvCmd(parsedArgs);
    }
    catch (e) {
        console.error(e);
        return process.exit(1);
    }
}
exports.CLI = CLI;
/**
 * The main env-cmd program. This will spawn a new process and run the given command using
 * various environment file solutions.
 *
 * @export
 * @param {EnvCmdOptions} { command, commandArgs, envFile, rc, options }
 * @returns {Promise<{ [key: string]: any }>} Returns an object containing [environment variable name]: value
 */
async function EnvCmd({ command, commandArgs, envFile, rc, options = {} }) {
    var _a;
    let env = {};
    try {
        env = await get_env_vars_1.getEnvVars({ envFile, rc, verbose: options.verbose });
    }
    catch (e) {
        if (!((_a = options.silent) !== null && _a !== void 0 ? _a : false)) {
            throw e;
        }
    }
    // CHANGED: 
    // Create folder @rn-env in node_modules, then creating new index.js with formation content: module.export = {<Content>}
    const createFolder = async (directoryPath) => {
        try {
            await fs_1.mkdirSync(directoryPath);
        }
        catch (err) {
            // console.log('err: ', err);
        }
    };
    // CAUTION: https://stackoverflow.com/questions/10265798/determine-project-root-from-a-running-node-js-application
    let currentWorkingDirectory = process.cwd();
    let envDir = [currentWorkingDirectory, 'node_modules'].join('/');
    await createFolder(envDir);
    envDir = [envDir, '@rn-env'].join('/');
    await createFolder(envDir);
    await fs_1.writeFileSync(`${envDir}/index.js`, `module.exports=${JSON.stringify(env)}`);
    // END CHANGED
    // Execute the command with the given environment variables
    const proc = child_process_1.spawn(command, commandArgs);
    // Handle any termination signals for parent and child proceses
    const signals = new signal_termination_1.TermSignals({ verbose: options.verbose });
    signals.handleUncaughtExceptions();
    signals.handleTermSignals(proc);
    return env;
}
exports.EnvCmd = EnvCmd;
