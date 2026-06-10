// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Types
import BuildSearchesTemplates from 'better-trading/services/build-searches/templates';

describe('Unit | Services | Build Searches | Templates', () => {
  setupTest();

  let service: BuildSearchesTemplates;
  let storageMock: sinon.SinonMock;

  beforeEach(function () {
    service = this.owner.lookup('service:build-searches/templates');
    storageMock = sinon.mock(service.storage);
  });

  afterEach(() => {
    storageMock.verify();
    sinon.restore();
  });

  describe('fetchTemplates', () => {
    it('falls back to the default templates when the persisted value is not an array', async () => {
      storageMock
        .expects('getValue')
        .once()
        .withArgs('build-search-gear-slot-templates')
        .returns(Promise.resolve({corrupted: true}));

      const templates = await service.fetchTemplates();

      expect(templates).to.have.length(11);
      expect(templates.map(({slotId}) => slotId)).to.include('weapon');
    });

    it('does not throw when a persisted template contains garbage priorities', async () => {
      storageMock
        .expects('getValue')
        .once()
        .withArgs('build-search-gear-slot-templates')
        .returns(Promise.resolve([{slotId: 'weapon', priorities: 'garbage'}]));

      const templates = await service.fetchTemplates();

      expect(templates).to.have.length(11);
      const weaponTemplate = templates.find(({slotId}) => slotId === 'weapon');
      expect(Array.isArray(weaponTemplate?.priorities)).to.be.true;
      expect(weaponTemplate?.priorities.length).to.be.greaterThan(0);
    });

    it('falls back to the default templates when persisted entries cannot be merged', async () => {
      storageMock
        .expects('getValue')
        .once()
        .withArgs('build-search-gear-slot-templates')
        .returns(Promise.resolve([null, 42]));

      const templates = await service.fetchTemplates();

      expect(templates).to.have.length(11);
      templates.forEach((template) => {
        expect(Array.isArray(template.priorities)).to.be.true;
      });
    });
  });

  describe('defaultSlotStates', () => {
    it('synchronously returns unselected slot states for every default template', () => {
      const slotStates = service.defaultSlotStates();

      expect(slotStates).to.have.length(11);
      slotStates.forEach((slotState) => {
        expect(slotState.selected).to.be.false;
      });
    });
  });
});
