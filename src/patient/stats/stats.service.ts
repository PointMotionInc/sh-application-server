import { Injectable } from '@nestjs/common';
import { Dictionary } from 'lodash';
import { groupBy } from 'lodash';
import { DatabaseService } from 'src/database/database.service';
import { GqlService } from 'src/services/gql/gql.service';
import { GoalsApiResponse, MonthlyGoalsApiResponse } from '../../types/stats';

@Injectable()
export class StatsService {
  constructor(private databaseService: DatabaseService, private gqlService: GqlService) {}

  // endDate is exclusive
  async sessionDuration(
    patientId: string,
    startDate: Date,
    endDate: Date,
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
      [patientId, startDate, endDate],
    );

    results.forEach((result) => {
      result.sessionDurationInMs = parseFloat(result.sessionDurationInMs);
      result.sessionDurationInMin = parseFloat((result.sessionDurationInMs / 1000 / 60).toFixed(2));
    });

    return results;
  }

  async getMonthlyGoalsNew(
    patientId: string,
    startDate: Date,
    endDate: Date,
    dbTimezone: string,
  ): Promise<{
    daysCompleted: number;
    groupByCreatedAtDayGames: Dictionary<
      {
        game: string;
        createdAtDay: Date;
        durationInSec: number;
      }[]
    >;
  }> {
    const results: Array<{
      createdAtDay: Date;
      game: string;
      durationInSec: number;
    }> = await this.databaseService.executeQuery(
      `SELECT DISTINCT
        game,
        DATE_TRUNC('day', timezone($4, "createdAt")) "createdAtDay",
        (extract('epoch' from game."endedAt") - extract('epoch' from game."createdAt")) "durationInSec"
      FROM game
      WHERE
        patient = $1 AND
        game."createdAt" >= $2 AND
        game."createdAt" < $3 AND
        DATE_TRUNC('day', timezone($4, "endedAt")) IS NOT NULL
      ORDER BY DATE_TRUNC('day', timezone($4, "createdAt"))`,
      [patientId, startDate, endDate, dbTimezone],
    );

    console.log('results:', results);

    // just a sanity check.
    if (!results) {
      return;
    }

    // grouping by createdAt date.
    const groupByRes = groupBy(results, 'createdAtDay');
    // console.log('groupByRes:', groupByRes);

    const getGamesQuery = `query GetAllGames {
      game_name {
        name
      }
    }`;
    const response = await this.gqlService.client.request(getGamesQuery);
    const gamesAvailable: string[] = response.game_name.map((data) => data.name);

    let daysCompleted = 0;
    for (const [createdAtDay, gamesArr] of Object.entries(groupByRes)) {
      const seenGames = new Set();
      gamesArr.forEach((game) => {
        const isSeen = seenGames.has(game.game);
        if (!isSeen) {
          seenGames.add(game.game);
        }
      });

      // increment counter only if all the avaiable games were played.
      if (seenGames.size === gamesAvailable.length) {
        daysCompleted++;
      }
    }
    return { daysCompleted, groupByCreatedAtDayGames: groupByRes };
  }

  async updateActiveDays(patientId: string, activeDays: number) {
    const updateActiveDaysQuery = `mutation UpdatePatientActiveDays($patientId: uuid!, $activeDays: Int!) {
      update_patient(where: {id: {_eq: $patientId}}, _set: {activeDays: $activeDays}) {
        affected_rows
      }
    }`;
    await this.gqlService.client.request(updateActiveDaysQuery, { patientId, activeDays });
  }

  workOutStreak(days: Array<MonthlyGoalsApiResponse>) {
    let streak = 0;
    let mostRecentDate = new Date(new Date().setHours(0, 0, 0, 0));
    const activeDays = days.filter((day) => day.activityEndedCount >= 3);

    for (let i = 0; i < activeDays.length; i++) {
      const dayCreatedAt = new Date(activeDays[i].createdAtLocaleDate);
      const diff = mostRecentDate.getTime() - dayCreatedAt.getTime();
      if (diff === 0 || diff == 86400000) {
        streak++;
      } else {
        break;
      }
      mostRecentDate = dayCreatedAt;
    }
    return streak;
  }

  getFutureDate(currentDate: Date, numOfDaysInFuture: number) {
    return new Date(currentDate.getTime() + 86400000 * numOfDaysInFuture);
  }

  getPastDate(currentDate: Date, numOfDaysInPast: number) {
    return new Date(currentDate.getTime() - 86400000 * numOfDaysInPast);
  }

  getDaysInMonth(year: number, month: number) {
    return new Date(year, month, 0).getDate();
  }
}
