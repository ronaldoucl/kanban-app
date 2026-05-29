import { createLogger, format, transports, Logger } from 'winston';

const isProduction = process.env.NODE_ENV === 'production';

export const logger: Logger = createLogger({
  level: isProduction ? 'info' : 'debug',
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple()),
    }),
  ],
});
