import { Test, TestingModule } from '@nestjs/testing';
import { RelojControlService } from './reloj-control.service';

describe('RelojControlService', () => {
  let service: RelojControlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RelojControlService],
    }).compile();

    service = module.get<RelojControlService>(RelojControlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
