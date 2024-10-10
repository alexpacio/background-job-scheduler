import { CRONTAB_FILE_ABS_PATH, CrontabEntryStateDefinition } from "../jobHandler";
import { wait } from "../utils";
import { initScheduler } from "../initScheduler";
import { unlink, writeFile } from "fs/promises";

describe('jobs', () => {
    describe('createAJob', () => {
        it('create job in the schedule json and verify if the command in the schedule object is same', async () => {
            await writeFile(CRONTAB_FILE_ABS_PATH, JSON.stringify([
                {
                    "scheduleParams": "* * * * *",
                    "commandToExecute": "echo \"ciao\""
                }
            ] as CrontabEntryStateDefinition[]));
            const scheduler = await initScheduler();
            await unlink(CRONTAB_FILE_ABS_PATH);
            expect(scheduler.getSchedules()[0].commandToExecute).toEqual(`echo \"ciao\"`);
            scheduler.resetScheduleState();
            await scheduler.deinit();
        });
        it('evaluate if the job runs as expected', async () => {
            await writeFile(CRONTAB_FILE_ABS_PATH, JSON.stringify([
                {
                    "scheduleParams": "* * * * *",
                    "commandToExecute": "node -e \"console.log(1+1)\""
                }
            ] as CrontabEntryStateDefinition[]));
            const scheduler = await initScheduler();
            await unlink(CRONTAB_FILE_ABS_PATH);
            await scheduler.getSchedules()[0].cronTask.trigger();
            while (scheduler.getSchedules()[0].cronTask.isBusy() === true) {
                console.log(scheduler.getSchedules()[0].cronTask.isBusy());
                await wait(1000);
            }
            expect(scheduler.getSchedules()[0].lastResultOutput).toEqual(`Child process exited with code 0`);
            scheduler.resetScheduleState();
            await scheduler.deinit();
        });
        it('evaluate if the job runs as expected after a crontab definition file change', async () => {
            await writeFile(CRONTAB_FILE_ABS_PATH, JSON.stringify([
                {
                    "scheduleParams": "* * * * *",
                    "commandToExecute": "node -e \"process.exit(1)\""
                }
            ] as CrontabEntryStateDefinition[]));
            const scheduler = await initScheduler();
            await unlink(CRONTAB_FILE_ABS_PATH);

            expect(scheduler.getSchedules().length).toEqual(1);

            await scheduler.getSchedules()[0].cronTask.trigger();
            while (scheduler.getSchedules()[0].cronTask.isBusy() === true) {
                await wait(1000);
            }

            expect(scheduler.getSchedules()[0].lastResultOutput).toEqual(`Child process exited with code 1`);

            await writeFile(CRONTAB_FILE_ABS_PATH, JSON.stringify([
                {
                    "scheduleParams": "* * * * *",
                    "commandToExecute": "node -e \"console.log(2+2)\""
                },
                {
                    "scheduleParams": "* * * * *",
                    "commandToExecute": "node -e \"console.log(2+2)\""
                },
            ] as CrontabEntryStateDefinition[]));

            await scheduler.handleNewConfigFile();

            expect(scheduler.getSchedules().length).toEqual(2);

            for (const schedule of scheduler.getSchedules()) {
                await schedule.cronTask.trigger();
                while (schedule.cronTask.isBusy() === true) {
                    await wait(1000);
                }
                expect(schedule.lastResultOutput).toEqual(`Child process exited with code 0`);
            }

            scheduler.resetScheduleState();
            await scheduler.deinit();
        });
    });
});