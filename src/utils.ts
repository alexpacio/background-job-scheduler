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
    return buf += line + "\n";
}

export function buildPrintConsoleEventMsg(fields: IPrintFields) {
    const delimiter = `----------------------------`;
    let msg = '';
    msg = addLine(msg, delimiter);
    msg = addLine(msg, fields.title);
    msg = addLine(msg, "executionId: " + fields.executionId);
    msg = addLine(msg, "commandToExecute: " + fields.commandToExecute);
    msg = addLine(msg, "scheduleParams: " + fields.scheduleParams);
    if (fields.startDateAndTime) msg = addLine(msg, "startDateAndTime: " + fields.startDateAndTime);
    if (fields.executionTimeInSec) msg = addLine(msg, "executionTimeInSec: " + fields.executionTimeInSec);
    if (fields.outcome) msg = addLine(msg, "outcome: " + fields.outcome);
    if (fields.errorReason) msg = addLine(msg, "errorReason: " + fields.errorReason);
    msg = addLine(msg, delimiter);
    return msg;
}