import {
  red,
  yellow,
  black,
  bgYellow,
  bgRed,
  bgGreen,
  green,
  bgBlack,
  gray,
  bgCyan,
  cyan,
  white,
  bgWhite,
} from 'colors/safe';
import { LogLevel, LogType } from '../config/types';
import { env } from '../config/env';
import moment from 'moment';

const time_format = 'YYYY-MM-DD HH:mm:ss Z';

export function writeLog(
  type: LogType,
  message: string,
  fileSource = '',
  functionSource = '',
  error?: Error,
): void {
  const levelFilter = {
    [LogLevel.DB_ONLY]: () => {
      return [LogType.DB, LogType.WARN, LogType.ERROR].includes(type);
    },
    [LogLevel.NO_DB]: () => {
      return type !== LogType.DB;
    },
    [LogLevel.ERROR_ONLY]: () => {
      return type === LogType.ERROR;
    },
    [LogLevel.WARN]: () => {
      return [LogType.WARN, LogType.ERROR].includes(type);
    },
    [LogLevel.DEBUG]: () => {
      return true;
    },
  };

  try {
    if (!levelFilter[env.LOG_LEVEL]()) {
      return;
    }
  } catch (err) {
    // invalid log filter
  }

  if (env.LOG_TARGET == 'color') {
    logInColor(type, message, fileSource, functionSource, error);
  } else if (env.LOG_TARGET == 'console') {
    logInConsole(type, message, fileSource, functionSource, error);
  } else if (type === LogType.ERROR) {
    // always log error types
    logInConsole(type, message, fileSource, functionSource, error);
  }
}

function logInColor(
  type: LogType,
  message: string,
  fileSource = '',
  functionSource = '',
  error?: Error,
) {
  let bgColor = bgBlack;
  let color = black;
  switch (type) {
    case LogType.DB:
      bgColor = bgGreen;
      color = green;
      break;
    case LogType.MSG:
      bgColor = bgWhite;
      color = black;
      break;
    case LogType.INFO:
      bgColor = bgCyan;
      color = cyan;
      break;
    case LogType.WARN:
      bgColor = bgYellow;
      color = yellow;
      break;
    case LogType.ERROR:
      bgColor = bgRed;
      color = red;
      break;
    default:
      bgColor = bgBlack;
      color = white;
  }
  // console.log(
  //   bgColor(black(`[${type}]`)),
  //   gray(`[${moment().format(time_format)}]:`),
  //   color(
  //     `${
  //       typeof message == 'string' ? message : JSON.stringify(message, null, 2)
  //     }${message && error && error.message ? ', ' : ''}${
  //       error ? `${error.message}` || '' : ''
  //     }`,
  //   ),
  //   gray(`[${fileSource}/${functionSource}]`),
  // );
}

function logInConsole(
  type: LogType,
  message: string,
  fileSource = '',
  functionSource = '',
  error?: Error,
) {
  message = `${
    typeof message == 'string' ? message : JSON.stringify(message, null, 2)
  }${message && error && error.message ? ', ' : ''}${
    error ? `${error.message}` || '' : ''
  }`;

  if (type === LogType.ERROR) {
    console.error(
      `[${type}][${moment().format(
        time_format,
      )}]:\n${message}\n[${fileSource}/${functionSource}]`,
    );
  } else if (type === LogType.MSG) {
    console.warn(
      `[${type}][${moment().format(
        time_format,
      )}]:\n${message}\n[${fileSource}/${functionSource}]`,
    );
  } else {
    console.log(
      `[${type}][${moment().format(
        time_format,
      )}]:\n${message}\n[${fileSource}/${functionSource}]`,
    );
  }
}
