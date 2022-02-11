// import { spawn } from './spawn'
import { EnvCmdOptions } from './types'
import { TermSignals } from './signal-termination'
import { parseArgs } from './parse-args'
import { getEnvVars } from './get-env-vars'
import { expandEnvs } from './expand-envs'
import { mkdirSync, writeFileSync } from 'fs'
import { spawn } from 'child_process'

/**
 * Executes env - cmd using command line arguments
 * @export
 * @param {string[]} args Command line argument to pass in ['-f', './.env']
 * @returns {Promise<{ [key: string]: any }>}
 */
export async function CLI (args: string[]): Promise<{ [key: string]: any }> {
  // Parse the args from the command line
  const parsedArgs = parseArgs(args)

  // Run EnvCmd
  try {
    return await exports.EnvCmd(parsedArgs)
  } catch (e) {
    console.error(e)
    return process.exit(1)
  }
}

/**
 * The main env-cmd program. This will spawn a new process and run the given command using
 * various environment file solutions.
 *
 * @export
 * @param {EnvCmdOptions} { command, commandArgs, envFile, rc, options }
 * @returns {Promise<{ [key: string]: any }>} Returns an object containing [environment variable name]: value
 */
export async function EnvCmd (
  {
    command,
    commandArgs,
    envFile,
    rc,
    options = {}
  }: EnvCmdOptions
): Promise<{ [key: string]: any }> {
  let env: { [name: string]: string } = {}
  try {
    env = await getEnvVars({ envFile, rc, verbose: options.verbose })
  } catch (e) {
    if (!(options.silent ?? false)) {
      throw e
    }
  }


  
  // CHANGED: 
  // Create folder @rn-env in node_modules, then creating new index.js with formation content: module.export = {<Content>}
  const createFolder = async (directoryPath: string) => {
    try{
        await mkdirSync(directoryPath);
    } catch (err){
        // console.log('err: ', err);
    }
  }

  // Create directory "./<Current Working Directory>/node_modules/@rn-env"
  // CAUTION: https://stackoverflow.com/questions/10265798/determine-project-root-from-a-running-node-js-application
  let currentWorkingDirectory = process.cwd()
  let envDir = [currentWorkingDirectory,  'node_modules'].join('/');
  await createFolder(envDir);
  envDir = [envDir, '@rn-env'].join('/');
  await createFolder(envDir);
  // Create and write env file "./<Current Working Directory>/node_modules/@rn-env/index.js"
  await writeFileSync(`${envDir}/index.js`, `module.exports=${JSON.stringify(env)}`);
  // Execute the command with the given environment variables
  const proc = spawn(command, commandArgs)
  proc.stdout.on('data', (data) => {
    console.log(`${data}`);
  });
  proc.stderr.on('data', (data) => {
      console.error(`${data}`);
  });

  proc.on('close', (code) => {
      console.log(`########## Child process exited with code ${code}`);
  });
  // END CHANGED



  // Handle any termination signals for parent and child proceses
  const signals = new TermSignals({ verbose: options.verbose })
  signals.handleUncaughtExceptions()
  signals.handleTermSignals(proc)

  return env
}
