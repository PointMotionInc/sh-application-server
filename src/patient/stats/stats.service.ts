import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GoalsApiResponse } from './stats';

@Injectable()
export class StatsService {
  constructor(private databaseService: DatabaseService) { }

  // endDate is exclusive
  async sessionDuration(
    patientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<GoalsApiResponse>> {
    const results = await this.databaseService.executeQuery(
      `SELECT
          session.id,
          session."createdAt",
          ((MAX(events.created_at) - MIN(events.created_at))) AS "sessionDurationInMs"
      FROM session
      INNER JOIN events
      ON events.session = session.id
      WHERE
          session.patient = $1 AND
          session.status <> 'trashed' AND
          session."createdAt" >= $2 AND
          session."createdAt" < $3
      GROUP BY session.id
      ORDER BY session."createdAt" DESC`,
      [patientId, startDate, endDate]
    )
    return results;
  }
}

// MonthlyGoal and DailyGoal APIs.
// Difference will just be in the dates start and end ranges.

/*
SELECT
    session.id,
    session."createdAt",
    CAST(session."createdAt" as date) AS "day",
    ((MAX(events.created_at) - MIN(events.created_at))) AS "sessionDuration"
FROM session session
INNER JOIN events events
ON events.session = session.id
WHERE
    session.patient = 'd816bed2-f89f-49b8-a864-4081f88e36b6' AND
    session.status <> 'trashed' AND
    session."createdAt" >= '2022-04-06T00:00:00.000Z' AND
    session."createdAt" < '2022-06-07T00:00:00.000Z'
GROUP BY session.id
ORDER BY session."createdAt" DESC
*/
