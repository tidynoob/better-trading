// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {beforeEach, describe, it} from 'mocha';

// Types
import BuildSearchesBuildFilePriorityParser from 'better-trading/services/build-searches/build-file-priority-parser';

describe('Unit | Services | Build Searches | Build File Priority Parser', () => {
  setupTest();

  let service: BuildSearchesBuildFilePriorityParser;

  beforeEach(function () {
    service = this.owner.lookup('service:build-searches/build-file-priority-parser');
  });

  it('parses numbered formatted stat priority text into mapped Gear Slot Priorities', () => {
    const priorities = service.parsePriorities(
      '<grey>{Stat Priority\n-------------------\n1. Increased Health\n2. Increased Resistances}'
    );

    expect(priorities.map(({statKey}) => statKey)).to.deep.equal(['maximumLife', 'elementalResistance']);
    expect(priorities.every((priority) => priority.enabled)).to.be.true;
  });

  it('parses line-separated stat priority text', () => {
    const priorities = service.parsePriorities('Maximum Mana\nMovement Speed');

    expect(priorities.map(({statKey}) => statKey)).to.deep.equal(['maximumMana', 'movementSpeed']);
  });

  it('preserves unknown priority text as an Unmapped Stat priority', () => {
    const [priority] = service.parsePriorities('Level of all melee skills');

    expect(priority.statKey).to.match(/^imported-unmapped:/);
    expect(priority.label).to.equal('Level of all melee skills');
    expect(priority.enabled).to.be.true;
  });

  it('returns no priorities for empty text', () => {
    expect(service.parsePriorities('')).to.deep.equal([]);
  });

  it('extracts simple min values for mapped stats', () => {
    const [priority] = service.parsePriorities('1. 50+ Maximum Life');

    expect(priority.statKey).to.equal('maximumLife');
    expect(priority.min).to.equal(50);
  });
});
