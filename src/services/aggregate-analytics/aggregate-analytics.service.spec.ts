import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GqlService } from '../gql/gql.service';
import { AggregateAnalyticsService } from './aggregate-analytics.service';
import { AnalyticsDTO, Sit2StandAnalyticsDTO } from 'src/types/analytics';

describe('AggregateAnalyticsService', () => {
  let service: AggregateAnalyticsService;
  const testData: AnalyticsDTO[] = [
    {
      prompt: {
        type: 'x',
        timestamp: 123,
        data: {
          number: 1,
        },
      },
      result: {
        type: 'success',
        timestamp: 1,
        score: 1,
      },
      reaction: {
        type: 'x',
        timestamp: 1,
        startTime: new Date().getTime(),
        completionTime: 10,
      },
    },
    {
      prompt: {
        type: 'x',
        timestamp: 123,
        data: {
          number: 1,
        },
      },
      result: {
        type: 'failure',
        timestamp: 1,
        score: 0,
      },
      reaction: {
        type: 'x',
        timestamp: 1,
        startTime: new Date().getTime(),
        completionTime: 20,
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AggregateAnalyticsService, GqlService, ConfigService],
    }).compile();

    service = module.get<AggregateAnalyticsService>(AggregateAnalyticsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate avg achievement ratio', () => {
    expect(service.averageAchievementRatio(testData)).toEqual({
      key: 'avgAchievementRatio',
      value: 0.5,
      noOfSamples: 2,
    });
  });

  it('should calculate avg completion ratio', () => {
    expect(service.averageCompletionRatio(testData)).toEqual({
      key: 'avgCompletionTime',
      value: 15,
      noOfSamples: 2,
    });
  });
});
