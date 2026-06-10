/* eslint-disable camelcase */

// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {beforeEach, describe, it} from 'mocha';

// Types
import BuildSearchesBuildFileImporter from 'better-trading/services/build-searches/build-file-importer';

describe('Unit | Services | Build Searches | Build File Importer', () => {
  setupTest();

  let service: BuildSearchesBuildFileImporter;

  beforeEach(function () {
    service = this.owner.lookup('service:build-searches/build-file-importer');
  });

  it('normalizes pasted .build JSON into a Build Search draft', () => {
    const draft = service.importText(
      JSON.stringify({
        name: 'Titan Warrior',
        ascendancy: 'Warrior1',
        inventory_slots: [
          {
            inventory_id: 'Weapon1',
            slot_x: 1,
            slot_y: 0,
            level_interval: [0, 100],
            unique_name: "Kalandra's Touch",
            additional_text: '<silver>{Any Two Handed Mace}',
          },
        ],
      })
    );

    expect(draft).to.deep.equal({
      buildName: 'Titan Warrior',
      ascendancy: 'Warrior1',
      inventorySlots: [
        {
          inventoryId: 'Weapon1',
          slotX: 1,
          slotY: 0,
          levelInterval: [0, 100],
          uniqueName: "Kalandra's Touch",
          additionalText: '<silver>{Any Two Handed Mace}',
        },
      ],
    });
  });

  it('accepts missing optional build metadata', () => {
    const draft = service.importText(
      JSON.stringify({
        name: 'Bare build',
      })
    );

    expect(draft).to.deep.equal({
      buildName: 'Bare build',
      ascendancy: '',
      inventorySlots: [],
    });
  });

  it('rejects malformed pasted .build JSON', () => {
    expect(() => service.importText('{"name":')).to.throw('The .build JSON could not be parsed.');
  });

  it('rejects unsupported pasted build links', () => {
    expect(() => service.importText('https://pobb.in/example')).to.throw(
      'Build links are not supported yet. Paste .build JSON or choose a .build file.'
    );
  });

  it('imports local .build files', async () => {
    const draft = await service.importFile({
      name: 'warrior.build',
      // eslint-disable-next-line @typescript-eslint/promise-function-async
      text: () => Promise.resolve(JSON.stringify({name: 'File build', inventory_slots: []})),
    });

    expect(draft.buildName).to.equal('File build');
  });

  it('rejects non-.build files', async () => {
    try {
      await service.importFile({
        name: 'warrior.txt',
        // eslint-disable-next-line @typescript-eslint/promise-function-async
        text: () => Promise.resolve(JSON.stringify({name: 'Wrong extension'})),
      });

      expect.fail('Expected non-.build file import to throw.');
    } catch (error) {
      expect((error as Error).message).to.equal('Choose a .build file.');
    }
  });
});
