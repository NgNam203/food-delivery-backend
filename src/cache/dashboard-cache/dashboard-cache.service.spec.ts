import { Test, TestingModule } from '@nestjs/testing';
import { DashboardCacheService } from './dashboard-cache.service';

describe('DashboardCacheService', () => {
  let service: DashboardCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardCacheService],
    }).compile();

    service = module.get<DashboardCacheService>(DashboardCacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
