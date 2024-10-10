import { randomUUID } from "crypto";
import TelegramBot from "node-telegram-bot-api";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import { buildPrintConsoleEventMsg } from "./utils";

export interface TelegramAccessTokens {
    token: string;
    chatId: string;
}
export interface JobTelemetryTransportParameters {
    emailProvider?: SMTPTransport | SMTPTransport.Options | string;
    telegramProvider?: TelegramAccessTokens;
}
export class JobTelemetry {
    private telegramBot?: TelegramBot;
    private mailer?: nodemailer.Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;
    private jobMetadata: {
        jobExecutionId: string;
        startDate: Date,
        endDate: Date
    };
    private debugMode: {
        email?: boolean;
        telegram?: boolean;
    }

    constructor(private commandToExecute: string, private scheduleParams: string, private params?: JobTelemetryTransportParameters) {
        if (this.params == null) {
            this.params = {};
        }
        if (this.params?.emailProvider == null && process.env.SCHEDULER_NODEMAILER_USERNAME) {
            this.params.emailProvider = {
                host: process.env.SCHEDULER_NODEMAILER_HOST,
                port: parseInt(process.env.SCHEDULER_NODEMAILER_PORT),
                secure: process.env.SCHEDULER_NODEMAILER_SECURE == "true", // true for port 465, false for other ports
                auth: {
                    user: process.env.SCHEDULER_NODEMAILER_USERNAME,
                    pass: process.env.SCHEDULER_NODEMAILER_PASSWORD,
                },
            };
        }
        if (this.params?.telegramProvider == null && process.env.SCHEDULER_TELEGRAM_BOT_TOKEN) {
            this.params.telegramProvider = {
                chatId: process.env.SCHEDULER_TELEGRAM_BOT_CHAT_ID,
                token: process.env.SCHEDULER_TELEGRAM_BOT_TOKEN
            };
        }
        if (this.params.telegramProvider) this.telegramBot = new TelegramBot(this.params.telegramProvider.token);
        if (this.params.emailProvider) this.mailer = nodemailer.createTransport(this.params.emailProvider);

        this.jobMetadata = {
            jobExecutionId: randomUUID(),
            startDate: new Date(),
            endDate: null
        };

        this.debugMode = {
            email: process.env.SCHEDULER_EMAIL_DEBUG_MODE == "true",
            telegram: process.env.SCHEDULER_TELEGRAM_DEBUG_MODE == "true",
        };
    }

    private sendMessageOnTelegram(msg: string, sendOnlyWhenDebugIsActivated = false): Promise<TelegramBot.Message> {
        if (this.telegramBot == null || (this.debugMode.telegram !== true && sendOnlyWhenDebugIsActivated === true)) {
            return;
        }
        try {
            return this.telegramBot.sendMessage(this.params.telegramProvider.chatId, msg);
        } catch (e) {
            console.error(e);
        }
    }

    private sendMessageOnEmail(msg: string, subject: string, sendOnlyWhenDebugIsActivated = false): Promise<SMTPTransport.SentMessageInfo> {
        if (this.mailer == null || (this.debugMode.email !== true && sendOnlyWhenDebugIsActivated === true)) {
            return;
        }
        try {
            return this.mailer.sendMail({
                from: process.env.SCHEDULER_EMAIL_SENDER_ADDRESS, // sender address
                to: process.env.SCHEDULER_EMAIL_RECEIVERS, // list of receivers
                subject: subject, // Subject line
                text: msg, // plain text body
            });
        } catch (e) {
            console.error(e);
        }
    }


    public async alertScheduleExecutionStarted() {
        const msg = buildPrintConsoleEventMsg({
            commandToExecute: this.commandToExecute,
            executionId: this.jobMetadata.jobExecutionId,
            scheduleParams: this.scheduleParams,
            title: "Starting a new schedule job:",
            startDateAndTime: `${this.jobMetadata.startDate.toDateString()} - ${this.jobMetadata.startDate.toTimeString()}`
        });
        console.log(msg);
        await this.sendMessageOnTelegram(msg);
        await this.sendMessageOnEmail(msg, `Starting job schedule, execution id: ${this.jobMetadata.jobExecutionId}`, true);
    }

    public async alertScheduleStillRunning() {
        const now = new Date();
        const msg = buildPrintConsoleEventMsg({
            commandToExecute: this.commandToExecute,
            executionId: this.jobMetadata.jobExecutionId,
            scheduleParams: this.scheduleParams,
            title: "[SKIP] SCHEDULE WITH SETTINGS IS STILL RUNNING, SKIPPING CURRENT SCHEDULE:",
            startDateAndTime: `${this.jobMetadata.startDate.toDateString()} - ${this.jobMetadata.startDate.toTimeString()}`,
            executionTimeInSec: `${(now.getTime() - this.jobMetadata.startDate.getTime()) / 1000}`
        });
        console.log(msg);
        await this.sendMessageOnTelegram(msg);
        await this.sendMessageOnEmail(msg, `!!! SCHEDULE WITH SETTINGS IS STILL RUNNING, EXEC_ID: ${this.jobMetadata.jobExecutionId}`);
    }

    public async alertScheduleSuccessOutcome(outcome: string) {
        this.jobMetadata.endDate = new Date();
        const msg = buildPrintConsoleEventMsg({
            commandToExecute: this.commandToExecute,
            executionId: this.jobMetadata.jobExecutionId,
            scheduleParams: this.scheduleParams,
            title: "Job ended with sucecss - schedule settings:",
            outcome: outcome,
            executionTimeInSec: `${(this.jobMetadata.endDate.getTime() - this.jobMetadata.startDate.getTime()) / 1000}`
        });
        console.log(msg);
        await this.sendMessageOnTelegram(msg);
        await this.sendMessageOnEmail(msg, `Ended with success, execution id: ${this.jobMetadata.jobExecutionId}`, true);
    }

    public async alertScheduleErrorOutcome(reason: Error) {
        this.jobMetadata.endDate = new Date();
        const msg = buildPrintConsoleEventMsg({
            commandToExecute: this.commandToExecute,
            executionId: this.jobMetadata.jobExecutionId,
            scheduleParams: this.scheduleParams,
            title: "[ERROR] JOB ENDED - SCHEDULE SETTINGS:",
            errorReason: reason.message,
            executionTimeInSec: `${(this.jobMetadata.endDate.getTime() - this.jobMetadata.startDate.getTime()) / 1000}`
        });
        console.log(msg);
        await this.sendMessageOnTelegram(msg);
        await this.sendMessageOnEmail(msg, `!!! ENDED WITH ERROR, EXEC_ID: ${this.jobMetadata.jobExecutionId}`);
    }

    public printLines(output: "scheduler" | "stdout" | "stderr", msg: string) {
        console.log(`[execId: ${this.jobMetadata.jobExecutionId}] [${output}]: ${msg.toString()}`);
    }
}