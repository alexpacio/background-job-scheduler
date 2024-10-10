import { JobScheduler } from "./jobHandler";

export async function initScheduler() {
    const scheduler = new JobScheduler();
    scheduler.startEventListenersCrontabFile();
    await scheduler.init();
    return scheduler;
}