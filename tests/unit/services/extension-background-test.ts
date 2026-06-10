// Vendor
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

// Types
import ExtensionBackground from 'better-trading/services/extension-background';

const FIRST_URL = 'https://www.pathofexile.com/trade/search/Standard/abcdef/live';
const SECOND_URL = 'https://www.pathofexile.com/trade2/search/Standard/ghijkl/live';

describe('Unit | Services | Extension background', () => {
  setupTest();

  let service: ExtensionBackground;
  let windowOpenStub: sinon.SinonStub;
  let originalChrome: any;

  beforeEach(function () {
    service = this.owner.lookup('service:extension-background');

    originalChrome = (window as any).chrome;
    windowOpenStub = sinon.stub(window, 'open');
  });

  afterEach(() => {
    (window as any).chrome = originalChrome;
    sinon.restore();
  });

  describe('openTabs', () => {
    it('sends an open-tabs message to the extension runtime', () => {
      const sendMessageStub = sinon.stub();
      (window as any).chrome = {runtime: {sendMessage: sendMessageStub}};

      service.openTabs([FIRST_URL, SECOND_URL]);

      expect(sendMessageStub).to.have.been.calledOnce;
      expect(sendMessageStub.firstCall.args[0]).to.deep.equal({
        type: 'open-tabs',
        urls: [FIRST_URL, SECOND_URL],
      });
      expect(windowOpenStub).to.not.have.been.called;
    });

    it('falls back to window.open for each URL when the extension runtime is unavailable', () => {
      (window as any).chrome = {};

      service.openTabs([FIRST_URL, SECOND_URL]);

      expect(windowOpenStub).to.have.been.calledTwice;
      expect(windowOpenStub.firstCall).to.have.been.calledWithExactly(FIRST_URL);
      expect(windowOpenStub.secondCall).to.have.been.calledWithExactly(SECOND_URL);
    });
  });
});
