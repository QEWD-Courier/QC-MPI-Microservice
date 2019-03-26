/*

 ----------------------------------------------------------------------------
 | ripple-fhir-service: Ripple FHIR Interface                               |
 |                                                                          |
 | Copyright (c) 2017-19 Ripple Foundation Community Interest Company       |
 | All rights reserved.                                                     |
 |                                                                          |
 | http://rippleosi.org                                                     |
 | Email: code.custodian@rippleosi.org                                      |
 |                                                                          |
 | Author: Rob Tweed, M/Gateway Developments Ltd                            |
 |                                                                          |
 | Licensed under the Apache License, Version 2.0 (the "License");          |
 | you may not use this file except in compliance with the License.         |
 | You may obtain a copy of the License at                                  |
 |                                                                          |
 |     http://www.apache.org/licenses/LICENSE-2.0                           |
 |                                                                          |
 | Unless required by applicable law or agreed to in writing, software      |
 | distributed under the License is distributed on an "AS IS" BASIS,        |
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. |
 | See the License for the specific language governing permissions and      |
 |  limitations under the License.                                          |
 ----------------------------------------------------------------------------

  14 March 2019

*/

'use strict';

const { BadRequestError } = require('../errors');
const { logger } = require('../core');
const { isPatientIdValid } = require('../shared/validation');
const { Role } = require('../shared/enums');
const debug = require('debug')('ripple-fhir-service:commands:get-demographics');

class GetDemographicsCommand {
  constructor(ctx, session) {
    this.ctx = ctx;
    this.session = session;
  }

  /**
   * @param  {string} patientId
   * @return {Promise.<Object>}
   */
  async execute(patientId) {
    logger.info('commands/getDemographics|execute', { patientId });

    debug('role: %s', this.session.role);

    if (this.session.role === Role.PHR_USER) {
      patientId = this.session.nhsNumber;
    }


    const patientValid = isPatientIdValid(patientId);
    if (!patientValid.ok) {
      throw new BadRequestError(patientValid.error);
    }

    if (process.env.node_env === 'development') {
      patientId = 8888888888; //@TODO IMPORTANT TO REMOVE AFTER GOING TO LIVE !!!!!!!!!!!!!
    }

    const { cacheService } = this.ctx.services;

    try {

      const cachedObj = cacheService.getDemographics(patientId);
      debug('cached response: %j', cachedObj);
      if (cachedObj) {
        return cachedObj;
      }

      const { resourceService, demographicService } = this.ctx.services;
      
      await resourceService.fetchPatients(patientId);
      await resourceService.fetchPatientPractitioner(patientId);

      const responseObj = demographicService.getByPatientId(patientId);
      debug('response: %j', responseObj);

      return responseObj;
    } catch (error) {

      throw(error);
    } finally {

      cacheService.cleanCaches();
    }
  }
}

module.exports = GetDemographicsCommand;
