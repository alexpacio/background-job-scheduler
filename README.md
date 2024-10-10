# background-job-scheduler

A basic Background Jobs Scheduler that you can use to spawn process every time the Vixie Cron you define triggers.
It starts a process that runs forever.
Telemetry is included to gather job execution reports via a Telegram bot and/or via email.

## Getting started

Create a crontab.json file. Start from crontab.json.example.
You can place it in the root folder of this project or pass the path as the env variable called CRONTAB_FILE_ABS_PATH.

- npm i
- npm run compile-win (Windows)
- npm run compile-lin (Linux)

You can run unit test:
- npm run test

Start the app:
- npm run start

## Tunables

As a environment variable, you can pass these settings to configure the runtime:


- CRONTAB_FILE_ABS_PATH -> This is the absolute path of the crontab.json file.
- WWW_DATA_UID -> User ID the process is executed with.
- WWW_DATA_GID -> Group ID the process is executed with.
- PROJECT_BASE_PATH -> Absolute path of the working directory of the spawned processes.


### Nodemailer tunables (email transport)

Make sure to fill every of these env vars to use this service. All the fields are required when in use.

- SCHEDULER_NODEMAILER_HOST
- SCHEDULER_NODEMAILER_PORT
- SCHEDULER_NODEMAILER_SECURE
- SCHEDULER_NODEMAILER_USERNAME
- SCHEDULER_NODEMAILER_PASSWORD

### Telegram API tunables (Telegram bot transport)

Make sure to fill every of these env vars to use this service. All the fields are required when in use.

- SCHEDULER_TELEGRAM_BOT_CHAT_ID
- SCHEDULER_TELEGRAM_BOT_TOKEN

### Transports debug mode

A flag to regulate the verbosity on each transport.

- SCHEDULER_EMAIL_DEBUG_MODE
- SCHEDULER_TELEGRAM_DEBUG_MODE
