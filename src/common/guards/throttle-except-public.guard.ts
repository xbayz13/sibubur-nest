import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ThrottleExceptPublicGuard extends ThrottlerGuard {
  constructor(options: any, storageService: any, reflector: Reflector) {
    super(options, storageService, reflector);
  }

  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic || false;
  }
}

