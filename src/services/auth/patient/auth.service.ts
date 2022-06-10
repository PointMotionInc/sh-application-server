import { Injectable } from '@nestjs/common';
import { LoginRequestDto } from 'src/auth/auth.dto';
import { GqlService } from '../../gql/gql.service';
import { gql } from 'graphql-request';
import { Patient } from 'src/types/patient';

@Injectable()
export class PatientAuthService {
  constructor(private gqlService: GqlService) {}

  async login(credentials: LoginRequestDto): Promise<Patient> {
    const query = gql`
      query GetPatient($email: String) {
        patient(where: { email: { _eq: $email } }) {
          id
          identifier
          provider
          activeCareplan
          email
          careGiverEmail
          phoneCountryCode
          phoneNumber
        }
      }
    `;

    const response = await this.gqlService.client.request(query, {
      email: credentials.email,
    });

    if (!response || !Array.isArray(response.patient) || !response.patient.length) {
      console.log('No matching email found');
      return null;
    }

    // keep password same as email, temporary workaround.
    if (credentials.email !== credentials.password) {
      console.log('Invalid credentials.');
      return null;
    }

    return response.patient[0];
  }

  async verifyOnboardingCode(code: string) {
    const query = `
      query VerifyOnboardingCode($code: uuid = "") {
        patient(where: {onboardingCode: {_eq: $code}}) {
          id
        }
      }`;
    const response = await this.gqlService.client.request(query, { code });
    if (!response || !Array.isArray(response.patient) || !response.patient.length) {
      return false;
    }
    return true;
  }

  async updatePatientByCode(code: string, nickname: string, email: string, password: string) {
    const query = `
      mutation UpdatePatient($code: uuid = "", $email: String = "", $password: String = "", $nickname: String = "") {
        update_patient(where: {onboardingCode: {_eq: $code}}, _set: {email: $email, password: $password, nickname: $nickname}) {
          affected_rows
          returning {
            id
            provider
            activeCareplan
            nickname
          }
        }
      }`;

    const response = await this.gqlService.client.request(query, {
      code,
      nickname,
      email,
      password,
    });

    if (!response || !response.update_patient || !response.update_patient.affected_rows) {
      return false;
    }
    return response.update_patient.returning[0];
  }
}
