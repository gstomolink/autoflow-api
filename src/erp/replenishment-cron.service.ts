import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SuggestionsService } from './suggestions.service';
import { ShopsService } from './shops.service';

@Injectable()
export class ReplenishmentCronService {
  private readonly logger = new Logger(ReplenishmentCronService.name);

  constructor(
    private readonly shopsService: ShopsService,
    private readonly suggestionsService: SuggestionsService,
  ) {}

  @Cron('0 12 * * *')
  async noonReplenishment(): Promise<void> {
    const shopIds = await this.shopsService.allShopIds();
    for (const shopId of shopIds) {
      try {
        await this.suggestionsService.runReplenishment(shopId);
      } catch (e) {
        this.logger.warn(
          `replenishment failed for ${shopId}: ${e instanceof Error ? e.message : e}`,
        );
      }
    }
    this.logger.log(`replenishment scan finished (${shopIds.length} shops)`);
  }
}
