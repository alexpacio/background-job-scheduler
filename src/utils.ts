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
    outcome?: string;
    errorReason?: string;
}

function addLine(buf: string, line: string) {
    buf += line + "\n";
}

export function buildPrintConsoleEventMsg(fields: IPrintFields) {
    const delimiter = `----------------------------`;
    let msg = '';
    addLine(msg, delimiter);
    addLine(msg, fields.title);
    addLine(msg, "executionId: " + fields.executionId);
    addLine(msg, "commandToExecute: " + fields.commandToExecute);
    addLine(msg, "scheduleParams: " + fields.scheduleParams);
    if (fields.startDateAndTime) addLine(msg, "startDateAndTime: " + fields.startDateAndTime);
    if (fields.executionTimeInSec)addLine(msg, "executionTimeInSec: " + fields.executionTimeInSec);
    if (fields.outcome) addLine(msg, "outcome: " + fields.outcome);
    if (fields.errorReason) addLine(msg, "errorReason: " + fields.errorReason);
    addLine(msg, delimiter);
    return msg;
}