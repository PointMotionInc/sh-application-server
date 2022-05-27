import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { Patient } from 'src/types/patient';

@Injectable()
export class PatientJwtService {
  constructor(private configService: ConfigService) {}

  generate(patient: Patient) {
    const key = JSON.parse(this.configService.get('JWT_SECRET'));
    const payload = {
      id: patient.id, // redundancy to make the reading easier
      provider: patient.provider, // redundancy to make the reading easier
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['patient', 'therapist', 'admin'],
        'x-hasura-default-role': 'patient',
        'x-hasura-user-id': patient.id,
        'x-hasura-provider-id': patient.provider,
      },
    };
    return jwt.sign(payload, key.key);
  }
}
