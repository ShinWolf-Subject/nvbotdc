import winston from 'winston';
import chalk from 'chalk';
import moment from 'moment';

const colors = {
  error: chalk.red.bold,
  warn: chalk.yellow.bold,
  info: chalk.blue.bold,
  debug: chalk.green.bold,
  success: chalk.green.bold,
  command: chalk.magenta.bold,
  event: chalk.cyan.bold
};

class Logger {
  private logger: winston.Logger;
  
  constructor() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp({
          format: 'DD-MM-YYYY•HH.mm.ss'
        }),
        winston.format.printf(({ timestamp, level, message, service }) => {
          return `${chalk.gray(`[${timestamp}]`)} ${this.getColor(level)(`[${level.toUpperCase()}]`)} ${chalk.white(`[${service}]`)} ${message}`;
        })
      ),
      
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error'
        }),
        new winston.transports.File({
          filename: 'logs/combined.log'
        })
      ],
      levels: {
        error: 0,
        warn: 1,
        info: 2,
        success: 2,
        debug: 3,
        command: 4,
        event: 5
      }
    });
  }
  
  private getColor(level: string) {
    return colors[level as keyof typeof colors] || chalk.white;
  }
  
  public log(level: string, message: string, service: string = 'SYSTEM') {
    this.logger.log({ level, message, service });
  }
  
  public info(message: string, service: string = 'SYSTEM') {
    this.log('info', message, service);
  }
  
  public warn(message: string, service: string = 'SYSTEM') {
    this.log('warn', message, service);
  }
  
  public error(message: string, service: string = 'SYSTEM') {
    this.log('error', message, service);
  }
  
  public debug(message: string, service: string = 'SYSTEM') {
    this.log('debug', message, service);
  }
  
  public success(message: string, service: string = 'SYSTEM') {
    this.log('success', message, service);
  }
  
  public command(command: string, user: string, guild: string) {
    const message = `${chalk.yellow(user)} used ${chalk.green(command)} in ${chalk.blue(guild)}`;
    console.log(`${chalk.gray(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]`)} ${chalk.magenta('[COMMAND]')} ${message}`);
  }
  
  public event(event: string, details: string = '') {
    const message = `Event ${chalk.cyan(event)} triggered ${details}`;
    console.log(`${chalk.gray(`[${moment().format('YYYY-MM-DD HH:mm:ss')}]`)} ${chalk.cyan('[EVENT]')} ${message}`);
  }
  
  public colorfulBox(title: string, content: string[]) {
    const width = Math.max(...content.map(line => line.length), title.length) + 4;
    
    console.log(chalk.blue('┌' + '─'.repeat(width) + '┐'));
    console.log(chalk.blue('│') + chalk.yellow.bold(` ${title.padEnd(width - 2)} `) + chalk.blue('│'));
    console.log(chalk.blue('├' + '─'.repeat(width) + '┤'));
    
    content.forEach(line => {
      console.log(chalk.blue('│') + ` ${line.padEnd(width - 2)} ` + chalk.blue('│'));
    });
    
    console.log(chalk.blue('└' + '─'.repeat(width) + '┘'));
  }
}

export const logger = new Logger();
