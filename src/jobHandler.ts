import { readFile } from 'fs/promises';
import chokidar, { FSWatcher } from 'chokidar';
import { Mutex } from 'async-mutex';
import { JobTelemetry } from './jobTelemetry';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { splitToObject as argSplit } from 'split-cmd';
import { Cron } from "croner";

export interface ScheduleMainState {
    mutex: Mutex;
    crontab: CrontabEntryState[];
}

type CrontabEntryState = CrontabEntryStateDefinition & { cronTask: Cron, spawnObject: ChildProcessWithoutNullStreams, lastResultOutput: string };

export interface CrontabEntryStateDefinition {
    scheduleParams: string;
    commandToExecute: string;
    isRunning: boolean;
}

export const CRONTAB_FILE_ABS_PATH = process.env.CRONTAB_FILE_ABS_PATH ?? "crontab.json";

export class JobScheduler {
    private schedules: ScheduleMainState;
    private fileWatcher: FSWatcher;
    private sighupListener: NodeJS.Process;
    constructor(schedules?: ScheduleMainState) {
        this.schedules = schedules != null ? schedules : {
            mutex: new Mutex(),
            crontab: []
        };
    }

    public getSchedules() {
        return this.schedules.crontab;
    }

    public async init() {
        await this.handleNewConfigFile();
    }

    private async handleNewConfigFile() {
        this.stopAllJobs(false);
        await this.schedules.mutex.runExclusive(async () => {
            this.schedules.crontab = (await this.loadSettingsFromFile()).map(elm => Object.assign(elm, { cronTask: null, spawnObject: null, lastResultOutput: null }));
            for (const scheduleSetting of this.schedules.crontab) {
                scheduleSetting.cronTask = Cron(scheduleSetting.scheduleParams, { protect: true, unref: true }, async () => {
                    const jobTelemetry = new JobTelemetry(scheduleSetting.commandToExecute, scheduleSetting.scheduleParams);
                    if (scheduleSetting.isRunning === true) {
                        await jobTelemetry.alertScheduleStillRunning();
                        return;
                    }
                    await jobTelemetry.alertScheduleExecutionStarted();
                    const listOfArgs = argSplit(scheduleSetting.commandToExecute);
                    try {
                        const spawnResult = await new Promise<string>((res, rej) => {
                            scheduleSetting.spawnObject = spawn(listOfArgs.command, listOfArgs.args, {
                                uid: process.env.WWW_DATA_UID ? parseInt(process.env.WWW_DATA_UID) : undefined,
                                gid: process.env.WWW_DATA_GID ? parseInt(process.env.WWW_DATA_GID) : undefined,
                                cwd: process.env.PROJECT_BASE_PATH
                            });
                            scheduleSetting.spawnObject.stdout.on('data', (data) => {
                                jobTelemetry.printLines("stdout", data);
                            });
                            scheduleSetting.spawnObject.stderr.on('data', (err) => {
                                jobTelemetry.printLines("stderr", err);
                            });

                            scheduleSetting.spawnObject.once('error', (error) => {
                                scheduleSetting.spawnObject?.removeAllListeners();
                                rej(new Error(`Process returned an error: ${error.message}`));
                            });

                            scheduleSetting.spawnObject.once('close', (code, signal) => {
                                scheduleSetting.spawnObject?.removeAllListeners();
                                jobTelemetry.printLines("scheduler", `PROCESS SIGNALING: status: ${code}, signal: ${signal}`);
                                res(`Child process exited with code ${code}`);
                            });
                        });
                        scheduleSetting.lastResultOutput = spawnResult;
                        await jobTelemetry.alertScheduleSuccessOutcome(spawnResult);
                    } catch (err) {
                        scheduleSetting.lastResultOutput = err.message;
                        await jobTelemetry.alertScheduleErrorOutcome(err);
                    }
                });
            };
        });
    }

    startEventListenersCrontabFile() {
        this.fileWatcher = chokidar.watch(CRONTAB_FILE_ABS_PATH, { usePolling: true, interval: 60000, ignoreInitial: true }).on('all', () => {
            console.log("Starting the fileWatcher");
            this.handleNewConfigFile();
        });
        this.sighupListener = process.on("SIGHUP", async () => {
            console.log("Starting the SIGHUP listener");
            this.handleNewConfigFile();
        });
    }

    async loadSettingsFromFile(): Promise<CrontabEntryStateDefinition[]> {
        try {
            const fileContent = JSON.parse((await readFile(CRONTAB_FILE_ABS_PATH)).toString());
            const now = new Date();
            console.log("Opened a new crontab file at " + now.toDateString() + " - " + now.toTimeString());
            return fileContent;
        } catch (err) {
            console.log("Scheduler can't open the crontab file. Starting the scheduler with an empty schedule");
            return [];
        }
    }

    stopAllJobs(killSpawnedProcess: boolean) {
        for (const sch of this.schedules.crontab) {
            if (killSpawnedProcess === true && sch.spawnObject != null) {
                sch.spawnObject.kill();
                sch.spawnObject.removeAllListeners();
            }
            if (sch.cronTask != null) {
                sch.cronTask.stop();
            }
        }
    }

    resetScheduleState() {
        this.stopAllJobs(true);
        this.schedules.mutex.cancel();
        this.schedules = {
            mutex: new Mutex(),
            crontab: []
        };
    }

    async deinit() {
        console.log("Scheduler deinited");
        await this.fileWatcher.close();
        this.fileWatcher.removeAllListeners();
        this.sighupListener.removeAllListeners();
    }
};