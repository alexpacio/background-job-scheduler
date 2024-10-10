export function wait(ns: number) {
    return new Promise(res => setTimeout(res, ns));
}

export interface IPrintFields {
    title: string;
    executionId: string;
    commandToExecute: string;
    scheduleParams: string;
    startDateAndTime?: string;
    executionTimeInSec?: string;
    outcome?: string
}

export function buildPrintConsoleEventMsg(fields: IPrintFields) {
    const delimiter = `----------------------------`;
    let msg = '';
    msg += delimiter;
    msg += fields.title;
    msg += "executionId: " + fields.executionId;
    msg += "commandToExecute: " + fields.commandToExecute;
    msg += "scheduleParams: " + fields.scheduleParams;
    if (fields.startDateAndTime)  msg += "startDateAndTime: " + fields.startDateAndTime;
    if (fields.executionTimeInSec)  msg += "executionTimeInSec: " + fields.executionTimeInSec;
    if (fields.outcome) msg += "outcome: " + fields.outcome;
    msg += delimiter;
    return msg;
}