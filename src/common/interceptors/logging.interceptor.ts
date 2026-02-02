import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs HTTP request/response. In production, logs only when LOG_LEVEL=debug or when sampled (LOG_SAMPLE_RATE).
 * Errors are always logged.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  private shouldLogRequest(): boolean {
    if (process.env.NODE_ENV !== 'production') return true;
    if (process.env.LOG_LEVEL === 'debug') return true;
    const rate = parseFloat(process.env.LOG_SAMPLE_RATE ?? '0.01');
    return rate > 0 && Math.random() < rate;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip } = request;
    const now = Date.now();
    const logThisRequest = this.shouldLogRequest();

    return next.handle().pipe(
      tap({
        next: () => {
          if (!logThisRequest) return;
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - now;
          this.logger.log(
            `${method} ${url} ${statusCode} - ${responseTime}ms - ${ip}`,
          );
        },
        error: (error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `${method} ${url} - ${error.status || 500} - ${responseTime}ms - ${ip}`,
          );
        },
      }),
    );
  }
}

