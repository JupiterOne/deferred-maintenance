const JupiterOneClient = require("@jupiterone/jupiterone-client-nodejs");
const { retry } = require("@lifeomic/attempt");
const prompts = require("prompts");
const hash = require("object-hash");

const TYPESTRING = "deferred_maintenance";

class MaintenanceClient {
  constructor () {
    this.attemptOptions = {
      delay: 20000,
      factor: 1.5,
      maxAttempts: 0,
      maxDelay: 70,
    };
  }

  async init() {
    this.j1Client = await new JupiterOneClient({
      account: process.env.J1_ACCOUNT,
      accessToken: process.env.J1_API_TOKEN,
      dev: process.env.J1_DEV_ENABLED
    }).init();
  }

  async applyDeferredMaintenanceToEntities(entities, maintenance) {
    for (const { entity } of entities) {
      console.log(`Creating ${entity._type} -HAS-> ${TYPESTRING} graph elements in J1...`);
      const entityName = entity.displayName || entity.name || entity._type;
      const maintenanceId = hash(maintenance);
      const entityKey = `${TYPESTRING}:${entity._class}:${entityName}:${entity._id}:${maintenanceId}`;
      let res;
      res = await retry(() => {
        return this.j1Client.createEntity(
          entityKey, // _key
          TYPESTRING, // _type
          'Finding', // _class
          {
            owner: 'jupiterone',
            displayName: maintenance.shortDescription,
            maintenanceId,
            status: 'open',
            closed: false,
            ...maintenance
          }
        );
      }, this.attemptOptions);
      const findingId = res.vertex.entity._id;

      res = await retry(() => {
        return this.j1Client.createRelationship(
          `${entity._id}:HAS:${findingId}`, // _key
          `${entity._type}_has_deferred_maintenance`, // _type
          'HAS', // _class
          entity._id, // fromId
          findingId, // toId
          {
            displayName: `${entityName}:HAS:${TYPESTRING}`,
            owner: 'jupiterone'
          }
        );
      }, this.attemptOptions);
    }
  }

  async closeMaintenanceEntities(entities, maintenanceLink) {
    for (const { entity } of entities) {
      if (entity._type != TYPESTRING) {
        console.warn(`Skipping ${entity._type} entity, as it is not a maintenance finding...`);
        continue;
      }
      console.log(`Closing maintenance finding for ${entity.displayName}`);
      let res;
      res = await retry(() => {
        // 'upsert' property fields for existing entity
        return this.j1Client.createEntity(
          entity._key,
          TYPESTRING, // _type
          'Finding', // _class
          {
            status: 'closed',
            closed: true,
            maintenanceLink
          }
        );
      }, this.attemptOptions);
    }
  }

  async gatherEntities(j1ql) {
    return retry(() => {
      return this.j1Client.queryV1(j1ql);
    }, this.attemptOptions);
  }
}

module.exports = MaintenanceClient;