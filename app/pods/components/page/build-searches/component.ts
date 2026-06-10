// Vendor
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import Component from '@glimmer/component';
import {tracked} from '@glimmer/tracking';
import {dropTask, restartableTask} from 'ember-concurrency-decorators';

// Services
import BuildSearchesBuildFileImporter from 'better-trading/services/build-searches/build-file-importer';
import BuildSearchesBuildFileSlotMapper from 'better-trading/services/build-searches/build-file-slot-mapper';
import BuildSearchesService from 'better-trading/services/build-searches';
import BuildSearchesQueryGenerator from 'better-trading/services/build-searches/query-generator';
import BuildSearchesTemplates from 'better-trading/services/build-searches/templates';
import FlashMessages from 'ember-cli-flash/services/flash-messages';
import IntlService from 'ember-intl/services/intl';
import TradeLocation from 'better-trading/services/trade-location';

// Types
import {
  BuildSearchGearSlotTemplate,
  BuildSearchGroupType,
  BuildSearchImportDraft,
  BuildSearchPreviewSlot,
  BuildSearchPriority,
  BuildSearchSaveResult,
  BuildSearchSlotState,
} from 'better-trading/types/build-searches';
import {Task} from 'better-trading/types/ember-concurrency';

interface InputEvent {
  target: HTMLInputElement;
}

interface SelectEvent {
  target: HTMLSelectElement;
}

type SlotNumberField = 'groupMin' | 'groupMax' | 'countMin';
type PriorityNumberField = 'weight' | 'min' | 'max';

// Constants
const DEFAULT_BUILD_NAME = 'Manual build';
const DEFAULT_POE2_LEAGUE = 'poe2/Standard';

export default class PageBuildSearches extends Component {
  @service('build-searches/build-file-importer')
  buildFileImporter: BuildSearchesBuildFileImporter;

  @service('build-searches/build-file-slot-mapper')
  buildFileSlotMapper: BuildSearchesBuildFileSlotMapper;

  @service('build-searches')
  buildSearches: BuildSearchesService;

  @service('build-searches/query-generator')
  queryGenerator: BuildSearchesQueryGenerator;

  @service('build-searches/templates')
  gearSlotTemplates: BuildSearchesTemplates;

  @service('flash-messages')
  flashMessages: FlashMessages;

  @service('intl')
  intl: IntlService;

  @service('trade-location')
  tradeLocation: TradeLocation;

  @tracked
  buildName: string = DEFAULT_BUILD_NAME;

  @tracked
  characterClass: string = '';

  @tracked
  ascendancy: string = '';

  @tracked
  league: string = DEFAULT_POE2_LEAGUE;

  @tracked
  importJson: string = '';

  @tracked
  importDraft: BuildSearchImportDraft | null = null;

  @tracked
  importError: string = '';

  @tracked
  importWarnings: string[] = [];

  @tracked
  templates: BuildSearchGearSlotTemplate[] = [];

  @tracked
  stagedTemplates: BuildSearchGearSlotTemplate[] = [];

  @tracked
  slotStates: BuildSearchSlotState[] = [];

  @tracked
  previewSlots: BuildSearchPreviewSlot[] | null = null;

  @tracked
  saveResult: BuildSearchSaveResult | null = null;

  @tracked
  isEditingTemplates: boolean = false;

  get folderTitle() {
    return this.buildSearches.folderTitle(this.buildName);
  }

  get selectedSlots() {
    return this.slotStates.filter((slot) => slot.selected);
  }

  get hasSelectedSlots() {
    return this.selectedSlots.length > 0;
  }

  get canPreview() {
    return this.hasSelectedSlots;
  }

  get previewCanBeSaved() {
    if (!this.previewSlots) return false;
    if ((this.regeneratePreviewTask as Task).isRunning) return false;

    return this.previewSlots.some((previewSlot) => Boolean(previewSlot.query));
  }

  get defaultLeague() {
    if (this.tradeLocation.version === '2' && this.tradeLocation.league) return this.tradeLocation.league;

    return DEFAULT_POE2_LEAGUE;
  }

  get canImportPastedBuild() {
    return this.importJson.trim().length > 0;
  }

  get importDraftTitle() {
    if (!this.importDraft) return '';

    return this.importDraft.buildName || DEFAULT_BUILD_NAME;
  }

  get importedInventorySlotCount() {
    if (!this.importDraft) return 0;

    return this.importDraft.inventorySlots.length;
  }

  @dropTask
  *loadTemplatesTask() {
    this.league = this.defaultLeague;
    this.templates = yield this.gearSlotTemplates.fetchTemplates();
    this.slotStates = this.gearSlotTemplates.createSlotStates(this.templates);
  }

  @dropTask
  *previewTask() {
    if (!this.canPreview) return;

    this.previewSlots = yield this.queryGenerator.generatePreview(this.selectedSlots);
    this.saveResult = null;
  }

  @restartableTask
  *regeneratePreviewTask() {
    if (!this.canPreview) return;

    this.previewSlots = yield this.queryGenerator.generatePreview(this.selectedSlots);
    this.saveResult = null;
  }

  @dropTask
  *savePreviewTask() {
    if (!this.previewSlots || !this.previewCanBeSaved) return;

    const saveResult = yield this.buildSearches.savePreview({
      folderTitle: this.folderTitle,
      league: this.league,
      previewSlots: this.previewSlots,
    });
    this.saveResult = saveResult;

    if (saveResult.saved.length > 0) {
      this.flashMessages.success(
        this.intl.t('page.build-searches.save-success-flash', {count: saveResult.saved.length})
      );
    } else {
      this.flashMessages.alert(this.intl.t('page.build-searches.save-error-flash'));
    }
  }

  @dropTask
  *persistTemplatesTask() {
    yield this.gearSlotTemplates.persistTemplates(this.stagedTemplates);
    this.templates = yield this.gearSlotTemplates.fetchTemplates();
    this.slotStates = this.refreshSlotStatesFromTemplates(this.templates);
    this.isEditingTemplates = false;

    this.flashMessages.success(this.intl.t('page.build-searches.templates.save-success-flash'));
  }

  @action
  setBuildName(value: string) {
    this.buildName = value;
  }

  @action
  setCharacterClass(value: string) {
    this.characterClass = value;
  }

  @action
  setAscendancy(value: string) {
    this.ascendancy = value;
  }

  @action
  setLeague(value: string) {
    this.league = value;
  }

  @action
  setImportJson(event: {target: HTMLTextAreaElement}) {
    this.importJson = event.target.value;
  }

  @action
  importPastedBuild() {
    if (!this.canImportPastedBuild) return;

    try {
      this.applyImportDraft(this.buildFileImporter.importText(this.importJson));
    } catch (error) {
      this.importError = this.errorMessage(error);
    }
  }

  @action
  async importBuildFile(event: InputEvent) {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    try {
      this.applyImportDraft(await this.buildFileImporter.importFile(file));
    } catch (error) {
      this.importError = this.errorMessage(error);
    }
  }

  @action
  clearImportedBuild() {
    this.importDraft = null;
    this.importError = '';
    this.importWarnings = [];
    this.clearGeneratedState();
  }

  @action
  toggleSlotSelection(slotId: string, event: InputEvent) {
    this.updateSlotState(slotId, (slot) => ({
      ...slot,
      selected: event.target.checked,
    }));
  }

  @action
  updateSlotBase(slotId: string, event: InputEvent) {
    this.updateSlotState(slotId, (slot) => ({
      ...slot,
      base: event.target.value,
    }));
  }

  @action
  updateSlotNumber(slotId: string, field: SlotNumberField, event: InputEvent) {
    this.updateSlotState(slotId, (slot) => ({
      ...slot,
      [field]: this.parseOptionalNumber(event.target.value),
    }));
  }

  @action
  setSlotGroupType(slotId: string, event: SelectEvent) {
    const groupType = this.parseGroupType(event.target.value);

    this.updateSlotState(slotId, (slot) => ({
      ...slot,
      groupType,
    }));
  }

  @action
  togglePriority(slotId: string, statKey: string, event: InputEvent) {
    this.updatePriority(slotId, statKey, (priority) => ({
      ...priority,
      enabled: event.target.checked,
    }));
  }

  @action
  updatePriorityNumber(slotId: string, statKey: string, field: PriorityNumberField, event: InputEvent) {
    this.updatePriority(slotId, statKey, (priority) => ({
      ...priority,
      [field]:
        field === 'weight'
          ? this.parseRequiredNumber(event.target.value)
          : this.parseOptionalNumber(event.target.value),
    }));
  }

  @action
  updatePreviewSlotNumber(slotId: string, field: SlotNumberField, event: InputEvent) {
    const parsedValue = this.parseOptionalNumber(event.target.value);
    const value = field === 'countMin' && parsedValue !== null ? Math.max(1, parsedValue) : parsedValue;

    this.updateSlotStateFromPreview(slotId, (slot) => ({
      ...slot,
      [field]: value,
    }));
  }

  @action
  updatePreviewPriorityWeight(slotId: string, statKey: string, event: InputEvent) {
    const weight = this.parseRequiredNumber(event.target.value);

    this.updateSlotStateFromPreview(slotId, (slot) => ({
      ...slot,
      priorities: slot.priorities.map((priority) =>
        priority.statKey === statKey ? {...priority, weight} : priority
      ),
    }));
  }

  @action
  openTemplateSettings() {
    this.stagedTemplates = this.gearSlotTemplates.cloneTemplates(this.templates);
    this.isEditingTemplates = true;
  }

  @action
  closeTemplateSettings() {
    this.isEditingTemplates = false;
  }

  @action
  updateTemplateNumber(slotId: string, field: SlotNumberField, event: InputEvent) {
    this.updateStagedTemplate(slotId, (template) => ({
      ...template,
      [field]: this.parseOptionalNumber(event.target.value),
    }));
  }

  @action
  setTemplateGroupType(slotId: string, event: SelectEvent) {
    const groupType = this.parseGroupType(event.target.value);

    this.updateStagedTemplate(slotId, (template) => ({
      ...template,
      groupType,
    }));
  }

  @action
  toggleTemplatePriority(slotId: string, statKey: string, event: InputEvent) {
    this.updateStagedTemplatePriority(slotId, statKey, (priority) => ({
      ...priority,
      enabled: event.target.checked,
    }));
  }

  @action
  updateTemplatePriorityWeight(slotId: string, statKey: string, event: InputEvent) {
    this.updateStagedTemplatePriority(slotId, statKey, (priority) => ({
      ...priority,
      weight: this.parseRequiredNumber(event.target.value),
    }));
  }

  private updateSlotState(slotId: string, updater: (slot: BuildSearchSlotState) => BuildSearchSlotState) {
    this.slotStates = this.slotStates.map((slot) => (slot.slotId === slotId ? updater(slot) : slot));
    this.clearGeneratedState();
  }

  private updateSlotStateFromPreview(
    slotId: string,
    updater: (slot: BuildSearchSlotState) => BuildSearchSlotState
  ) {
    this.slotStates = this.slotStates.map((slot) => (slot.slotId === slotId ? updater(slot) : slot));

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (this.regeneratePreviewTask as Task).perform();
  }

  private updatePriority(
    slotId: string,
    statKey: string,
    updater: (priority: BuildSearchPriority) => BuildSearchPriority
  ) {
    this.updateSlotState(slotId, (slot) => ({
      ...slot,
      priorities: slot.priorities.map((priority) => (priority.statKey === statKey ? updater(priority) : priority)),
    }));
  }

  private updateStagedTemplate(
    slotId: string,
    updater: (template: BuildSearchGearSlotTemplate) => BuildSearchGearSlotTemplate
  ) {
    this.stagedTemplates = this.stagedTemplates.map((template) =>
      template.slotId === slotId ? updater(template) : template
    );
  }

  private updateStagedTemplatePriority(
    slotId: string,
    statKey: string,
    updater: (priority: BuildSearchPriority) => BuildSearchPriority
  ) {
    this.updateStagedTemplate(slotId, (template) => ({
      ...template,
      priorities: template.priorities.map((priority) => (priority.statKey === statKey ? updater(priority) : priority)),
    }));
  }

  private refreshSlotStatesFromTemplates(templates: BuildSearchGearSlotTemplate[]): BuildSearchSlotState[] {
    const templateSlotStates = this.gearSlotTemplates.createSlotStates(templates);

    return this.slotStates.map((slot) => {
      if (slot.selected) return slot;

      return templateSlotStates.find(({slotId}) => slotId === slot.slotId) || slot;
    });
  }

  private clearGeneratedState() {
    this.previewSlots = null;
    this.saveResult = null;
  }

  private applyImportDraft(draft: BuildSearchImportDraft) {
    const mappingResult = this.buildFileSlotMapper.mapDraftToSlotStates(draft, this.slotStates);

    this.importDraft = draft;
    this.importError = '';
    this.importWarnings = mappingResult.warnings;
    this.buildName = draft.buildName || DEFAULT_BUILD_NAME;
    this.ascendancy = draft.ascendancy;
    this.slotStates = mappingResult.slotStates;
    this.clearGeneratedState();
  }

  private errorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'The .build file could not be imported.';
  }

  private parseGroupType(value: string): BuildSearchGroupType {
    return value === 'weight2' ? 'weight2' : 'count';
  }

  private parseOptionalNumber(value: string): number | null {
    if (value.trim() === '') return null;

    return this.parseRequiredNumber(value);
  }

  private parseRequiredNumber(value: string): number {
    const parsedNumber = Number(value);

    return Number.isNaN(parsedNumber) ? 0 : parsedNumber;
  }
}
