function ensureImagePositionPanelMarkup() {
  if (document.querySelector("#image-position-value")) {
    return;
  }

  const imageTagsInput = document.querySelector("#image-tags");
  if (!imageTagsInput) {
    return;
  }

  imageTagsInput.insertAdjacentHTML(
    "afterend",
    `
      <div class="image-position-panel">
          <div class="image-position-header">
            <span class="field-label">图片显示</span>
            <div class="display-mode-group">
            <button class="display-mode-button active" type="button" data-display-mode="fit">适应</button>
            <button class="display-mode-button" type="button" data-display-mode="actual">100%</button>
          </div>
        </div>
        <div class="image-position-header">
          <span class="field-label">图片位置</span>
          <span id="image-position-value" class="image-position-value">X 0 / Y 0</span>
        </div>
        <div class="image-position-grid">
          <span class="image-position-spacer" aria-hidden="true"></span>
          <button class="image-position-button" type="button" data-nudge-image="up">&uarr;</button>
          <span class="image-position-spacer" aria-hidden="true"></span>
          <button class="image-position-button" type="button" data-nudge-image="left">&larr;</button>
          <button class="image-position-button reset" id="reset-image-position" type="button">复位</button>
          <button class="image-position-button" type="button" data-nudge-image="right">&rarr;</button>
          <span class="image-position-spacer" aria-hidden="true"></span>
          <button class="image-position-button" type="button" data-nudge-image="down">&darr;</button>
          <span class="image-position-spacer" aria-hidden="true"></span>
        </div>
        <p class="tool-help">只调整画布里的图片显示位置，不影响标注尺寸和坐标。</p>
      </div>
    `
  );
}

ensureImagePositionPanelMarkup();

const elements = {
  annotationCount: document.querySelector("#annotation-count"),
  annotationList: document.querySelector("#annotation-list"),
  annotationNameEditor: document.querySelector("#annotation-name-editor"),
  annotationNameInput: document.querySelector("#annotation-name-input"),
  canvas: document.querySelector("#draft-canvas"),
  clearButton: document.querySelector("#clear-button"),
  deleteSelectedButton: document.querySelector("#delete-selected-button"),
  displayModeButtons: [...document.querySelectorAll("[data-display-mode]")],
  downloadButton: document.querySelector("#download-button"),
  exportFilename: document.querySelector("#export-filename"),
  fileName: document.querySelector("#file-name"),
  historyList: document.querySelector("#history-list"),
  imageLoader: document.querySelector("#image-loader"),
  imagePositionButtons: [...document.querySelectorAll("[data-nudge-image]")],
  imagePositionValue: document.querySelector("#image-position-value"),
  imageSize: document.querySelector("#image-size"),
  imageTags: document.querySelector("#image-tags"),
  overlay: document.querySelector("#canvas-overlay"),
  projectName: document.querySelector("#project-name"),
  projectNotes: document.querySelector("#project-notes"),
  refreshHistory: document.querySelector("#refresh-history"),
  resetImagePosition: document.querySelector("#reset-image-position"),
  saveAnnotationName: document.querySelector("#save-annotation-name"),
  saveButton: document.querySelector("#save-button"),
  selectionSize: document.querySelector("#selection-size"),
  statusLine: document.querySelector("#status-line"),
  toolButtons: [...document.querySelectorAll("[data-tool]")],
  undoButton: document.querySelector("#undo-button"),
  scalePanel: document.querySelector("#scale-panel"),
  scaleInfo: document.querySelector("#scale-info"),
  scaleStatus: document.querySelector("#scale-status"),
  scalePixels: document.querySelector("#scale-pixels"),
  scaleReal: document.querySelector("#scale-real"),
  scaleRatio: document.querySelector("#scale-ratio"),
  scaleHint: document.querySelector("#scale-hint"),
  clearScale: document.querySelector("#clear-scale"),
  scaleModalOverlay: document.querySelector("#scale-modal-overlay"),
  scaleLengthInput: document.querySelector("#scale-length"),
  scaleUnitSelect: document.querySelector("#scale-unit"),
  scaleUnitCustomRow: document.querySelector("#scale-unit-custom-row"),
  scaleUnitCustomInput: document.querySelector("#scale-unit-custom"),
  scalePreviewLength: document.querySelector("#scale-preview-length"),
  scaleCancel: document.querySelector("#scale-cancel"),
  scaleConfirm: document.querySelector("#scale-confirm"),
  batchImageLoader: document.querySelector("#batch-image-loader"),
  batchPanel: document.querySelector("#batch-panel"),
  batchCurrentIndex: document.querySelector("#batch-current-index"),
  batchTotal: document.querySelector("#batch-total"),
  batchPrev: document.querySelector("#batch-prev"),
  batchNext: document.querySelector("#batch-next"),
  batchTaskList: document.querySelector("#batch-task-list"),
  batchCompleted: document.querySelector("#batch-completed"),
  batchProgress: document.querySelector("#batch-progress"),
  exitBatch: document.querySelector("#exit-batch"),
  shareScale: document.querySelector("#share-scale"),
  applyProjectToAll: document.querySelector("#apply-project-to-all"),
  templateSelect: document.querySelector("#template-select"),
  templatePanel: document.querySelector("#template-panel"),
  categoryList: document.querySelector("#category-list"),
  newTemplateButton: document.querySelector("#new-template-button"),
  editTemplateButton: document.querySelector("#edit-template-button"),
  deleteTemplateButton: document.querySelector("#delete-template-button"),
  newCategoryButton: document.querySelector("#new-category-button"),
  templateModalOverlay: document.querySelector("#template-modal-overlay"),
  templateModalTitle: document.querySelector("#template-modal-title"),
  templateNameInput: document.querySelector("#template-name-input"),
  templateDefaultCheckbox: document.querySelector("#template-default-checkbox"),
  templateModalCancel: document.querySelector("#template-modal-cancel"),
  templateModalConfirm: document.querySelector("#template-modal-confirm"),
  categoryModalOverlay: document.querySelector("#category-modal-overlay"),
  categoryModalTitle: document.querySelector("#category-modal-title"),
  categoryNameInput: document.querySelector("#category-name-input"),
  categoryColorInput: document.querySelector("#category-color-input"),
  categoryShapeType: document.querySelector("#category-shape-type"),
  categoryNamingPattern: document.querySelector("#category-naming-pattern"),
  categoryShowMeasurements: document.querySelector("#category-show-measurements"),
  categoryExportIncluded: document.querySelector("#category-export-included"),
  categoryModalCancel: document.querySelector("#category-modal-cancel"),
  categoryModalConfirm: document.querySelector("#category-modal-confirm"),
  colorPresetGrid: document.querySelector("#color-preset-grid"),
};

const state = {
  annotations: [],
  currentTool: "rectangle",
  currentSessionPrefix: null,
  drawing: false,
  draftAnnotation: null,
  image: null,
  imageName: "",
  imageFile: null,
  imageOffset: { x: 0, y: 0 },
  originalImageDataUrl: null,
  imagePlacement: null,
  pointerStart: null,
  polygonPoints: [],
  linePoints: [],
  brushPoints: [],
  selectedId: null,
  sessions: [],
  undoStack: [],
  editing: false,
  editMode: null,
  editHandleIndex: null,
  editOriginalAnnotation: null,
  editStartPoint: null,
  displayMode: "fit",
  scale: createDefaultScaleState(),
  scaleLinePoints: [],
  scaleDraft: null,
  pendingScalePixels: 0,
};

const presetColors = [
  "#ff8f62",
  "#55d5ff",
  "#8ae35f",
  "#ff6b9d",
  "#ffd18a",
  "#9d4edd",
  "#06b6d4",
  "#f43f5e",
  "#84cc16",
  "#f97316",
  "#8b5cf6",
  "#0ea5e9",
];

function generateDefaultTemplates() {
  return [
    {
      id: crypto.randomUUID(),
      name: "默认模板",
      isDefault: true,
      createdAt: new Date().toISOString(),
      categories: [
        {
          id: crypto.randomUUID(),
          name: "缺陷",
          color: "#ff8f62",
          shapeType: "rectangle",
          namingPattern: "缺陷-{n}",
          nextNumber: 1,
          showMeasurements: true,
          exportIncluded: true,
        },
        {
          id: crypto.randomUUID(),
          name: "区域",
          color: "#8ae35f",
          shapeType: "polygon",
          namingPattern: "区域-{n}",
          nextNumber: 1,
          showMeasurements: true,
          exportIncluded: true,
        },
        {
          id: crypto.randomUUID(),
          name: "路径",
          color: "#55d5ff",
          shapeType: "line",
          namingPattern: "路径-{n}",
          nextNumber: 1,
          showMeasurements: true,
          exportIncluded: true,
        },
      ],
    },
  ];
}

function createEmptyTemplate() {
  return {
    id: crypto.randomUUID(),
    name: "新模板",
    isDefault: false,
    createdAt: new Date().toISOString(),
    categories: [],
  };
}

function createEmptyCategory() {
  return {
    id: crypto.randomUUID(),
    name: "新类别",
    color: presetColors[0],
    shapeType: "rectangle",
    namingPattern: "{n}",
    nextNumber: 1,
    showMeasurements: true,
    exportIncluded: true,
  };
}

function normalizeLoadedTemplate(template) {
  if (!template || typeof template !== "object") {
    return null;
  }

  const normalized = {
    id: template.id || crypto.randomUUID(),
    name: String(template.name || "未命名模板"),
    isDefault: Boolean(template.isDefault),
    createdAt: String(template.createdAt || new Date().toISOString()),
    categories: [],
  };

  if (Array.isArray(template.categories)) {
    normalized.categories = template.categories
      .map((cat) => {
        if (!cat || typeof cat !== "object") {
          return null;
        }
        return {
          id: cat.id || crypto.randomUUID(),
          name: String(cat.name || "未命名类别"),
          color: String(cat.color || "#ff8f62"),
          shapeType: String(cat.shapeType || "rectangle"),
          namingPattern: String(cat.namingPattern || "{n}"),
          nextNumber: Number(cat.nextNumber) || 1,
          showMeasurements: Boolean(cat.showMeasurements !== false),
          exportIncluded: Boolean(cat.exportIncluded !== false),
        };
      })
      .filter(Boolean);
  }

  return normalized;
}

function normalizeLoadedTemplates(templates) {
  if (!Array.isArray(templates)) {
    return generateDefaultTemplates();
  }
  const normalized = templates.map(normalizeLoadedTemplate).filter(Boolean);
  if (normalized.length === 0) {
    return generateDefaultTemplates();
  }

  let foundDefault = false;
  normalized.forEach((template) => {
    if (template.isDefault && !foundDefault) {
      foundDefault = true;
      return;
    }
    template.isDefault = false;
  });

  if (!foundDefault) {
    normalized[0].isDefault = true;
  }

  return normalized;
}

const templatesState = {
  templates: generateDefaultTemplates(),
  activeTemplateId: null,
  activeCategoryId: null,
};

function syncToolToActiveCategory() {
  const activeCategory = getActiveCategory();
  if (activeCategory) {
    state.currentTool = activeCategory.shapeType;
  }
}

function syncTemplateSelection(preferredTemplateId = null, preferredCategoryId = null) {
  if (!templatesState.templates.length) {
    templatesState.activeTemplateId = null;
    templatesState.activeCategoryId = null;
    return null;
  }

  let template = preferredTemplateId
    ? templatesState.templates.find((item) => item.id === preferredTemplateId)
    : null;

  if (!template) {
    template = templatesState.templates.find((item) => item.isDefault) || templatesState.templates[0];
  }

  templatesState.activeTemplateId = template ? template.id : null;

  if (!template) {
    templatesState.activeCategoryId = null;
    return null;
  }

  let category = preferredCategoryId
    ? template.categories.find((item) => item.id === preferredCategoryId)
    : null;

  if (!category) {
    category = template.categories[0] || null;
  }

  templatesState.activeCategoryId = category ? category.id : null;
  syncToolToActiveCategory();
  return template;
}

function applyTemplatesState(serializedTemplates, preferredTemplateId = null, preferredCategoryId = null, options = {}) {
  const { preserveCurrentOnMissing = false } = options;

  if (Array.isArray(serializedTemplates) && serializedTemplates.length > 0) {
    templatesState.templates = normalizeLoadedTemplates(serializedTemplates);
  } else if (!preserveCurrentOnMissing) {
    templatesState.templates = generateDefaultTemplates();
  }

  return syncTemplateSelection(preferredTemplateId, preferredCategoryId);
}

function getActiveTemplate() {
  if (!templatesState.activeTemplateId) {
    if (templatesState.templates.length > 0) {
      templatesState.activeTemplateId = templatesState.templates[0].id;
      return templatesState.templates[0];
    }
    return null;
  }
  return templatesState.templates.find((t) => t.id === templatesState.activeTemplateId) || null;
}

function getActiveCategory() {
  const template = getActiveTemplate();
  if (!template || !templatesState.activeCategoryId) {
    return null;
  }
  return template.categories.find((c) => c.id === templatesState.activeCategoryId) || null;
}

function setActiveTemplate(templateId) {
  const template = templatesState.templates.find((t) => t.id === templateId);
  if (!template) {
    return false;
  }
  syncTemplateSelection(templateId, template.categories.length > 0 ? template.categories[0].id : null);
  renderTemplateList();
  renderCategoryList();
  updateToolButtons();
  return true;
}

function setActiveCategory(categoryId) {
  const template = getActiveTemplate();
  if (!template) {
    return false;
  }
  const category = template.categories.find((c) => c.id === categoryId);
  if (!category) {
    return false;
  }
  syncTemplateSelection(template.id, categoryId);
  renderCategoryList();
  updateToolButtons();
  setStatus(`已选择类别：${category.name}，工具：${category.shapeType === "rectangle" ? "矩形" : category.shapeType === "polygon" ? "多边形" : category.shapeType === "line" ? "折线" : "画笔"}`);
  return true;
}

function addTemplate(template) {
  templatesState.templates.push(template);
  templatesState.templates = normalizeLoadedTemplates(templatesState.templates);
  syncTemplateSelection(template.id, template.categories.length > 0 ? template.categories[0].id : null);
  renderTemplateList();
  renderCategoryList();
  updateToolButtons();
  saveTemplatesToCurrentTask();
}

function updateTemplate(templateId, updates) {
  const index = templatesState.templates.findIndex((t) => t.id === templateId);
  if (index === -1) {
    return false;
  }
  
  if (updates.isDefault === true) {
    templatesState.templates.forEach((t, i) => {
      if (i !== index) {
        t.isDefault = false;
      }
    });
  }
  
  Object.assign(templatesState.templates[index], updates);
  templatesState.templates = normalizeLoadedTemplates(templatesState.templates);
  syncTemplateSelection(templatesState.activeTemplateId, templatesState.activeCategoryId);
  renderTemplateList();
  renderCategoryList();
  updateToolButtons();
  saveTemplatesToCurrentTask();
  return true;
}

function deleteTemplate(templateId) {
  const index = templatesState.templates.findIndex((t) => t.id === templateId);
  if (index === -1) {
    return false;
  }
  if (templatesState.templates.length <= 1) {
    setStatus("至少需要保留一个模板。", "error");
    return false;
  }
  templatesState.templates.splice(index, 1);
  templatesState.templates = normalizeLoadedTemplates(templatesState.templates);
  syncTemplateSelection(templatesState.activeTemplateId === templateId ? null : templatesState.activeTemplateId, templatesState.activeCategoryId);
  renderTemplateList();
  renderCategoryList();
  updateToolButtons();
  saveTemplatesToCurrentTask();
  setStatus("已删除模板。");
  return true;
}

function addCategory(templateId, category) {
  const template = templatesState.templates.find((t) => t.id === templateId);
  if (!template) {
    return false;
  }
  template.categories.push(category);
  if (templatesState.activeTemplateId === templateId && !templatesState.activeCategoryId) {
    syncTemplateSelection(templateId, category.id);
  } else {
    syncToolToActiveCategory();
  }
  renderCategoryList();
  updateToolButtons();
  saveTemplatesToCurrentTask();
  return true;
}

function updateCategory(templateId, categoryId, updates) {
  const template = templatesState.templates.find((t) => t.id === templateId);
  if (!template) {
    return false;
  }
  const category = template.categories.find((c) => c.id === categoryId);
  if (!category) {
    return false;
  }
  Object.assign(category, updates);
  if (templatesState.activeTemplateId === templateId && templatesState.activeCategoryId === categoryId) {
    syncToolToActiveCategory();
  }
  renderCategoryList();
  updateToolButtons();
  saveTemplatesToCurrentTask();
  return true;
}

function deleteCategory(templateId, categoryId) {
  const template = templatesState.templates.find((t) => t.id === templateId);
  if (!template) {
    return false;
  }
  const index = template.categories.findIndex((c) => c.id === categoryId);
  if (index === -1) {
    return false;
  }
  template.categories.splice(index, 1);
  if (templatesState.activeCategoryId === categoryId) {
    syncTemplateSelection(templateId, template.categories.length > 0 ? template.categories[0].id : null);
  } else {
    syncToolToActiveCategory();
  }
  renderCategoryList();
  updateToolButtons();
  saveTemplatesToCurrentTask();
  setStatus("已删除类别。");
  return true;
}

function generateNextCategoryName(category) {
  if (!category) {
    return "";
  }
  const name = category.namingPattern.replace("{n}", String(category.nextNumber));
  category.nextNumber += 1;
  return name;
}

function getAnnotationCategoryColor(annotation) {
  const defaultColors = {
    rectangle: "#ff8f62",
    line: "#55d5ff",
    polygon: "#8ae35f",
    brush: "#ff6b9d",
  };
  
  if (annotation.color) {
    return annotation.color;
  }
  
  if (annotation.categoryId) {
    const template = getActiveTemplate();
    if (template) {
      const category = template.categories.find((c) => c.id === annotation.categoryId);
      if (category) {
        return category.color;
      }
    }
  }
  
  return defaultColors[annotation.type] || "#ff8f62";
}

function getCategoryColorForShape(shapeType) {
  const defaultColors = {
    rectangle: "#ff8f62",
    line: "#55d5ff",
    polygon: "#8ae35f",
    brush: "#ff6b9d",
  };
  const category = getActiveCategory();
  if (category && category.shapeType === shapeType) {
    return category.color;
  }
  return defaultColors[shapeType] || "#ff8f62";
}

function saveTemplatesToCurrentTask() {
  const currentTask = getCurrentTask();
  if (currentTask) {
    currentTask.templates = structuredClone(templatesState.templates);
    currentTask.activeTemplateId = templatesState.activeTemplateId;
    currentTask.activeCategoryId = templatesState.activeCategoryId;
  }
}

function loadTemplatesFromTask(task) {
  if (!task) {
    return;
  }
  applyTemplatesState(task.templates, task.activeTemplateId, task.activeCategoryId);
}

function serializeTemplates() {
  return {
    templates: templatesState.templates.map((template) => ({
      id: template.id,
      name: template.name,
      isDefault: template.isDefault,
      createdAt: template.createdAt,
      categories: template.categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        color: cat.color,
        shapeType: cat.shapeType,
        namingPattern: cat.namingPattern,
        nextNumber: cat.nextNumber,
        showMeasurements: cat.showMeasurements,
        exportIncluded: cat.exportIncluded,
      })),
    })),
    activeTemplateId: templatesState.activeTemplateId,
    activeCategoryId: templatesState.activeCategoryId,
  };
}

function getTemplateById(templateId) {
  return templatesState.templates.find((t) => t.id === templateId) || null;
}

function getCategoryById(categoryId) {
  for (const template of templatesState.templates) {
    const category = template.categories.find((c) => c.id === categoryId);
    if (category) {
      return category;
    }
  }
  return null;
}

function getAnnotationCategory(annotation) {
  if (!annotation || !annotation.categoryId) {
    return null;
  }
  return getCategoryById(annotation.categoryId);
}

function shouldShowMeasurements(annotation) {
  if (annotation && annotation.showMeasurements !== undefined && annotation.showMeasurements !== null) {
    return annotation.showMeasurements;
  }
  const category = getAnnotationCategory(annotation);
  if (category) {
    return category.showMeasurements;
  }
  return true;
}

function shouldIncludeInExport(annotation) {
  if (annotation && annotation.exportIncluded !== undefined && annotation.exportIncluded !== null) {
    return annotation.exportIncluded;
  }
  const category = getAnnotationCategory(annotation);
  if (category) {
    return category.exportIncluded;
  }
  return true;
}

function getActiveTemplates() {
  return templatesState.templates;
}

function getActiveCategories() {
  const template = getActiveTemplate();
  return template ? template.categories : [];
}

function getActiveTemplateId() {
  if (!templatesState.activeTemplateId && templatesState.templates.length > 0) {
    templatesState.activeTemplateId = templatesState.templates[0].id;
  }
  return templatesState.activeTemplateId;
}

function getActiveCategoryId() {
  return templatesState.activeCategoryId;
}

function createTemplate(name, isDefault = false) {
  const template = createEmptyTemplate();
  template.name = name || "新模板";
  template.isDefault = isDefault;
  
  if (isDefault) {
    templatesState.templates.forEach((t) => {
      t.isDefault = false;
    });
  }
  
  return template;
}

function createCategory(name, color, shapeType = "rectangle") {
  const category = createEmptyCategory();
  category.name = name || "新类别";
  category.color = color || presetColors[0];
  category.shapeType = shapeType;
  return category;
}

function saveTemplatesToStorage() {
  try {
    const data = serializeTemplates();
    localStorage.setItem("geodraft_templates", JSON.stringify(data));
    saveTemplatesToCurrentTask();
  } catch (error) {
    console.error("Failed to save templates to storage:", error);
  }
}

function loadTemplatesFromStorage() {
  try {
    const stored = localStorage.getItem("geodraft_templates");
    if (stored) {
      const data = JSON.parse(stored);
      applyTemplatesState(data.templates, data.activeTemplateId, data.activeCategoryId, { preserveCurrentOnMissing: true });
    }

    syncTemplateSelection(templatesState.activeTemplateId, templatesState.activeCategoryId);
  } catch (error) {
    console.error("Failed to load templates from storage:", error);
    templatesState.templates = generateDefaultTemplates();
    syncTemplateSelection();
  }
}

function removeTemplate(templateId) {
  return deleteTemplate(templateId);
}

function removeCategory(templateId, categoryId) {
  return deleteCategory(templateId, categoryId);
}

const session = {
  isBatchSession: false,
  batchId: null,
  batchName: null,
  shareScale: false,
  sharedScale: null,
  applyProjectToAll: false,
  currentTaskIndex: 0,
  tasks: [],
};

function normalizeImageTags(value) {
  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function readProjectSettingsFromForm() {
  return {
    projectName: elements.projectName.value.trim() || "GeoDraft Prototype",
    projectNotes: elements.projectNotes.value.trim(),
    exportFilename: elements.exportFilename.value.trim(),
    imageTags: normalizeImageTags(elements.imageTags.value),
  };
}

function applyProjectSettingsToForm(settings = {}) {
  elements.projectName.value = settings.projectName || "GeoDraft Prototype";
  elements.projectNotes.value = settings.projectNotes || "";
  elements.exportFilename.value = settings.exportFilename || "";
  elements.imageTags.value = normalizeImageTags(settings.imageTags).join(", ");
}

function createTaskProjectSettings(source = {}) {
  return {
    projectName: source.projectName || "GeoDraft Prototype",
    projectNotes: source.projectNotes || "",
    exportFilename: source.exportFilename || "",
    imageTags: normalizeImageTags(source.imageTags),
  };
}

function syncTaskProjectSettingsFromForm(task) {
  if (!task) {
    return;
  }
  Object.assign(task, createTaskProjectSettings(readProjectSettingsFromForm()));
}

function syncProjectSettingsFromTask(task) {
  if (!task) {
    return;
  }
  applyProjectSettingsToForm(task);
}

function applyProjectSettingsToAllTasks(settings = readProjectSettingsFromForm()) {
  const normalized = createTaskProjectSettings(settings);
  session.tasks.forEach((task) => Object.assign(task, structuredClone(normalized)));
}

function syncSharedScaleToAllTasks(scale = state.scale) {
  const normalizedScale = structuredClone(scale);
  session.sharedScale = normalizedScale;
  session.tasks.forEach((task) => {
    task.scale = structuredClone(normalizedScale);
  });
}

function handleBatchProjectSettingsChanged() {
  if (!session.isBatchSession) {
    return;
  }

  const currentTask = getCurrentTask();
  if (!currentTask) {
    return;
  }

  syncTaskProjectSettingsFromForm(currentTask);
  if (session.applyProjectToAll) {
    applyProjectSettingsToAllTasks(currentTask);
  }
}

function createTaskFromFile(file) {
  return {
    taskId: crypto.randomUUID(),
    fileName: file.name,
    imageFile: file,
    imageDataUrl: null,
    originalImageDataUrl: null,
    imageMeta: null,
    loaded: false,
    annotations: [],
    selectedId: null,
    undoStack: [],
    imageOffset: { x: 0, y: 0 },
    displayMode: "fit",
    scale: createDefaultScaleState(),
    templates: structuredClone(templatesState.templates),
    activeTemplateId: templatesState.activeTemplateId,
    activeCategoryId: templatesState.activeCategoryId,
    ...createTaskProjectSettings(readProjectSettingsFromForm()),
    saved: false,
    savedPrefix: null,
    savedAt: null,
    fromHistory: false,
    historyData: null,
  };
}

function createTaskFromHistory(historyTaskData, fullSessionData = null) {
  const imageMeta = historyTaskData.imageMeta || {};
  const scaleData = historyTaskData.scale || null;
  
  let taskScale = createDefaultScaleState();
  if (scaleData && scaleData.enabled) {
    taskScale = {
      enabled: Boolean(scaleData.enabled),
      pixels: Number(scaleData.pixels) || 0,
      realLength: Number(scaleData.realLength) || 0,
      unit: normalizeScaleUnit(scaleData.unit),
      pixelPerUnit: Number(scaleData.pixelPerUnit) || 0,
    };
  }

  const annotations = fullSessionData && fullSessionData.annotations
    ? normalizeLoadedAnnotations(fullSessionData.annotations)
    : [];

  let taskTemplates = null;
  let taskActiveTemplateId = null;
  let taskActiveCategoryId = null;

  if (fullSessionData && fullSessionData.templates && fullSessionData.templates.length > 0) {
    taskTemplates = normalizeLoadedTemplates(fullSessionData.templates);
    taskActiveTemplateId = fullSessionData.activeTemplateId || null;
    taskActiveCategoryId = fullSessionData.activeCategoryId || null;
  }

  return {
    taskId: crypto.randomUUID(),
    fileName: imageMeta.name || historyTaskData.imageName || "历史图片",
    imageFile: null,
    imageDataUrl: fullSessionData ? fullSessionData.originalImage || fullSessionData.annotatedImage || null : null,
    originalImageDataUrl: fullSessionData ? fullSessionData.originalImage || null : null,
    imageMeta: imageMeta,
    loaded: Boolean(fullSessionData && (fullSessionData.originalImage || fullSessionData.annotatedImage)),
    annotations: annotations,
    selectedId: null,
    undoStack: [],
    imageOffset: { x: 0, y: 0 },
    displayMode: "fit",
    scale: taskScale,
    templates: taskTemplates,
    activeTemplateId: taskActiveTemplateId,
    activeCategoryId: taskActiveCategoryId,
    ...createTaskProjectSettings({
      projectName: fullSessionData?.projectName || historyTaskData.projectName,
      projectNotes: fullSessionData?.projectNotes || historyTaskData.notes,
      exportFilename: fullSessionData?.exportFilename || historyTaskData.exportFilename,
      imageTags: fullSessionData?.imageTags || historyTaskData.imageTags,
    }),
    saved: true,
    savedPrefix: historyTaskData.filePrefix || null,
    savedAt: historyTaskData.savedAt || null,
    fromHistory: true,
    historyData: historyTaskData,
    fullSessionData: fullSessionData,
  };
}

function syncStateFromTask(task) {
  if (!task) {
    return;
  }

  state.annotations = structuredClone(task.annotations);
  state.selectedId = task.selectedId;
  state.undoStack = structuredClone(task.undoStack);
  state.imageOffset = { ...task.imageOffset };
  state.displayMode = task.displayMode;
  state.scale = session.shareScale && session.sharedScale 
    ? structuredClone(session.sharedScale) 
    : structuredClone(task.scale);
  state.originalImageDataUrl = task.originalImageDataUrl || null;
  state.currentSessionPrefix = task.savedPrefix;
  
  loadTemplatesFromTask(task);
  
  renderTemplateList();
  renderCategoryList();
  
  syncProjectSettingsFromTask(task);
}

function syncTaskFromState(task) {
  if (!task) {
    return;
  }

  task.annotations = structuredClone(state.annotations);
  task.selectedId = state.selectedId;
  task.undoStack = structuredClone(state.undoStack);
  task.imageOffset = { ...state.imageOffset };
  task.displayMode = state.displayMode;
  task.scale = structuredClone(state.scale);
  task.originalImageDataUrl = state.originalImageDataUrl;
  task.savedPrefix = state.currentSessionPrefix;
  
  saveTemplatesToCurrentTask();
  
  syncTaskProjectSettingsFromForm(task);
}

function getCurrentTask() {
  if (session.currentTaskIndex < 0 || session.currentTaskIndex >= session.tasks.length) {
    return null;
  }
  return session.tasks[session.currentTaskIndex];
}

function updateBatchUI() {
  if (!elements.batchPanel) {
    return;
  }

  if (session.isBatchSession && session.tasks.length > 0) {
    elements.batchPanel.classList.remove("hidden");
  } else {
    elements.batchPanel.classList.add("hidden");
  }

  if (elements.batchCurrentIndex) {
    elements.batchCurrentIndex.textContent = session.currentTaskIndex >= 0 ? session.currentTaskIndex + 1 : 0;
  }
  if (elements.batchTotal) {
    elements.batchTotal.textContent = session.tasks.length;
  }

  if (elements.batchPrev) {
    elements.batchPrev.disabled = session.currentTaskIndex <= 0;
  }
  if (elements.batchNext) {
    elements.batchNext.disabled = session.currentTaskIndex >= session.tasks.length - 1;
  }

  const completedCount = session.tasks.filter((t) => t.saved).length;
  if (elements.batchProgress) {
    elements.batchProgress.textContent = session.isBatchSession 
      ? `已完成 ${completedCount}/${session.tasks.length} 张` 
      : "支持 PNG、JPG、JPEG、WebP、BMP";
  }
  if (elements.batchCompleted) {
    elements.batchCompleted.textContent = `已完成 ${completedCount} 张`;
  }

  if (elements.shareScale) {
    elements.shareScale.checked = session.shareScale;
  }
  if (elements.applyProjectToAll) {
    elements.applyProjectToAll.checked = session.applyProjectToAll;
  }
}

function renderBatchTaskList() {
  if (!elements.batchTaskList) {
    return;
  }

  if (!session.isBatchSession || session.tasks.length === 0) {
    elements.batchTaskList.innerHTML = '<li class="empty-state">暂无批量任务</li>';
    return;
  }

  elements.batchTaskList.innerHTML = session.tasks
    .map((task, index) => {
      const isActive = index === session.currentTaskIndex;
      const annotationCount = task.annotations.length;

      let statusIcon = "pending";
      let statusText = "待处理";

      if (task.saved) {
        statusIcon = "saved";
        statusText = "已保存";
      } else if (annotationCount > 0) {
        statusIcon = "unsaved";
        statusText = `${annotationCount} 个标注`;
      }

      const statusSvg = {
        saved: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>',
        unsaved: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>',
        pending: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>',
      };

      const activeClass = isActive ? "batch-task-item active" : "batch-task-item";

      return `
        <li class="${activeClass}" data-batch-index="${index}">
          <span class="task-index">${index + 1}</span>
          <div class="task-info">
            <p class="task-name">${escapeHtml(task.fileName)}</p>
            <p class="task-meta">${statusText}</p>
          </div>
          <span class="task-status ${statusIcon}" title="${statusText}">
            ${statusSvg[statusIcon]}
          </span>
        </li>
      `;
    })
    .join("");
}

function hasUnsavedChanges() {
  const currentTask = getCurrentTask();
  if (!currentTask) {
    return state.annotations.length > 0 && !state.currentSessionPrefix;
  }
  return !currentTask.saved && currentTask.annotations.length > 0;
}

function hasAnyUnsavedChanges() {
  if (!session.isBatchSession) {
    return hasUnsavedChanges();
  }
  return session.tasks.some((task) => !task.saved && task.annotations.length > 0);
}



function loadTaskAtIndex(index) {
  if (index < 0 || index >= session.tasks.length) {
    return;
  }

  const currentTask = getCurrentTask();
  if (currentTask) {
    syncTaskFromState(currentTask);
    if (session.applyProjectToAll) {
      applyProjectSettingsToAllTasks(currentTask);
    }
  }

  const targetTask = session.tasks[index];
  session.currentTaskIndex = index;

  syncStateFromTask(targetTask);

  resetDraftState();
  resetScaleState();
  resetEditState();

  if (targetTask.loaded && targetTask.imageDataUrl) {
    loadImageFromSource(targetTask.imageDataUrl, targetTask.fileName, {
      imageFile: targetTask.imageFile,
      preserveAnnotations: true,
      afterLoad: () => {
        renderAnnotationList();
        updateAnnotationNameEditor();
        updateDisplayModeButtons();
        updateImagePositionDisplay();
        updateToolButtons();
        updateScalePanel();
        refreshOverlay();
        computeImagePlacement();
        drawScene();
        updateBatchUI();
        renderBatchTaskList();
        setStatus(`当前图片：${targetTask.fileName} (${index + 1}/${session.tasks.length})`);
      },
    });
    return;
  }

  if (!targetTask.imageFile) {
    state.image = null;
    state.imageName = targetTask.fileName || targetTask.imageMeta?.name || "";
    state.imageFile = null;
    state.imagePlacement = null;
    elements.fileName.textContent = state.imageName || "未恢复原图";
    elements.imageSize.textContent =
      targetTask.imageMeta?.width && targetTask.imageMeta?.height
        ? `${targetTask.imageMeta.width} × ${targetTask.imageMeta.height}`
        : "无文件";
    renderAnnotationList();
    updateAnnotationNameEditor();
    updateDisplayModeButtons();
    updateImagePositionDisplay();
    updateToolButtons();
    updateScalePanel();
    refreshOverlay();
    drawScene();
    updateBatchUI();
    renderBatchTaskList();
    setStatus(`已切换到 ${targetTask.fileName}，但未找到原图，请重新选择图片。`, "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    targetTask.imageDataUrl = reader.result;
    targetTask.originalImageDataUrl = reader.result;
    targetTask.loaded = true;

    const image = new Image();
    image.onload = () => {
      targetTask.imageMeta = {
        name: targetTask.fileName,
        width: image.width,
        height: image.height,
      };

      loadImageFromSource(targetTask.imageDataUrl, targetTask.fileName, {
        imageFile: targetTask.imageFile,
        preserveAnnotations: true,
        afterLoad: () => {
          renderAnnotationList();
          updateAnnotationNameEditor();
          updateDisplayModeButtons();
          updateImagePositionDisplay();
          updateToolButtons();
          updateScalePanel();
          refreshOverlay();
          computeImagePlacement();
          drawScene();
          updateBatchUI();
          renderBatchTaskList();
          setStatus(`当前图片：${targetTask.fileName} (${index + 1}/${session.tasks.length})`);
        },
      });
    };
    image.onerror = () => {
      setStatus(`图片加载失败：${targetTask.fileName}`, "error");
    };
    image.src = reader.result;
  };
  reader.onerror = () => {
    setStatus(`读取图片失败：${targetTask.fileName}`, "error");
  };
  reader.readAsDataURL(targetTask.imageFile);
}

function switchToTask(index) {
  if (!session.isBatchSession) {
    return;
  }

  if (index === session.currentTaskIndex) {
    return;
  }

  const currentTask = getCurrentTask();
  if (currentTask && !currentTask.saved && state.annotations.length > 0) {
    const confirmMessage = `当前图片"${currentTask.fileName}"有未保存的标注，是否继续切换？\n\n点击"确定"继续切换（未保存的更改会保留在任务中），点击"取消"留在当前页面。`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
  }

  loadTaskAtIndex(index);
}

function goToPrevTask() {
  if (!session.isBatchSession || session.currentTaskIndex <= 0) {
    return;
  }
  switchToTask(session.currentTaskIndex - 1);
}

function goToNextTask() {
  if (!session.isBatchSession || session.currentTaskIndex >= session.tasks.length - 1) {
    return;
  }
  switchToTask(session.currentTaskIndex + 1);
}

function startBatchSession(files) {
  if (!files || files.length === 0) {
    return;
  }

  const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));

  if (imageFiles.length === 0) {
    setStatus("没有选择有效的图片文件。", "error");
    return;
  }

  if (hasAnyUnsavedChanges()) {
    const confirmMessage = "当前有未保存的标注，确定要开始新的批量任务吗？\n\n未保存的更改将会丢失。";
    if (!window.confirm(confirmMessage)) {
      return;
    }
  }

  session.isBatchSession = true;
  session.batchId = crypto.randomUUID();
  session.batchName = `批量任务 ${new Date().toLocaleString("zh-CN")}`;
  session.shareScale = elements.shareScale ? elements.shareScale.checked : false;
  session.sharedScale = session.shareScale && state.scale.enabled ? structuredClone(state.scale) : null;
  session.applyProjectToAll = elements.applyProjectToAll ? elements.applyProjectToAll.checked : false;
  session.currentTaskIndex = 0;
  session.tasks = imageFiles.map((file) => createTaskFromFile(file));
  if (session.applyProjectToAll) {
    applyProjectSettingsToAllTasks();
  }
  if (session.shareScale && session.sharedScale) {
    syncSharedScaleToAllTasks(session.sharedScale);
  }

  updateBatchUI();
  loadTaskAtIndex(0);
  setStatus(`已进入批量模式，共 ${session.tasks.length} 张图片。`);
}

function exitBatchSession() {
  if (!session.isBatchSession) {
    return;
  }

  if (hasAnyUnsavedChanges()) {
    const unsavedCount = session.tasks.filter((t) => !t.saved && t.annotations.length > 0).length;
    const confirmMessage = `有 ${unsavedCount} 张图片的标注尚未保存，确定要退出批量模式吗？\n\n退出后未保存的标注将会丢失。`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
  }

  session.isBatchSession = false;
  session.batchId = null;
  session.batchName = null;
  session.shareScale = false;
  session.sharedScale = null;
  session.applyProjectToAll = false;
  session.currentTaskIndex = 0;
  session.tasks = [];

  updateBatchUI();
  resetSessionStateForNewImage();
  setStatus("已退出批量模式。");
}

function markCurrentTaskAsSaved(filePrefix) {
  const currentTask = getCurrentTask();
  if (!currentTask) {
    return;
  }

  syncTaskFromState(currentTask);
  currentTask.saved = true;
  currentTask.savedPrefix = filePrefix;
  currentTask.savedAt = new Date().toISOString();

  if (session.shareScale) {
    syncSharedScaleToAllTasks(state.scale);
  }

  renderBatchTaskList();
  updateBatchUI();
}











const ctx = elements.canvas.getContext("2d");
const canvasContainer = elements.canvas.parentElement;
const presetScaleUnits = new Set(["mm", "cm", "m", "in", "ft"]);

function getDevicePixelRatio() {
  return Math.max(1, window.devicePixelRatio || 1);
}

let canvasCssWidth = 0;
let canvasCssHeight = 0;

function getCanvasLogicalSize() {
  if (canvasCssWidth > 0 && canvasCssHeight > 0) {
    return { width: canvasCssWidth, height: canvasCssHeight };
  }

  const bounds = canvasContainer.getBoundingClientRect();
  return {
    width: Math.max(320, Math.floor(bounds.width)),
    height: Math.max(320, Math.floor(bounds.height)),
  };
}

function setStatus(message, tone = "default") {
  elements.statusLine.textContent = message;
  elements.statusLine.style.background =
    tone === "error" ? "rgba(184, 79, 37, 0.12)" : "rgba(35, 106, 76, 0.08)";
  elements.statusLine.style.color = tone === "error" ? "#b84f25" : "#236a4c";
}

function getToolInstructions(tool = state.currentTool) {
  if (tool === "line") {
    return "折线工具已启用，点击连续添加点，双击或 Enter 完成。";
  }

  if (tool === "polygon") {
    return "多边形工具已启用，点击添加顶点，双击或 Enter 完成闭合。";
  }

  if (tool === "brush") {
    return "画笔工具已启用，按住拖动即可自由打标。";
  }

  if (tool === "scale") {
    return "比例标定工具已启用，在图片上点击绘制两点参考线，建立像素与真实单位的换算关系。";
  }

  return "矩形工具已启用，在图片上拖动即可创建矩形标注。";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(isoString) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updateImagePositionDisplay() {
  if (!elements.imagePositionValue) {
    return;
  }

  elements.imagePositionValue.textContent = `X ${state.imageOffset.x} / Y ${state.imageOffset.y}`;
}

function syncCanvasSize() {
  const bounds = canvasContainer.getBoundingClientRect();
  const cssWidth = Math.max(320, Math.floor(bounds.width));
  const cssHeight = Math.max(320, Math.floor(bounds.height));
  const dpr = getDevicePixelRatio();
  const physicalWidth = cssWidth * dpr;
  const physicalHeight = cssHeight * dpr;

  if (elements.canvas.width !== physicalWidth || elements.canvas.height !== physicalHeight) {
    elements.canvas.width = physicalWidth;
    elements.canvas.height = physicalHeight;
    canvasCssWidth = cssWidth;
    canvasCssHeight = cssHeight;
  } else {
    canvasCssWidth = cssWidth;
    canvasCssHeight = cssHeight;
  }

  computeImagePlacement();
  drawScene();
}

function computeImagePlacement() {
  if (!state.image) {
    state.imagePlacement = null;
    updateImagePositionDisplay();
    return;
  }

  const { width: logicalCanvasWidth, height: logicalCanvasHeight } = getCanvasLogicalSize();
  const padding = 36;
  const dpr = getDevicePixelRatio();
  const safeOffsetX = Number.isFinite(state.imageOffset?.x) ? state.imageOffset.x : 0;
  const safeOffsetY = Number.isFinite(state.imageOffset?.y) ? state.imageOffset.y : 0;
  const availableWidth = Math.max(1, logicalCanvasWidth - padding * 2);
  const availableHeight = Math.max(1, logicalCanvasHeight - padding * 2);
  const scale =
    state.displayMode === "actual"
      ? 1 / dpr
      : Math.min(
          availableWidth / state.image.width,
          availableHeight / state.image.height,
          1
        );

  const drawWidth = state.image.width * scale;
  const drawHeight = state.image.height * scale;
  const alignedWidth = Math.max(1, Math.round(drawWidth));
  const alignedHeight = Math.max(1, Math.round(drawHeight));

  let baseX;
  let baseY;
  if (state.displayMode === "actual") {
    baseX = Math.max(padding, (logicalCanvasWidth - alignedWidth) / 2);
    baseY = Math.max(padding, (logicalCanvasHeight - alignedHeight) / 2);
  } else {
    baseX = (logicalCanvasWidth - alignedWidth) / 2;
    baseY = (logicalCanvasHeight - alignedHeight) / 2;
  }

  const alignedX = Math.round(baseX + safeOffsetX);
  const alignedY = Math.round(baseY + safeOffsetY);

  state.imagePlacement = {
    scale,
    x: alignedX,
    y: alignedY,
    width: alignedWidth,
    height: alignedHeight,
  };

  state.imageOffset = {
    x: Math.round(safeOffsetX),
    y: Math.round(safeOffsetY),
  };
  updateImagePositionDisplay();
}

function drawScene() {
  const dpr = getDevicePixelRatio();
  
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

  ctx.save();
  ctx.scale(dpr, dpr);

  if (!state.image || !state.imagePlacement) {
    drawEmptyCanvas();
    ctx.restore();
    return;
  }

  const placement = state.imagePlacement;

  ctx.save();
  ctx.imageSmoothingEnabled = state.displayMode !== "actual";
  ctx.imageSmoothingQuality = state.displayMode === "actual" ? "low" : "high";
  ctx.drawImage(state.image, placement.x, placement.y, placement.width, placement.height);
  ctx.restore();

  state.annotations.forEach((annotation) => drawAnnotation(annotation));

  if (state.draftAnnotation) {
    drawDraftAnnotation();
  }

  if (state.currentTool === "polygon" && state.polygonPoints.length) {
    drawPolygonDraft();
  }

  if (state.currentTool === "line" && state.linePoints.length) {
    drawLineDraft();
  }

  if (state.currentTool === "brush" && state.brushPoints.length) {
    drawBrushDraft();
  }

  if (state.currentTool === "scale" && state.scaleLinePoints.length) {
    drawScaleLine();
  }

  ctx.restore();
}

function drawEmptyCanvas() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.font = '600 20px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("加载图片后开始打标。", 32, 42);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = '400 14px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("当前支持矩形、折线、多边形、画笔、历史恢复和 PNG 导出。", 32, 68);
  ctx.restore();
}

function drawDraftAnnotation() {
  if (state.draftAnnotation.type === "rectangle") {
    drawRectangleAnnotation({ ...state.draftAnnotation, id: "draft" }, true);
    return;
  }

  if (state.draftAnnotation.type === "polygon-preview") {
    drawPolygonDraft();
    return;
  }

  if (state.draftAnnotation.type === "line-preview") {
    drawLineDraft();
  }
}

function drawAnnotation(annotation, isDraft = false) {
  if (!state.imagePlacement) {
    return;
  }

  const categoryColor = getAnnotationCategoryColor(annotation);

  if (annotation.type === "line") {
    const selectedColor = lightenColor(categoryColor, 20);
    drawPolylineAnnotation(annotation, categoryColor, selectedColor, isDraft);
    return;
  }

  if (annotation.type === "polygon") {
    drawPolygonAnnotation(annotation, isDraft);
    return;
  }

  if (annotation.type === "brush") {
    const selectedColor = lightenColor(categoryColor, 20);
    drawPolylineAnnotation(annotation, categoryColor, selectedColor, isDraft);
    return;
  }

  drawRectangleAnnotation(annotation, isDraft);
}

function lightenColor(hex, percent) {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = (num >> 8 & 0x00FF) + amt;
  const B = (num & 0x0000FF) + amt;
  return "#" + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
}

function rgbaFromHex(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function drawRectangleAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const x = placement.x + annotation.x * placement.scale;
  const y = placement.y + annotation.y * placement.scale;
  const width = annotation.width * placement.scale;
  const height = annotation.height * placement.scale;

  const categoryColor = getAnnotationCategoryColor(annotation);
  const selectedColor = lightenColor(categoryColor, 20);
  const fillAlpha = isDraft ? 0.12 : 0.18;

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? selectedColor : categoryColor;
  ctx.fillStyle = rgbaFromHex(categoryColor, fillAlpha);
  ctx.strokeRect(x, y, width, height);
  ctx.fillRect(x, y, width, height);
  
  if (selected) {
    drawVertex(x, y, true);
    drawVertex(x + width, y, true);
    drawVertex(x + width, y + height, true);
    drawVertex(x, y + height, true);
  }
  
  drawLabel(x, Math.max(placement.y, y - 28), getAnnotationLabel(annotation));
  ctx.restore();
}

function drawPolylineAnnotation(annotation, strokeColor, selectedColor) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const points = (annotation.points || []).map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineWidth = selected ? 4 : 3;
  ctx.strokeStyle = selected ? selectedColor : strokeColor;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();

  if (annotation.type === "line") {
    points.forEach((point) => drawVertex(point.x, point.y, selected));
  }

  const centroid = getPolygonCentroid(points);
  drawLabel(centroid.x - 36, centroid.y - 18, getAnnotationLabel(annotation));
  ctx.restore();
}

function drawPolygonAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const points = annotation.points.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  if (points.length < 2) {
    return;
  }

  const categoryColor = getAnnotationCategoryColor(annotation);
  const selectedColor = lightenColor(categoryColor, 20);
  const fillAlpha = isDraft ? 0.12 : 0.22;

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? selectedColor : categoryColor;
  ctx.fillStyle = rgbaFromHex(categoryColor, fillAlpha);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, selected));

  const centroid = getPolygonCentroid(points);
  drawLabel(centroid.x - 36, centroid.y - 18, getAnnotationLabel(annotation));
  ctx.restore();
}

function drawPolygonDraft() {
  const placement = state.imagePlacement;
  const points = state.polygonPoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  if (!points.length) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#8ae35f";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  if (state.draftAnnotation?.type === "polygon-preview") {
    const previewX = placement.x + state.draftAnnotation.previewPoint.x * placement.scale;
    const previewY = placement.y + state.draftAnnotation.previewPoint.y * placement.scale;
    ctx.lineTo(previewX, previewY);
  }
  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, false));
  ctx.restore();
}

function drawLineDraft() {
  const placement = state.imagePlacement;
  const points = state.linePoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  if (!points.length) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#55d5ff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  if (state.draftAnnotation?.type === "line-preview") {
    const previewX = placement.x + state.draftAnnotation.previewPoint.x * placement.scale;
    const previewY = placement.y + state.draftAnnotation.previewPoint.y * placement.scale;
    ctx.lineTo(previewX, previewY);
  }
  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, false));
  ctx.restore();
}

function drawBrushDraft() {
  const placement = state.imagePlacement;
  const points = state.brushPoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#ff6b9d";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawScaleLine() {
  if (state.scaleLinePoints.length === 0) {
    return;
  }

  const placement = state.imagePlacement;
  const points = state.scaleLinePoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  ctx.save();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "#9d4edd";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 1 && state.scaleDraft) {
    const previewX = placement.x + state.scaleDraft.previewPoint.x * placement.scale;
    const previewY = placement.y + state.scaleDraft.previewPoint.y * placement.scale;
    ctx.lineTo(previewX, previewY);
    drawVertex(previewX, previewY, false);
    const length = Math.hypot(
      state.scaleDraft.previewPoint.x - state.scaleLinePoints[0].x,
      state.scaleDraft.previewPoint.y - state.scaleLinePoints[0].y
    );
    const labelX = (points[0].x + previewX) / 2;
    const labelY = Math.min(points[0].y, previewY) - 28;
    drawLabel(labelX - 30, labelY, `${Math.round(length)} px`);
  } else if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    drawVertex(points[1].x, points[1].y, false);
    const length = Math.hypot(
      points[1].x - points[0].x,
      points[1].y - points[0].y
    );
    const labelX = (points[0].x + points[1].x) / 2;
    const labelY = Math.min(points[0].y, points[1].y) - 28;
    drawLabel(labelX - 30, labelY, `标定: ${Math.round(
      Math.hypot(
        state.scaleLinePoints[1].x - state.scaleLinePoints[0].x,
        state.scaleLinePoints[1].y - state.scaleLinePoints[0].y
      )
    )} px`);
  }

  ctx.stroke();
  drawVertex(points[0].x, points[0].y, false);
  ctx.restore();
}

function drawVertex(x, y, selected) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = selected ? "#fff1c9" : "#ffffff";
  ctx.arc(x, y, selected ? 5 : 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLabel(x, y, label) {
  const safeX = Math.max(12, Math.min(x, canvasCssWidth - 220));
  const safeY = Math.max(12, Math.min(y, canvasCssHeight - 36));
  ctx.font = '600 13px "Aptos", "Segoe UI Variable Text", sans-serif';
  const textWidth = ctx.measureText(label).width;
  ctx.fillStyle = "rgba(10, 16, 19, 0.86)";
  ctx.fillRect(safeX, safeY, textWidth + 18, 24);
  ctx.fillStyle = "#fff3e8";
  ctx.fillText(label, safeX + 9, safeY + 17);
}

function pointerToImageCoordinates(event) {
  if (!state.imagePlacement) {
    return null;
  }

  const bounds = elements.canvas.getBoundingClientRect();
  const canvasX = event.clientX - bounds.left;
  const canvasY = event.clientY - bounds.top;
  const placement = state.imagePlacement;

  const insideX = canvasX >= placement.x && canvasX <= placement.x + placement.width;
  const insideY = canvasY >= placement.y && canvasY <= placement.y + placement.height;
  if (!insideX || !insideY) {
    return null;
  }

  return {
    x: (canvasX - placement.x) / placement.scale,
    y: (canvasY - placement.y) / placement.scale,
  };
}

function normalizeRectangle(start, end) {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  const activeCategory = getActiveCategory();
  const annotation = {
    id: crypto.randomUUID(),
    type: "rectangle",
    name: "",
    categoryId: activeCategory && activeCategory.shapeType === "rectangle" ? activeCategory.id : null,
    color: activeCategory && activeCategory.shapeType === "rectangle" ? activeCategory.color : "#ff8f62",
    showMeasurements: activeCategory && activeCategory.shapeType === "rectangle" ? activeCategory.showMeasurements : true,
    exportIncluded: activeCategory && activeCategory.shapeType === "rectangle" ? activeCategory.exportIncluded : true,
    x,
    y,
    width,
    height,
    area: width * height,
  };
  
  if (activeCategory && activeCategory.shapeType === "rectangle") {
    annotation.name = generateNextCategoryName(activeCategory);
    saveTemplatesToCurrentTask();
  }
  
  return annotation;
}

function createLineAnnotation(points) {
  const activeCategory = getActiveCategory();
  const annotation = {
    id: crypto.randomUUID(),
    type: "line",
    name: "",
    categoryId: activeCategory && activeCategory.shapeType === "line" ? activeCategory.id : null,
    color: activeCategory && activeCategory.shapeType === "line" ? activeCategory.color : "#55d5ff",
    showMeasurements: activeCategory && activeCategory.shapeType === "line" ? activeCategory.showMeasurements : true,
    exportIncluded: activeCategory && activeCategory.shapeType === "line" ? activeCategory.exportIncluded : true,
    points,
    length: getPolylineLength(points),
  };
  
  if (activeCategory && activeCategory.shapeType === "line") {
    annotation.name = generateNextCategoryName(activeCategory);
    saveTemplatesToCurrentTask();
  }
  
  return annotation;
}

function createPolygonAnnotation(points) {
  const activeCategory = getActiveCategory();
  const annotation = {
    id: crypto.randomUUID(),
    type: "polygon",
    name: "",
    categoryId: activeCategory && activeCategory.shapeType === "polygon" ? activeCategory.id : null,
    color: activeCategory && activeCategory.shapeType === "polygon" ? activeCategory.color : "#8ae35f",
    showMeasurements: activeCategory && activeCategory.shapeType === "polygon" ? activeCategory.showMeasurements : true,
    exportIncluded: activeCategory && activeCategory.shapeType === "polygon" ? activeCategory.exportIncluded : true,
    points,
    area: getPolygonArea(points),
    perimeter: getPolygonPerimeter(points),
  };
  
  if (activeCategory && activeCategory.shapeType === "polygon") {
    annotation.name = generateNextCategoryName(activeCategory);
    saveTemplatesToCurrentTask();
  }
  
  return annotation;
}

function createBrushAnnotation(points) {
  const activeCategory = getActiveCategory();
  const annotation = {
    id: crypto.randomUUID(),
    type: "brush",
    name: "",
    categoryId: activeCategory && activeCategory.shapeType === "brush" ? activeCategory.id : null,
    color: activeCategory && activeCategory.shapeType === "brush" ? activeCategory.color : "#ff6b9d",
    showMeasurements: activeCategory && activeCategory.shapeType === "brush" ? activeCategory.showMeasurements : true,
    exportIncluded: activeCategory && activeCategory.shapeType === "brush" ? activeCategory.exportIncluded : true,
    points,
    length: getPolylineLength(points),
  };
  
  if (activeCategory && activeCategory.shapeType === "brush") {
    annotation.name = generateNextCategoryName(activeCategory);
    saveTemplatesToCurrentTask();
  }
  
  return annotation;
}

function getPolylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return length;
}

function getPolygonArea(points) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return Math.abs(area) / 2;
}

function getPolygonPerimeter(points) {
  let perimeter = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    perimeter += Math.hypot(next.x - current.x, next.y - current.y);
  }
  return perimeter;
}

function getPolygonCentroid(points) {
  const total = points.reduce(
    (accumulator, point) => ({
      x: accumulator.x + point.x,
      y: accumulator.y + point.y,
    }),
    { x: 0, y: 0 }
  );

  return {
    x: total.x / points.length,
    y: total.y / points.length,
  };
}

function normalizeScaleUnit(unit) {
  const normalized = String(unit ?? "").replace(/\s+/g, " ").trim();
  return (normalized || "cm").slice(0, 24);
}

function isPresetScaleUnit(unit) {
  return presetScaleUnits.has(normalizeScaleUnit(unit));
}

function syncScaleUnitInputs(unit = "cm") {
  if (!elements.scaleUnitSelect || !elements.scaleUnitCustomRow || !elements.scaleUnitCustomInput) {
    return;
  }

  if (String(unit ?? "").trim() === "custom") {
    elements.scaleUnitSelect.value = "custom";
    elements.scaleUnitCustomRow.classList.remove("hidden");
    return;
  }

  const normalized = normalizeScaleUnit(unit);
  if (isPresetScaleUnit(normalized)) {
    elements.scaleUnitSelect.value = normalized;
    elements.scaleUnitCustomInput.value = "";
    elements.scaleUnitCustomRow.classList.add("hidden");
    return;
  }

  elements.scaleUnitSelect.value = "custom";
  elements.scaleUnitCustomInput.value = normalized;
  elements.scaleUnitCustomRow.classList.remove("hidden");
}

function getSelectedScaleUnit() {
  if (!elements.scaleUnitSelect) {
    return "cm";
  }

  if (elements.scaleUnitSelect.value === "custom") {
    return normalizeScaleUnit(elements.scaleUnitCustomInput?.value);
  }

  return normalizeScaleUnit(elements.scaleUnitSelect.value);
}

function createDefaultScaleState(unit = "cm") {
  return {
    enabled: false,
    pixels: 0,
    realLength: 0,
    unit: normalizeScaleUnit(unit),
    pixelPerUnit: 0,
  };
}

function hasActiveScale() {
  return state.scale.enabled && state.scale.pixelPerUnit > 0;
}

function getAnnotationLabel(annotation) {
  const prefix = annotation.name ? `${annotation.name}` : "";
  const showMeasurements = shouldShowMeasurements(annotation);
  
  if (!showMeasurements) {
    return prefix || getShapeTypeLabel(annotation.type);
  }

  const scaleEnabled = hasActiveScale();
  const unit = getUnitLabel(state.scale.unit);

  if (annotation.type === "line") {
    const pixelLabel = `${Math.round(annotation.length)} px`;
    if (scaleEnabled) {
      const realLength = getRealLength(annotation.length);
      const realLabel = formatRealLength(realLength, unit);
      return prefix ? `${prefix} · ${pixelLabel} / ${realLabel}` : `折线 ${pixelLabel} / ${realLabel}`;
    }
    return prefix ? `${prefix} · ${pixelLabel}` : `折线 ${pixelLabel}`;
  }

  if (annotation.type === "polygon") {
    const pixelLabel = `${Math.round(annotation.area)} px²`;
    if (scaleEnabled) {
      const realArea = getRealArea(annotation.area);
      const realLabel = formatRealArea(realArea, unit);
      return prefix ? `${prefix} · ${pixelLabel} / ${realLabel}` : `多边形 ${pixelLabel} / ${realLabel}`;
    }
    return prefix ? `${prefix} · ${pixelLabel}` : `多边形 ${pixelLabel}`;
  }

  if (annotation.type === "brush") {
    const pixelLabel = `${Math.round(annotation.length)} px`;
    if (scaleEnabled) {
      const realLength = getRealLength(annotation.length);
      const realLabel = formatRealLength(realLength, unit);
      return prefix ? `${prefix} · ${pixelLabel} / ${realLabel}` : `画笔 ${pixelLabel} / ${realLabel}`;
    }
    return prefix ? `${prefix} · ${pixelLabel}` : `画笔 ${pixelLabel}`;
  }

  const pixelLabel = `${Math.round(annotation.width)} × ${Math.round(annotation.height)} px`;
  if (scaleEnabled) {
    const realWidth = getRealLength(annotation.width);
    const realHeight = getRealLength(annotation.height);
    const realLabel = `${formatRealLength(realWidth, unit)} × ${formatRealLength(realHeight, unit)}`;
    return prefix ? `${prefix} · ${pixelLabel} / ${realLabel}` : pixelLabel;
  }
  return prefix ? `${prefix} · ${pixelLabel}` : pixelLabel;
}

function getAnnotationSummary(annotation) {
  const prefix = annotation.name ? `${annotation.name} · ` : "";
  const scaleEnabled = hasActiveScale();
  const unit = getUnitLabel(state.scale.unit);

  if (annotation.type === "line") {
    const pixelLength = Math.round(annotation.length);
    let title = `${prefix}折线 ${pixelLength} px`;
    let meta = `${annotation.points.length} 个点，总长度 ${pixelLength} px`;
    let selection = `${pixelLength} px`;

    if (scaleEnabled) {
      const realLength = getRealLength(annotation.length);
      const realLabel = formatRealLength(realLength, unit);
      title = `${prefix}折线 ${pixelLength} px / ${realLabel}`;
      meta = `${annotation.points.length} 个点，总长度 ${pixelLength} px / ${realLabel}`;
      selection = `${pixelLength} px / ${realLabel}`;
    }

    return { title, meta, selection };
  }

  if (annotation.type === "polygon") {
    const pixelArea = Math.round(annotation.area);
    const pixelPerimeter = Math.round(annotation.perimeter);
    let title = `${prefix}多边形 ${pixelArea} px²`;
    let meta = `${annotation.points.length} 个顶点，周长 ${pixelPerimeter} px`;
    let selection = `${pixelArea} px²`;

    if (scaleEnabled) {
      const realArea = getRealArea(annotation.area);
      const realPerimeter = getRealLength(annotation.perimeter);
      const realAreaLabel = formatRealArea(realArea, unit);
      const realPerimeterLabel = formatRealLength(realPerimeter, unit);
      title = `${prefix}多边形 ${pixelArea} px² / ${realAreaLabel}`;
      meta = `${annotation.points.length} 个顶点，周长 ${pixelPerimeter} px / ${realPerimeterLabel}`;
      selection = `${pixelArea} px² / ${realAreaLabel}`;
    }

    return { title, meta, selection };
  }

  if (annotation.type === "brush") {
    const pixelLength = Math.round(annotation.length);
    let title = `${prefix}画笔 ${pixelLength} px`;
    let meta = `${annotation.points.length} 个点，自由路径长度 ${pixelLength} px`;
    let selection = `${pixelLength} px`;

    if (scaleEnabled) {
      const realLength = getRealLength(annotation.length);
      const realLabel = formatRealLength(realLength, unit);
      title = `${prefix}画笔 ${pixelLength} px / ${realLabel}`;
      meta = `${annotation.points.length} 个点，自由路径长度 ${pixelLength} px / ${realLabel}`;
      selection = `${pixelLength} px / ${realLabel}`;
    }

    return { title, meta, selection };
  }

  const pixelWidth = Math.round(annotation.width);
  const pixelHeight = Math.round(annotation.height);
  const pixelArea = Math.round(annotation.area);
  let title = `${prefix}${pixelWidth} × ${pixelHeight} px`;
  let meta = `面积 ${pixelArea} px²，起点 (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`;
  let selection = `${pixelWidth} × ${pixelHeight} px`;

  if (scaleEnabled) {
    const realWidth = getRealLength(annotation.width);
    const realHeight = getRealLength(annotation.height);
    const realArea = getRealArea(annotation.area);
    const realDimLabel = `${formatRealLength(realWidth, unit)} × ${formatRealLength(realHeight, unit)}`;
    const realAreaLabel = formatRealArea(realArea, unit);
    title = `${prefix}${pixelWidth} × ${pixelHeight} px / ${realDimLabel}`;
    meta = `面积 ${pixelArea} px² / ${realAreaLabel}，起点 (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`;
    selection = `${pixelWidth} × ${pixelHeight} px / ${realDimLabel}`;
  }

  return { title, meta, selection };
}

function getUnitLabel(unit) {
  return normalizeScaleUnit(unit);
}

function getRealLength(pixelLength) {
  if (!state.scale.enabled || state.scale.pixelPerUnit <= 0) {
    return null;
  }
  return pixelLength / state.scale.pixelPerUnit;
}

function getRealArea(pixelArea) {
  if (!state.scale.enabled || state.scale.pixelPerUnit <= 0) {
    return null;
  }
  return pixelArea / (state.scale.pixelPerUnit * state.scale.pixelPerUnit);
}

function formatRealLength(length, unit) {
  if (length === null || length === undefined) {
    return "";
  }
  const label = getUnitLabel(unit);
  if (Math.abs(length) < 0.01) {
    return `0 ${label}`;
  }
  if (Math.abs(length) >= 100) {
    return `${length.toFixed(1)} ${label}`;
  }
  return `${length.toFixed(2)} ${label}`;
}

function formatRealArea(area, unit) {
  if (area === null || area === undefined) {
    return "";
  }
  const label = getUnitLabel(unit);
  if (Math.abs(area) < 0.0001) {
    return `0 ${label}²`;
  }
  if (Math.abs(area) >= 100) {
    return `${area.toFixed(1)} ${label}²`;
  }
  return `${area.toFixed(2)} ${label}²`;
}

function updateScalePanel() {
  if (!elements.scalePanel) {
    return;
  }

  const shouldShow = state.currentTool === "scale" || state.scale.enabled;
  if (shouldShow) {
    elements.scalePanel.classList.remove("hidden");
  } else {
    elements.scalePanel.classList.add("hidden");
  }

  if (state.scale.enabled) {
    elements.scaleInfo.classList.remove("hidden");
    elements.scaleStatus.textContent = "已标定";
    elements.scalePixels.textContent = `${Math.round(state.scale.pixels)} px`;
    elements.scaleReal.textContent = formatRealLength(state.scale.realLength, state.scale.unit);
    
    let ratioDisplay;
    if (state.scale.pixelPerUnit < 0.01) {
      ratioDisplay = state.scale.pixelPerUnit.toFixed(6);
    } else if (state.scale.pixelPerUnit < 1) {
      ratioDisplay = state.scale.pixelPerUnit.toFixed(4);
    } else if (state.scale.pixelPerUnit >= 1000) {
      ratioDisplay = state.scale.pixelPerUnit.toFixed(0);
    } else if (state.scale.pixelPerUnit >= 100) {
      ratioDisplay = state.scale.pixelPerUnit.toFixed(1);
    } else {
      ratioDisplay = state.scale.pixelPerUnit.toFixed(2);
    }
    elements.scaleRatio.textContent = `${ratioDisplay} px/${getUnitLabel(state.scale.unit)}`;
    elements.scaleHint.textContent = "比例标定已生效，所有标注将同时显示像素值和真实单位。";
  } else {
    elements.scaleInfo.classList.add("hidden");
    elements.scaleStatus.textContent = "未标定";
    elements.scalePixels.textContent = "0 px";
    const unitLabel = getUnitLabel(state.scale.unit);
    elements.scaleReal.textContent = `0 ${unitLabel}`;
    elements.scaleRatio.textContent = `0 px/${unitLabel}`;
    elements.scaleHint.textContent = "在图片上绘制一条已知长度的参考线，建立像素与真实单位的换算关系。";
  }
}

function resetScaleState() {
  state.scaleLinePoints = [];
  state.scaleDraft = null;
  state.pendingScalePixels = 0;
}

function clearScale() {
  state.scale = createDefaultScaleState(state.scale.unit);
  if (session.isBatchSession && session.shareScale) {
    syncSharedScaleToAllTasks(state.scale);
  }
  resetScaleState();
  updateScalePanel();
  renderAnnotationList();
  drawScene();
  setStatus("已清除比例标定，所有标注将只显示像素值。");
}

function showScaleModal(pixelLength) {
  if (!elements.scaleModalOverlay || !elements.scaleLengthInput || !elements.scalePreviewLength) {
    return;
  }

  state.pendingScalePixels = pixelLength;
  elements.scaleLengthInput.value = "";
  syncScaleUnitInputs(state.scale.unit);
  elements.scalePreviewLength.textContent = `${Math.round(pixelLength)} px`;
  elements.scaleModalOverlay.classList.remove("hidden");
  elements.scaleLengthInput.focus();
}

function hideScaleModal() {
  if (elements.scaleModalOverlay) {
    elements.scaleModalOverlay.classList.add("hidden");
  }
  resetScaleState();
  drawScene();
}

function confirmScale() {
  if (!elements.scaleLengthInput || !elements.scaleUnitSelect) {
    return;
  }

  const length = parseFloat(elements.scaleLengthInput.value);
  const unit = getSelectedScaleUnit();
  const pendingPixels = state.pendingScalePixels;

  if (isNaN(length) || length <= 0) {
    setStatus("请输入有效的真实长度值。", "error");
    return;
  }

  if (elements.scaleUnitSelect.value === "custom" && !(elements.scaleUnitCustomInput?.value || "").trim()) {
    setStatus("请输入自定义单位。", "error");
    elements.scaleUnitCustomInput?.focus();
    return;
  }

  state.scale = {
    enabled: true,
    pixels: pendingPixels,
    realLength: length,
    unit: unit,
    pixelPerUnit: pendingPixels / length,
  };
  if (session.isBatchSession && session.shareScale) {
    syncSharedScaleToAllTasks(state.scale);
  }

  if (elements.scaleModalOverlay) {
    elements.scaleModalOverlay.classList.add("hidden");
  }
  resetScaleState();
  updateScalePanel();
  renderAnnotationList();
  drawScene();
  setStatus(`比例标定已设置：${Math.round(pendingPixels)} px = ${formatRealLength(length, unit)}`);
}

function updateToolButtons() {
  elements.toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.currentTool);
  });
}

function updateDisplayModeButtons() {
  elements.displayModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.displayMode === state.displayMode);
  });
}

function setDisplayMode(mode) {
  if (state.displayMode === mode) {
    return;
  }

  state.displayMode = mode;
  updateDisplayModeButtons();

  if (state.image) {
    state.imageOffset = { x: 0, y: 0 };
    computeImagePlacement();
    drawScene();
    setStatus(`已切换到${mode === "actual" ? "100% 实际像素" : "适应画布"}显示模式。`);
  }
}

function pushUndoAdd(annotation) {
  state.undoStack.push({
    action: "add",
    annotation: structuredClone(annotation),
  });
}

function pushUndoModify(originalAnnotation, modifiedAnnotation) {
  state.undoStack.push({
    action: "modify",
    original: structuredClone(originalAnnotation),
    modified: structuredClone(modifiedAnnotation),
  });
}

function pushUndoDelete(annotation) {
  state.undoStack.push({
    action: "delete",
    annotation: structuredClone(annotation),
    index: state.annotations.findIndex((a) => a.id === annotation.id),
  });
}

function resetDraftState() {
  state.drawing = false;
  state.pointerStart = null;
  state.draftAnnotation = null;
  state.polygonPoints = [];
  state.linePoints = [];
  state.brushPoints = [];
}

function resetEditState() {
  state.editing = false;
  state.editMode = null;
  state.editHandleIndex = null;
  state.editOriginalAnnotation = null;
  state.editStartPoint = null;
}

function getRectangleCorners(annotation) {
  return [
    { x: annotation.x, y: annotation.y },
    { x: annotation.x + annotation.width, y: annotation.y },
    { x: annotation.x + annotation.width, y: annotation.y + annotation.height },
    { x: annotation.x, y: annotation.y + annotation.height },
  ];
}

function isPointInRectangle(point, annotation) {
  return (
    point.x >= annotation.x &&
    point.x <= annotation.x + annotation.width &&
    point.y >= annotation.y &&
    point.y <= annotation.y + annotation.height
  );
}

function isPointNearVertex(point, vertex, threshold = 8) {
  return Math.hypot(point.x - vertex.x, point.y - vertex.y) <= threshold;
}

function findHitAnnotation(point) {
  for (let index = state.annotations.length - 1; index >= 0; index -= 1) {
    const annotation = state.annotations[index];
    
    if (annotation.type === "rectangle") {
      if (isPointInRectangle(point, annotation)) {
        return annotation;
      }
    } else if (annotation.type === "polygon") {
      if (isPointInPolygon(point, annotation.points)) {
        return annotation;
      }
    } else if (annotation.type === "line" || annotation.type === "brush") {
      if (isPointNearPolyline(point, annotation.points, 6)) {
        return annotation;
      }
    }
  }
  return null;
}

function isPointInPolygon(point, vertices) {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointNearPolyline(point, points, threshold) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const distance = pointToSegmentDistance(point, points[index], points[index + 1]);
    if (distance <= threshold) {
      return true;
    }
  }
  return false;
}

function pointToSegmentDistance(point, segmentStart, segmentEnd) {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;
  
  if (lengthSquared === 0) {
    return Math.hypot(point.x - segmentStart.x, point.y - segmentStart.y);
  }
  
  let t = ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));
  
  const projectionX = segmentStart.x + t * dx;
  const projectionY = segmentStart.y + t * dy;
  
  return Math.hypot(point.x - projectionX, point.y - projectionY);
}

function findHitHandle(point, annotation) {
  if (!annotation) return null;
  
  if (annotation.type === "rectangle") {
    const corners = getRectangleCorners(annotation);
    for (let index = 0; index < corners.length; index += 1) {
      if (isPointNearVertex(point, corners[index], 8)) {
        return { type: "corner", index };
      }
    }
  } else if (annotation.type === "polygon" || annotation.type === "line") {
    for (let index = 0; index < annotation.points.length; index += 1) {
      if (isPointNearVertex(point, annotation.points[index], 8)) {
        return { type: "vertex", index };
      }
    }
  }
  
  return null;
}

function updateAnnotationMetrics(annotation) {
  if (annotation.type === "rectangle") {
    annotation.area = annotation.width * annotation.height;
  } else if (annotation.type === "line" || annotation.type === "brush") {
    annotation.length = getPolylineLength(annotation.points);
  } else if (annotation.type === "polygon") {
    annotation.area = getPolygonArea(annotation.points);
    annotation.perimeter = getPolygonPerimeter(annotation.points);
  }
}

function normalizeLoadedPoint(point) {
  if (!point || typeof point !== "object") {
    return null;
  }

  const x = Number(point.x);
  const y = Number(point.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }

  return { x, y };
}

function normalizeLoadedAnnotation(annotation) {
  if (!annotation || typeof annotation !== "object") {
    return null;
  }

  const normalized = {
    id: annotation.id || crypto.randomUUID(),
    type: String(annotation.type || "rectangle"),
    name: typeof annotation.name === "string" ? annotation.name : "",
    categoryId: annotation.categoryId || null,
    color: annotation.color || null,
  };

  if (annotation.showMeasurements !== undefined && annotation.showMeasurements !== null) {
    normalized.showMeasurements = Boolean(annotation.showMeasurements);
  }
  if (annotation.exportIncluded !== undefined && annotation.exportIncluded !== null) {
    normalized.exportIncluded = Boolean(annotation.exportIncluded);
  }

  if (normalized.type === "rectangle") {
    const x = Number(annotation.x);
    const y = Number(annotation.y);
    const width = Number(annotation.width);
    const height = Number(annotation.height);
    if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
      return null;
    }

    normalized.x = x;
    normalized.y = y;
    normalized.width = width;
    normalized.height = height;
    updateAnnotationMetrics(normalized);
    return normalized;
  }

  if (normalized.type === "line" || normalized.type === "polygon" || normalized.type === "brush") {
    const points = Array.isArray(annotation.points)
      ? annotation.points.map(normalizeLoadedPoint).filter(Boolean)
      : [];

    const minPoints = normalized.type === "polygon" ? 3 : 2;
    if (points.length < minPoints) {
      return null;
    }

    normalized.points = points;
    updateAnnotationMetrics(normalized);
    return normalized;
  }

  return null;
}

function normalizeLoadedAnnotations(annotations) {
  if (!Array.isArray(annotations)) {
    return [];
  }

  return annotations.map(normalizeLoadedAnnotation).filter(Boolean);
}

function startEditing(annotation, editMode, handleIndex = null) {
  if (!annotation) return;
  
  state.editing = true;
  state.editMode = editMode;
  state.editHandleIndex = handleIndex;
  state.editOriginalAnnotation = structuredClone(annotation);
}

function finishEditing() {
  if (!state.editing || !state.editOriginalAnnotation) {
    resetEditState();
    return;
  }
  
  const annotation = state.annotations.find((a) => a.id === state.editOriginalAnnotation.id);
  if (annotation) {
    updateAnnotationMetrics(annotation);
    pushUndoModify(state.editOriginalAnnotation, annotation);
    renderAnnotationList();
    drawScene();
    setStatus("已完成编辑，可按 Ctrl+Z 撤销。");
  }
  
  resetEditState();
}

function deleteSelectedAnnotation() {
  if (!state.selectedId) {
    setStatus("请先选择一个标注。", "error");
    return;
  }
  
  const annotation = state.annotations.find((a) => a.id === state.selectedId);
  if (!annotation) {
    setStatus("没有找到当前选中的标注。", "error");
    return;
  }
  
  pushUndoDelete(annotation);
  state.annotations = state.annotations.filter((a) => a.id !== state.selectedId);
  state.selectedId = null;
  resetEditState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus("已删除选中的标注。");
}

function refreshOverlay() {
  const headline = state.imageName || "画布已就绪";
  const message = state.image ? getToolInstructions() : "加载一张本地图片后开始打标。";
  elements.overlay.innerHTML = `<strong>${headline}</strong><span>${message}</span>`;
}

function setCurrentTool(tool) {
  state.currentTool = tool;
  resetDraftState();
  resetScaleState();
  updateToolButtons();
  updateScalePanel();
  refreshOverlay();
  setStatus(getToolInstructions(tool));
  drawScene();
}

function renderTemplateList() {
  const templates = getActiveTemplates();
  const activeId = getActiveTemplateId();

  if (!templates.length) {
    elements.templateSelect.innerHTML = '<option value="">暂无模板</option>';
    return;
  }

  elements.templateSelect.innerHTML = templates
    .map((template) => {
      const selected = template.id === activeId ? "selected" : "";
      const defaultLabel = template.isDefault ? " (默认)" : "";
      return `<option value="${template.id}" ${selected}>${escapeHtml(template.name)}${defaultLabel}</option>`;
    })
    .join("");
}

function renderCategoryList() {
  const categories = getActiveCategories();
  const activeCategoryId = getActiveCategoryId();

  if (!categories.length) {
    elements.categoryList.innerHTML = '<li class="empty-state">暂无类别</li>';
    return;
  }

  elements.categoryList.innerHTML = categories
    .map((category) => {
      const activeClass = category.id === activeCategoryId ? "category-item active" : "category-item";
      const shapeLabel = getShapeTypeLabel(category.shapeType);
      return `
        <li class="${activeClass}" data-id="${category.id}">
          <div class="category-color" style="background-color: ${category.color};"></div>
          <div class="category-info">
            <p class="category-name">${escapeHtml(category.name)}</p>
            <p class="category-meta">${shapeLabel} ${category.namingPattern ? "• " + category.namingPattern : ""}</p>
          </div>
          <div class="category-actions">
            <button class="category-action-btn" type="button" data-category-action="edit" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="category-action-btn" type="button" data-category-action="delete" title="删除">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </li>
      `;
    })
    .join("");
}

function getShapeTypeLabel(shapeType) {
  const labels = {
    rectangle: "矩形",
    polygon: "多边形",
    line: "折线",
    brush: "画笔",
  };
  return labels[shapeType] || "未知";
}

function renderAnnotationList() {
  elements.annotationCount.textContent = String(state.annotations.length);

  if (!state.annotations.length) {
    elements.annotationList.innerHTML = '<li class="empty-state">暂无标注。</li>';
    elements.selectionSize.textContent = "无";
    return;
  }

  elements.annotationList.innerHTML = [...state.annotations]
    .reverse()
    .map((annotation) => {
      const activeClass = annotation.id === state.selectedId ? "annotation-item active" : "annotation-item";
      const summary = getAnnotationSummary(annotation);
      return `
        <li class="${activeClass}" data-id="${annotation.id}">
          <p class="annotation-title">${escapeHtml(summary.title)}</p>
          <p class="annotation-meta">${escapeHtml(summary.meta)}</p>
        </li>
      `;
    })
    .join("");

  const selected = state.annotations.find((annotation) => annotation.id === state.selectedId);
  elements.selectionSize.textContent = selected ? getAnnotationSummary(selected).selection : "无";
}

function selectAnnotation(id) {
  state.selectedId = id;
  renderAnnotationList();
  drawScene();
  updateAnnotationNameEditor();
}

function updateAnnotationNameEditor() {
  if (!state.selectedId) {
    elements.annotationNameEditor.classList.add("hidden");
    elements.annotationNameInput.value = "";
    return;
  }

  const annotation = state.annotations.find((item) => item.id === state.selectedId);
  if (!annotation) {
    elements.annotationNameEditor.classList.add("hidden");
    elements.annotationNameInput.value = "";
    return;
  }

  elements.annotationNameEditor.classList.remove("hidden");
  elements.annotationNameInput.value = annotation.name || "";
}

function saveAnnotationName() {
  if (!state.selectedId) {
    setStatus("请先选择一个标注。", "error");
    return;
  }

  const annotation = state.annotations.find((item) => item.id === state.selectedId);
  if (!annotation) {
    setStatus("没有找到当前选中的标注。", "error");
    return;
  }

  annotation.name = elements.annotationNameInput.value.trim();
  renderAnnotationList();
  drawScene();
  setStatus(annotation.name ? `已更新标注名称：${annotation.name}` : "已清空当前标注名称。");
}

function resetSessionStateForNewImage() {
  state.annotations = [];
  state.selectedId = null;
  state.undoStack = [];
  state.currentSessionPrefix = null;
  state.imageOffset = { x: 0, y: 0 };
  state.displayMode = "fit";
  state.originalImageDataUrl = null;
  state.scale = createDefaultScaleState();
  resetDraftState();
  resetScaleState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  updateDisplayModeButtons();
  updateImagePositionDisplay();
  updateScalePanel();
}

function loadImageFromSource(source, fileName, options = {}) {
  const { imageFile = null, preserveAnnotations = false, afterLoad } = options;
  const image = new Image();

  image.onload = () => {
    state.image = image;
    state.imageName = fileName || "未命名图片";
    state.imageFile = imageFile;

    if (!preserveAnnotations) {
      resetSessionStateForNewImage();
    }

    elements.fileName.textContent = state.imageName;
    elements.imageSize.textContent = `${image.width} × ${image.height}`;
    refreshOverlay();
    computeImagePlacement();
    renderAnnotationList();
    drawScene();

    if (typeof afterLoad === "function") {
      afterLoad();
    }
  };

  image.onerror = () => {
    setStatus("图片加载失败。", "error");
  };

  image.src = source;
}

function nudgeImagePosition(direction) {
  if (!state.image) {
    setStatus("请先加载图片后再调整位置。", "error");
    return;
  }

  const step = 24;
  if (direction === "up") {
    state.imageOffset.y -= step;
  } else if (direction === "down") {
    state.imageOffset.y += step;
  } else if (direction === "left") {
    state.imageOffset.x -= step;
  } else if (direction === "right") {
    state.imageOffset.x += step;
  } else {
    return;
  }

  computeImagePlacement();
  drawScene();
  setStatus(`已调整图片位置：X ${state.imageOffset.x} / Y ${state.imageOffset.y}`);
}

function resetImagePosition() {
  if (!state.image) {
    setStatus("请先加载图片后再复位位置。", "error");
    return;
  }

  state.imageOffset = { x: 0, y: 0 };
  computeImagePlacement();
  drawScene();
  setStatus("已将图片位置恢复到画布中央。");
}

function loadImage(file) {
  if (!file) {
    elements.fileName.textContent = "未选择图片";
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  loadImageFromSource(objectUrl, file.name, {
    imageFile: file,
    preserveAnnotations: false,
    afterLoad: () => {
      setStatus(`图片已加载。${getToolInstructions()}`);
      URL.revokeObjectURL(objectUrl);
    },
  });
}

function drawLabelToContext(targetContext, x, y, label, canvasWidth, canvasHeight) {
  const safeX = Math.max(12, Math.min(x, canvasWidth - 220));
  const safeY = Math.max(12, Math.min(y, canvasHeight - 36));
  targetContext.font = '600 13px "Aptos", "Segoe UI Variable Text", sans-serif';
  const textWidth = targetContext.measureText(label).width;
  targetContext.fillStyle = "rgba(10, 16, 19, 0.86)";
  targetContext.fillRect(safeX, safeY, textWidth + 18, 24);
  targetContext.fillStyle = "#fff3e8";
  targetContext.fillText(label, safeX + 9, safeY + 17);
}

function drawToCanvas(targetContext) {
  if (!state.image) {
    return;
  }

  targetContext.drawImage(state.image, 0, 0);
  const canvasWidth = state.image.width;
  const canvasHeight = state.image.height;

  state.annotations.forEach((annotation) => {
    if (!shouldIncludeInExport(annotation)) {
      return;
    }

    const categoryColor = getAnnotationCategoryColor(annotation);
    const label = getAnnotationLabel(annotation);

    if (annotation.type === "rectangle") {
      const selectedColor = lightenColor(categoryColor, 20);
      targetContext.lineWidth = 3;
      targetContext.strokeStyle = categoryColor;
      targetContext.fillStyle = rgbaFromHex(categoryColor, 0.18);
      targetContext.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      targetContext.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      drawLabelToContext(targetContext, annotation.x, Math.max(0, annotation.y - 28), label, canvasWidth, canvasHeight);
      return;
    }

    if (!annotation.points?.length) {
      return;
    }

    targetContext.lineCap = "round";
    targetContext.lineJoin = "round";
    targetContext.beginPath();
    targetContext.moveTo(annotation.points[0].x, annotation.points[0].y);
    for (let index = 1; index < annotation.points.length; index += 1) {
      targetContext.lineTo(annotation.points[index].x, annotation.points[index].y);
    }

    if (annotation.type === "polygon") {
      const selectedColor = lightenColor(categoryColor, 20);
      targetContext.closePath();
      targetContext.lineWidth = 3;
      targetContext.strokeStyle = categoryColor;
      targetContext.fillStyle = rgbaFromHex(categoryColor, 0.22);
      targetContext.fill();
      targetContext.stroke();
      const centroid = getPolygonCentroid(annotation.points);
      drawLabelToContext(targetContext, centroid.x - 36, Math.max(0, centroid.y - 18), label, canvasWidth, canvasHeight);
      return;
    }

    targetContext.lineWidth = 3;
    targetContext.strokeStyle = categoryColor;
    targetContext.stroke();
    const centroid = getPolygonCentroid(annotation.points);
    drawLabelToContext(targetContext, centroid.x - 36, Math.max(0, centroid.y - 18), label, canvasWidth, canvasHeight);
  });
}

function exportAnnotatedImage() {
  if (!state.image) {
    return null;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = state.image.width;
  tempCanvas.height = state.image.height;
  const tempContext = tempCanvas.getContext("2d");
  drawToCanvas(tempContext);
  return tempCanvas.toDataURL("image/png");
}

function downloadAnnotatedImage() {
  if (!state.image) {
    setStatus("请先加载图片后再导出。", "error");
    return;
  }

  const imageData = exportAnnotatedImage();
  if (!imageData) {
    setStatus("导出 PNG 失败。", "error");
    return;
  }

  const fileBase =
    elements.exportFilename.value.trim() ||
    elements.projectName.value.trim() ||
    "geodraft-export";

  const link = document.createElement("a");
  link.download = `${fileBase}.png`;
  link.href = imageData;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setStatus(`已导出标注图：${link.download}`);
}

function roundMetric(value, digits = 4) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return undefined;
  }
  return Number(value.toFixed(digits));
}

function serializeRealMetrics(annotation) {
  if (!hasActiveScale()) {
    return undefined;
  }

  const realMetrics = {
    unit: getUnitLabel(state.scale.unit),
  };

  if (annotation.type === "rectangle") {
    realMetrics.width = roundMetric(getRealLength(annotation.width));
    realMetrics.height = roundMetric(getRealLength(annotation.height));
    realMetrics.area = roundMetric(getRealArea(annotation.area));
    return realMetrics;
  }

  if (annotation.type === "line" || annotation.type === "brush") {
    realMetrics.length = roundMetric(getRealLength(annotation.length));
    return realMetrics;
  }

  if (annotation.type === "polygon") {
    realMetrics.area = roundMetric(getRealArea(annotation.area));
    realMetrics.perimeter = roundMetric(getRealLength(annotation.perimeter));
    return realMetrics;
  }

  return undefined;
}

function serializeAnnotations() {
  return state.annotations.map((annotation) => ({
    id: annotation.id,
    type: annotation.type,
    name: annotation.name || "",
    categoryId: annotation.categoryId || null,
    color: annotation.color || null,
    showMeasurements: annotation.showMeasurements !== undefined ? annotation.showMeasurements : undefined,
    exportIncluded: annotation.exportIncluded !== undefined ? annotation.exportIncluded : undefined,
    x: annotation.x !== undefined ? Number(annotation.x.toFixed(2)) : undefined,
    y: annotation.y !== undefined ? Number(annotation.y.toFixed(2)) : undefined,
    width: annotation.width !== undefined ? Number(annotation.width.toFixed(2)) : undefined,
    height: annotation.height !== undefined ? Number(annotation.height.toFixed(2)) : undefined,
    area: annotation.area !== undefined ? Number(annotation.area.toFixed(2)) : undefined,
    length: annotation.length !== undefined ? Number(annotation.length.toFixed(2)) : undefined,
    perimeter: annotation.perimeter !== undefined ? Number(annotation.perimeter.toFixed(2)) : undefined,
    points: annotation.points
      ? annotation.points.map((point) => ({
          x: Number(point.x.toFixed(2)),
          y: Number(point.y.toFixed(2)),
        }))
      : undefined,
    realMetrics: serializeRealMetrics(annotation),
  }));
}

function readFileAsDataUrl(file) {
  if (!file) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function saveAnnotations() {
  if (!state.image) {
    setStatus("请先加载图片后再保存。", "error");
    return;
  }

  const annotatedImage = exportAnnotatedImage();
  if (!annotatedImage) {
    setStatus("导出标注图失败，无法保存。", "error");
    return;
  }

  let originalImage = state.originalImageDataUrl;
  if (state.imageFile) {
    try {
      originalImage = await readFileAsDataUrl(state.imageFile);
      state.originalImageDataUrl = originalImage;
    } catch (error) {
      console.warn("Failed to read original image:", error);
    }
  }

  if (session.isBatchSession) {
    const currentTask = getCurrentTask();
    if (currentTask) {
      syncTaskFromState(currentTask);
      if (session.applyProjectToAll) {
        applyProjectSettingsToAllTasks(currentTask);
      }
    }
  }

  const imageTags = elements.imageTags.value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const payload = {
    projectName: elements.projectName.value.trim() || "GeoDraft Prototype",
    projectNotes: elements.projectNotes.value.trim(),
    exportFilename: elements.exportFilename.value.trim(),
    imageTags,
    imageMeta: {
      name: state.imageName,
      width: state.image.width,
      height: state.image.height,
    },
    scale: state.scale.enabled
      ? {
          enabled: state.scale.enabled,
          pixels: Number(state.scale.pixels.toFixed(2)),
          realLength: Number(state.scale.realLength.toFixed(4)),
          unit: state.scale.unit,
          pixelPerUnit: Number(state.scale.pixelPerUnit.toFixed(8)),
        }
      : undefined,
    annotations: serializeAnnotations(),
    ...serializeTemplates(),
    originalImage,
    annotatedImage,
  };

  if (session.isBatchSession) {
    payload.isBatchSession = true;
    payload.batchId = session.batchId;
    payload.batchName = session.batchName;
    payload.taskIndex = session.currentTaskIndex;
    payload.totalTasks = session.tasks.length;
    payload.shareScale = session.shareScale;
    payload.applyProjectToAll = session.applyProjectToAll;
    if (session.sharedScale) {
      payload.sharedScale = {
        enabled: session.sharedScale.enabled,
        pixels: Number(session.sharedScale.pixels.toFixed(2)),
        realLength: Number(session.sharedScale.realLength.toFixed(4)),
        unit: session.sharedScale.unit,
        pixelPerUnit: Number(session.sharedScale.pixelPerUnit.toFixed(8)),
      };
    }
  }

  try {
    setStatus("正在保存项目...");
    const response = await fetch("/api/annotations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "保存失败。");
    }

    await loadHistoryList();
    
    if (session.isBatchSession) {
      markCurrentTaskAsSaved(body.filePrefix);
      setStatus(`已保存 ${state.annotations.length} 个标注到 data/，前缀：${body.filePrefix}。批量任务：${session.currentTaskIndex + 1}/${session.tasks.length}`);
    } else {
      setStatus(`已保存 ${state.annotations.length} 个标注到 data/，前缀：${body.filePrefix}`);
    }
  } catch (error) {
    setStatus(error.message || "保存失败。", "error");
  }
}

async function loadHistoryList() {
  try {
    const response = await fetch("/api/sessions");
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "加载历史失败。");
    }

    state.sessions = body.sessions || [];
    renderHistoryList();
  } catch (error) {
    console.warn("Failed to load history:", error);
    elements.historyList.innerHTML = '<li class="empty-state">历史记录加载失败。</li>';
  }
}

function renderHistoryList() {
  if (!state.sessions.length) {
    elements.historyList.innerHTML = '<li class="empty-state">还没有保存过项目。</li>';
    return;
  }

  elements.historyList.innerHTML = state.sessions
    .map((historySession) => {
      const notePreview = historySession.notes
        ? `${historySession.notes.slice(0, 26)}${historySession.notes.length > 26 ? "..." : ""}`
        : "无备注";
      
      let batchInfoText = "";
      if (historySession.isBatchSession && historySession.batchInfo) {
        const taskIndex = historySession.batchInfo.taskIndex;
        const totalTasks = historySession.batchInfo.totalTasks;
        if (taskIndex !== undefined && totalTasks !== undefined) {
          batchInfoText = `批量任务 ${taskIndex + 1}/${totalTasks}`;
        }
      }

      return `
        <li class="history-item" data-filename="${historySession.filePrefix}">
          <div class="history-item-header">
            <p class="history-item-title">${escapeHtml(historySession.projectName)}</p>
            <button
              class="history-delete-button"
              type="button"
              data-delete-prefix="${historySession.filePrefix}"
              aria-label="删除 ${escapeHtml(historySession.projectName)}"
              title="删除这条历史"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M4 7h16M9 7V5h6v2M10 11v6M14 11v6M7 7l1 12h8l1-12"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.8"
                ></path>
              </svg>
            </button>
          </div>
          <p class="history-item-meta">
            <span>${formatDate(historySession.savedAt)}</span>
            <span>${historySession.annotationCount} 个标注</span>
            ${batchInfoText ? `<span>${batchInfoText}</span>` : ""}
          </p>
          <p class="history-item-meta">
            <span>${escapeHtml(historySession.imageName || "未记录图片名")}</span>
            <span>${escapeHtml(notePreview)}</span>
          </p>
        </li>
      `;
    })
    .join("");
}

async function loadSession(filePrefix) {
  try {
    setStatus("正在加载历史项目...");
    const response = await fetch(`/api/sessions/${encodeURIComponent(filePrefix)}`);
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "加载历史项目失败。");
    }

    const isBatchSession = Boolean(body.isBatchSession);
    const batchId = body.batchId;

    if (isBatchSession && batchId) {
      const batchResponse = await fetch(`/api/batches/${encodeURIComponent(batchId)}`);
      const batchData = await batchResponse.json();

      if (batchResponse.ok && batchData.tasks && batchData.tasks.length > 1) {
        const choice = window.confirm(
          `检测到这是一个批量任务的一部分，共 ${batchData.tasks.length} 张图片已保存。\n\n` +
          `点击"确定"恢复整个批次（重建任务队列）\n` +
          `点击"取消"仅恢复当前这张图片（单图模式）`
        );

        if (choice) {
          await loadBatchSessionFromHistory(batchData, body, filePrefix);
          return;
        }
      }
    }

    loadSingleTaskFromHistory(body, filePrefix);
  } catch (error) {
    setStatus(error.message || "加载历史项目失败。", "error");
  }
}

function loadSingleTaskFromHistory(body, filePrefix) {
  if (session.isBatchSession) {
    if (!window.confirm("当前处于批量模式，加载单图历史项目将退出批量模式。是否继续？")) {
      return;
    }
    exitBatchSession();
  }

  session.applyProjectToAll = false;

  elements.projectName.value = body.projectName || "GeoDraft Prototype";
  elements.projectNotes.value = body.projectNotes || "";
  elements.exportFilename.value = body.exportFilename || "";
  elements.imageTags.value = Array.isArray(body.imageTags) ? body.imageTags.join(", ") : "";
  state.imageOffset = { x: 0, y: 0 };
  state.displayMode = "fit";
  state.currentSessionPrefix = filePrefix;
  state.originalImageDataUrl = body.originalImage || null;
  state.annotations = normalizeLoadedAnnotations(body.annotations);
  state.selectedId = null;
  state.undoStack = [];

  if (body.scale && body.scale.enabled) {
    state.scale = {
      enabled: Boolean(body.scale.enabled),
      pixels: Number(body.scale.pixels) || 0,
      realLength: Number(body.scale.realLength) || 0,
      unit: normalizeScaleUnit(body.scale.unit),
      pixelPerUnit: Number(body.scale.pixelPerUnit) || 0,
    };
  } else {
    state.scale = createDefaultScaleState();
  }

  applyTemplatesState(body.templates, body.activeTemplateId, body.activeCategoryId, { preserveCurrentOnMissing: true });
  renderTemplateList();
  renderCategoryList();
  updateToolButtons();
  if (Array.isArray(body.templates) && body.templates.length > 0) {
    saveTemplatesToStorage();
  }

  resetDraftState();
  resetScaleState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  updateDisplayModeButtons();
  updateScalePanel();

  const imageMeta = body.imageMeta || {};
  const preferredImage = state.originalImageDataUrl || body.annotatedImage;

  if (preferredImage) {
    loadImageFromSource(preferredImage, imageMeta.name || "已恢复图片", {
      preserveAnnotations: true,
      imageFile: null,
      afterLoad: () => {
        let message = body.originalImage
          ? `已加载历史项目：${elements.projectName.value}`
          : `已加载历史项目：${elements.projectName.value}。当前显示的是已标注预览图。`;
        if (state.scale.enabled) {
          message += ` 比例标定已恢复：${Math.round(state.scale.pixels)} px = ${formatRealLength(state.scale.realLength, state.scale.unit)}`;
        }
        setStatus(message);
      },
    });
    return;
  }

  state.image = null;
  state.imageName = imageMeta.name || "";
  state.imageFile = null;
  state.imagePlacement = null;
  elements.fileName.textContent = imageMeta.name || "未恢复原图";
  elements.imageSize.textContent =
    imageMeta.width && imageMeta.height ? `${imageMeta.width} × ${imageMeta.height}` : "无文件";
  refreshOverlay();
  drawScene();
  setStatus("标注数据已恢复，但没有找到图片文件，请重新选择原图。", "error");
}

async function loadBatchSessionFromHistory(batchData, currentTaskData, currentFilePrefix) {
  if (hasAnyUnsavedChanges()) {
    if (!window.confirm("当前有未保存的更改，恢复批次历史项目将丢失这些更改。是否继续？")) {
      return;
    }
  }

  const batchInfo = batchData.batchInfo || {};
  const tasks = batchData.tasks || [];

  if (tasks.length === 0) {
    setStatus("批次中没有找到任务数据。", "error");
    return;
  }

  session.isBatchSession = true;
  session.batchId = batchData.batchId;
  session.batchName = currentTaskData.batchName || `历史批次 ${batchData.batchId.slice(0, 8)}`;
  session.shareScale = Boolean(batchInfo.shareScale ?? currentTaskData.shareScale);
  session.applyProjectToAll = Boolean(batchInfo.applyProjectToAll ?? currentTaskData.applyProjectToAll);
  
  if (currentTaskData.sharedScale && currentTaskData.sharedScale.enabled) {
    session.sharedScale = {
      enabled: Boolean(currentTaskData.sharedScale.enabled),
      pixels: Number(currentTaskData.sharedScale.pixels) || 0,
      realLength: Number(currentTaskData.sharedScale.realLength) || 0,
      unit: normalizeScaleUnit(currentTaskData.sharedScale.unit),
      pixelPerUnit: Number(currentTaskData.sharedScale.pixelPerUnit) || 0,
    };
  } else {
    session.sharedScale = null;
  }

  session.tasks = [];
  let currentTaskIndex = 0;

  for (let i = 0; i < tasks.length; i++) {
    const taskInfo = tasks[i];
    let fullTaskData = null;

    if (taskInfo.filePrefix === currentFilePrefix) {
      fullTaskData = currentTaskData;
      currentTaskIndex = i;
    } else {
      try {
        const taskResponse = await fetch(`/api/sessions/${encodeURIComponent(taskInfo.filePrefix)}`);
        if (taskResponse.ok) {
          fullTaskData = await taskResponse.json();
        }
      } catch (e) {
        console.warn(`Failed to load task ${taskInfo.filePrefix}:`, e);
      }
    }

    const task = createTaskFromHistory(taskInfo, fullTaskData);
    
    if (fullTaskData) {
      task.annotations = normalizeLoadedAnnotations(fullTaskData.annotations);
      
      if (fullTaskData.scale && fullTaskData.scale.enabled) {
        task.scale = {
          enabled: Boolean(fullTaskData.scale.enabled),
          pixels: Number(fullTaskData.scale.pixels) || 0,
          realLength: Number(fullTaskData.scale.realLength) || 0,
          unit: normalizeScaleUnit(fullTaskData.scale.unit),
          pixelPerUnit: Number(fullTaskData.scale.pixelPerUnit) || 0,
        };
      }
    }

    session.tasks.push(task);
  }

  if (session.shareScale && !session.sharedScale) {
    const fallbackTask = session.tasks[currentTaskIndex] || session.tasks[0];
    if (fallbackTask) {
      syncSharedScaleToAllTasks(fallbackTask.scale);
    }
  }

  session.currentTaskIndex = currentTaskIndex;

  updateBatchUI();
  renderBatchTaskList();
  loadTaskAtIndex(currentTaskIndex);

  let message = `宸叉仮澶嶆壒娆★細鍏?${session.tasks.length} 寮犲浘鐗囷紝褰撳墠鍦ㄧ ${currentTaskIndex + 1} 寮燻`;
  if (session.shareScale && session.sharedScale && session.sharedScale.enabled) {
    message += `锛屾瘮渚嬫爣瀹氬凡澶嶇敤`;
  }
  setStatus(message);
  return;

  updateBatchUI();
  
  const targetTask = session.tasks[currentTaskIndex];
  if (targetTask) {
    syncStateFromTask(targetTask);

    resetDraftState();
    resetScaleState();

    const preferredImage = currentTaskData.originalImage || currentTaskData.annotatedImage;
    if (preferredImage) {
      const imageMeta = currentTaskData.imageMeta || {};
      loadImageFromSource(preferredImage, imageMeta.name || "已恢复图片", {
        preserveAnnotations: true,
        imageFile: null,
        afterLoad: () => {
          renderAnnotationList();
          updateAnnotationNameEditor();
          updateDisplayModeButtons();
          updateImagePositionDisplay();
          updateToolButtons();
          updateScalePanel();
          refreshOverlay();
          computeImagePlacement();
          drawScene();
          updateBatchUI();
          renderBatchTaskList();
          
          let message = `已恢复批次：共 ${session.tasks.length} 张图片，当前在第 ${currentTaskIndex + 1} 张`;
          if (session.shareScale && session.sharedScale && session.sharedScale.enabled) {
            message += `，比例标定已复用`;
          }
          setStatus(message);
        },
      });
    } else {
      renderAnnotationList();
      updateAnnotationNameEditor();
      updateDisplayModeButtons();
      updateScalePanel();
      renderBatchTaskList();
      setStatus(`已恢复批次：共 ${session.tasks.length} 张图片。部分图片可能需要重新选择原图。`);
    }
  }
}

async function deleteSession(filePrefix) {
  const session = state.sessions.find((item) => item.filePrefix === filePrefix);
  const sessionName = session?.projectName || "这个历史项目";

  if (!window.confirm(`确定删除“${sessionName}”吗？这会同时删除保存的 JSON 和预览图片。`)) {
    return;
  }

  try {
    setStatus(`正在删除历史项目：${sessionName}`);
    const response = await fetch(`/api/sessions/${encodeURIComponent(filePrefix)}`, {
      method: "DELETE",
    });
    const body = await response.json();

    if (!response.ok) {
      throw new Error(body.error || "删除历史项目失败。");
    }

    state.sessions = state.sessions.filter((item) => item.filePrefix !== filePrefix);
    renderHistoryList();

    if (state.currentSessionPrefix === filePrefix) {
      state.currentSessionPrefix = null;
      setStatus(`已删除当前历史项目：${sessionName}。当前画布内容保留，但不再对应已保存记录。`);
      return;
    }

    setStatus(`已删除历史项目：${sessionName}`);
  } catch (error) {
    setStatus(error.message || "删除历史项目失败。", "error");
  }
}

function finalizePolygon() {
  if (state.polygonPoints.length < 3) {
    setStatus("多边形至少需要三个顶点。", "error");
    return;
  }

  const polygon = createPolygonAnnotation([...state.polygonPoints]);
  if (polygon.area < 16) {
    setStatus("这个多边形太小，已忽略。", "error");
    resetDraftState();
    drawScene();
    return;
  }

  pushUndoAdd(polygon);
  state.annotations.push(polygon);
  state.selectedId = polygon.id;
  resetDraftState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加多边形，面积 ${Math.round(polygon.area)} px²。`);
}

function finalizeLine() {
  if (state.linePoints.length < 2) {
    setStatus("折线至少需要两个点。", "error");
    return;
  }

  const polyline = createLineAnnotation([...state.linePoints]);
  if (polyline.length < 4) {
    setStatus("这条折线太短，已忽略。", "error");
    resetDraftState();
    drawScene();
    return;
  }

  pushUndoAdd(polyline);
  state.annotations.push(polyline);
  state.selectedId = polyline.id;
  resetDraftState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加折线，总长度 ${Math.round(polyline.length)} px。`);
}

function finalizeBrush() {
  if (state.brushPoints.length < 2) {
    state.brushPoints = [];
    drawScene();
    setStatus("画笔路径太短，已忽略。", "error");
    return;
  }

  const brush = createBrushAnnotation([...state.brushPoints]);
  state.brushPoints = [];

  if (brush.length < 4) {
    drawScene();
    setStatus("画笔路径太短，已忽略。", "error");
    return;
  }

  pushUndoAdd(brush);
  state.annotations.push(brush);
  state.selectedId = brush.id;
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加画笔路径，长度 ${Math.round(brush.length)} px。`);
}

function trimRepeatedTailPoint(points) {
  if (points.length < 2) {
    return;
  }

  const lastPoint = points[points.length - 1];
  const previousPoint = points[points.length - 2];
  if (Math.hypot(lastPoint.x - previousPoint.x, lastPoint.y - previousPoint.y) <= 1.5) {
    points.pop();
  }
}

function undoDraftPoint() {
  if (state.currentTool === "line" && state.linePoints.length) {
    state.linePoints.pop();
    state.draftAnnotation = null;
    drawScene();
    setStatus(
      state.linePoints.length
        ? `已撤销一个折线点，剩余 ${state.linePoints.length} 个。`
        : "已撤销当前折线的最后一个点。"
    );
    return true;
  }

  if (state.currentTool === "polygon" && state.polygonPoints.length) {
    state.polygonPoints.pop();
    state.draftAnnotation = null;
    drawScene();
    setStatus(
      state.polygonPoints.length
        ? `已撤销一个顶点，剩余 ${state.polygonPoints.length} 个。`
        : "已撤销当前多边形的最后一个顶点。"
    );
    return true;
  }

  return false;
}

function undoLastAction() {
  if (undoDraftPoint()) {
    return;
  }

  const lastAction = state.undoStack.pop();
  if (!lastAction) {
    setStatus("没有可撤销的操作。", "error");
    return;
  }

  if (lastAction.action === "add") {
    state.annotations = state.annotations.filter((annotation) => annotation.id !== lastAction.annotation.id);
    if (state.selectedId === lastAction.annotation.id) {
      state.selectedId = null;
    }
    renderAnnotationList();
    updateAnnotationNameEditor();
    drawScene();
    setStatus("已撤销上一步新增标注。");
  } else if (lastAction.action === "modify") {
    const annotationIndex = state.annotations.findIndex((a) => a.id === lastAction.original.id);
    if (annotationIndex !== -1) {
      state.annotations[annotationIndex] = structuredClone(lastAction.original);
      renderAnnotationList();
      updateAnnotationNameEditor();
      drawScene();
      setStatus("已撤销上一步修改操作。");
    }
  } else if (lastAction.action === "delete") {
    const insertIndex = lastAction.index >= 0 ? lastAction.index : state.annotations.length;
    state.annotations.splice(insertIndex, 0, structuredClone(lastAction.annotation));
    if (state.selectedId === null) {
      state.selectedId = lastAction.annotation.id;
    }
    renderAnnotationList();
    updateAnnotationNameEditor();
    drawScene();
    setStatus("已撤销上一步删除操作。");
  }
}

elements.imageLoader.addEventListener("change", (event) => {
  const [file] = event.target.files;
  loadImage(file);
});

elements.toolButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setCurrentTool(button.dataset.tool);
  });
});

elements.displayModeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setDisplayMode(button.dataset.displayMode);
  });
});

elements.imagePositionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    nudgeImagePosition(button.dataset.nudgeImage);
  });
});

elements.canvas.addEventListener("pointerdown", (event) => {
  if (!state.image) {
    setStatus("请先加载图片。", "error");
    return;
  }

  const point = pointerToImageCoordinates(event);
  if (!point) {
    return;
  }

  if (state.selectedId) {
    const selectedAnnotation = state.annotations.find((a) => a.id === state.selectedId);
    if (selectedAnnotation) {
      const hitHandle = findHitHandle(point, selectedAnnotation);
      
      if (hitHandle) {
        elements.canvas.setPointerCapture(event.pointerId);
        if (hitHandle.type === "corner" && selectedAnnotation.type === "rectangle") {
          startEditing(selectedAnnotation, "resize", hitHandle.index);
          state.editStartPoint = { ...point };
          setStatus("拖动角点调整矩形大小。");
        } else if (hitHandle.type === "vertex" && (selectedAnnotation.type === "polygon" || selectedAnnotation.type === "line")) {
          startEditing(selectedAnnotation, "vertex", hitHandle.index);
          state.editStartPoint = { ...point };
          setStatus("拖动顶点调整位置。");
        }
        return;
      }
      
      if (
        (selectedAnnotation.type === "rectangle" && isPointInRectangle(point, selectedAnnotation)) ||
        (selectedAnnotation.type === "polygon" && isPointInPolygon(point, selectedAnnotation.points)) ||
        (selectedAnnotation.type === "line" && isPointNearPolyline(point, selectedAnnotation.points, 6))
      ) {
        elements.canvas.setPointerCapture(event.pointerId);
        startEditing(selectedAnnotation, "move");
        state.editStartPoint = { ...point };
        setStatus("拖动整体移动标注位置。");
        return;
      }
    }
  }

  const hitAnnotation = findHitAnnotation(point);
  if (hitAnnotation) {
    selectAnnotation(hitAnnotation.id);
    elements.canvas.setPointerCapture(event.pointerId);
    startEditing(hitAnnotation, "move");
    state.editStartPoint = { ...point };
    setStatus(`已选中并开始移动${hitAnnotation.type === "rectangle" ? "矩形" : hitAnnotation.type === "polygon" ? "多边形" : hitAnnotation.type === "line" ? "折线" : "画笔"}标注。`);
    return;
  }

  state.selectedId = null;
  updateAnnotationNameEditor();

  if (state.currentTool === "polygon") {
    state.polygonPoints.push(point);
    state.draftAnnotation = null;
    drawScene();
    setStatus(`已添加顶点 ${state.polygonPoints.length}，双击或按 Enter 完成。`);
    return;
  }

  if (state.currentTool === "line") {
    state.linePoints.push(point);
    state.draftAnnotation = null;
    drawScene();
    setStatus(`已添加折线点 ${state.linePoints.length}，双击或按 Enter 完成。`);
    return;
  }

  if (state.currentTool === "scale") {
    if (state.scaleLinePoints.length === 0) {
      state.scaleLinePoints.push(point);
      state.scaleDraft = null;
      drawScene();
      setStatus("已添加标定起点，点击添加终点完成参考线绘制。");
    } else if (state.scaleLinePoints.length === 1) {
      state.scaleLinePoints.push(point);
      state.scaleDraft = null;
      drawScene();
      const length = Math.hypot(
        state.scaleLinePoints[1].x - state.scaleLinePoints[0].x,
        state.scaleLinePoints[1].y - state.scaleLinePoints[0].y
      );
      if (length < 4) {
        setStatus("标定线太短，请重新绘制。", "error");
        resetScaleState();
        drawScene();
        return;
      }
      showScaleModal(length);
    }
    return;
  }

  if (state.currentTool === "brush") {
    state.drawing = true;
    state.brushPoints = [point];
    drawScene();
    return;
  }

  state.drawing = true;
  state.pointerStart = point;
  state.draftAnnotation = normalizeRectangle(point, point);
  drawScene();
});

elements.canvas.addEventListener("pointermove", (event) => {
  const point = pointerToImageCoordinates(event);

  if (state.editing && state.editOriginalAnnotation) {
    const annotation = state.annotations.find((a) => a.id === state.editOriginalAnnotation.id);
    if (annotation && state.editStartPoint) {
      if (!point) {
        return;
      }

      const dx = point.x - state.editStartPoint.x;
      const dy = point.y - state.editStartPoint.y;
      
      if (state.editMode === "move") {
        if (annotation.type === "rectangle") {
          annotation.x = state.editOriginalAnnotation.x + dx;
          annotation.y = state.editOriginalAnnotation.y + dy;
        } else if (annotation.points) {
          for (let index = 0; index < annotation.points.length; index += 1) {
            annotation.points[index].x = state.editOriginalAnnotation.points[index].x + dx;
            annotation.points[index].y = state.editOriginalAnnotation.points[index].y + dy;
          }
        }
      } else if (state.editMode === "resize" && annotation.type === "rectangle") {
        const corners = getRectangleCorners(state.editOriginalAnnotation);
        const draggedCorner = corners[state.editHandleIndex];
        const oppositeIndex = (state.editHandleIndex + 2) % 4;
        const oppositeCorner = corners[oppositeIndex];
        
        const newCorner = {
          x: draggedCorner.x + dx,
          y: draggedCorner.y + dy,
        };
        
        const newX = Math.min(newCorner.x, oppositeCorner.x);
        const newY = Math.min(newCorner.y, oppositeCorner.y);
        const newWidth = Math.abs(newCorner.x - oppositeCorner.x);
        const newHeight = Math.abs(newCorner.y - oppositeCorner.y);
        
        if (newWidth >= 2 && newHeight >= 2) {
          annotation.x = newX;
          annotation.y = newY;
          annotation.width = newWidth;
          annotation.height = newHeight;
        }
      } else if (state.editMode === "vertex" && annotation.points) {
        const vertexIndex = state.editHandleIndex;
        if (vertexIndex >= 0 && vertexIndex < annotation.points.length) {
          annotation.points[vertexIndex].x = state.editOriginalAnnotation.points[vertexIndex].x + dx;
          annotation.points[vertexIndex].y = state.editOriginalAnnotation.points[vertexIndex].y + dy;
        }
      }
      
      updateAnnotationMetrics(annotation);
      renderAnnotationList();
      drawScene();
    }
    return;
  }

  if (state.currentTool === "polygon") {
    state.draftAnnotation =
      state.polygonPoints.length && point ? { type: "polygon-preview", previewPoint: point } : null;
    drawScene();
    return;
  }

  if (state.currentTool === "line") {
    state.draftAnnotation =
      state.linePoints.length && point ? { type: "line-preview", previewPoint: point } : null;
    drawScene();
    return;
  }

  if (state.currentTool === "scale") {
    state.scaleDraft =
      state.scaleLinePoints.length === 1 && point ? { type: "scale-preview", previewPoint: point } : null;
    drawScene();
    return;
  }

  if (state.currentTool === "brush") {
    if (!state.drawing || !point) {
      return;
    }

    state.brushPoints.push(point);
    drawScene();
    return;
  }

  if (!state.drawing || !state.pointerStart || !point) {
    return;
  }

  state.draftAnnotation = normalizeRectangle(state.pointerStart, point);
  drawScene();
});

elements.canvas.addEventListener("pointerup", (event) => {
  if (state.editing) {
    finishEditing();
    return;
  }

  if (state.currentTool === "polygon" || state.currentTool === "line") {
    return;
  }

  if (state.currentTool === "brush") {
    if (!state.drawing) {
      return;
    }

    state.drawing = false;
    finalizeBrush();
    return;
  }

  if (!state.drawing || !state.pointerStart) {
    return;
  }

  const point = pointerToImageCoordinates(event);
  state.drawing = false;

  if (!point) {
    state.pointerStart = null;
    state.draftAnnotation = null;
    drawScene();
    return;
  }

  const annotation = normalizeRectangle(state.pointerStart, point);
  state.pointerStart = null;
  state.draftAnnotation = null;

  if (annotation.width < 4 || annotation.height < 4) {
    setStatus("这个矩形太小，已忽略。", "error");
    drawScene();
    return;
  }

  pushUndoAdd(annotation);
  state.annotations.push(annotation);
  state.selectedId = annotation.id;
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加矩形，尺寸 ${Math.round(annotation.width)} × ${Math.round(annotation.height)} px。`);
});

elements.canvas.addEventListener("pointerleave", () => {
  if (state.editing) {
    finishEditing();
    return;
  }

  if (state.currentTool === "polygon" || state.currentTool === "line") {
    state.draftAnnotation = null;
    drawScene();
    return;
  }

  if (state.currentTool === "brush" && state.drawing) {
    state.drawing = false;
    finalizeBrush();
    return;
  }

  if (!state.drawing) {
    return;
  }

  state.drawing = false;
  state.pointerStart = null;
  state.draftAnnotation = null;
  drawScene();
});

elements.canvas.addEventListener("dblclick", (event) => {
  if (state.currentTool === "polygon") {
    event.preventDefault();
    trimRepeatedTailPoint(state.polygonPoints);
    finalizePolygon();
    return;
  }

  if (state.currentTool === "line") {
    event.preventDefault();
    trimRepeatedTailPoint(state.linePoints);
    finalizeLine();
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undoLastAction();
    return;
  }

  if (state.currentTool === "polygon") {
    if (event.key === "Enter") {
      event.preventDefault();
      finalizePolygon();
    } else if (event.key === "Escape") {
      resetDraftState();
      drawScene();
      setStatus("已取消当前多边形绘制。");
    } else if (event.key === "Backspace" && state.polygonPoints.length) {
      event.preventDefault();
      state.polygonPoints.pop();
      drawScene();
      setStatus(`已撤销一个顶点，剩余 ${state.polygonPoints.length} 个。`);
    }
    return;
  }

  if (state.currentTool === "line") {
    if (event.key === "Enter") {
      event.preventDefault();
      finalizeLine();
    } else if (event.key === "Escape") {
      resetDraftState();
      drawScene();
      setStatus("已取消当前折线绘制。");
    } else if (event.key === "Backspace" && state.linePoints.length) {
      event.preventDefault();
      state.linePoints.pop();
      drawScene();
      setStatus(`已撤销一个折线点，剩余 ${state.linePoints.length} 个。`);
    }
  }

  if (state.currentTool === "scale") {
    if (event.key === "Escape") {
      resetScaleState();
      drawScene();
      setStatus("已取消当前比例标定绘制。");
    } else if (event.key === "Backspace" && state.scaleLinePoints.length) {
      event.preventDefault();
      state.scaleLinePoints.pop();
      state.scaleDraft = null;
      drawScene();
      if (state.scaleLinePoints.length === 0) {
        setStatus("已撤销标定起点，请重新点击添加起点。");
      } else {
        setStatus(`已撤销标定点，剩余 ${state.scaleLinePoints.length} 个。点击添加终点完成参考线绘制。`);
      }
    }
  }
});

elements.annotationList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-id]");
  if (!item) {
    return;
  }

  selectAnnotation(item.dataset.id);
});

elements.historyList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-prefix]");
  if (deleteButton) {
    event.stopPropagation();
    deleteSession(deleteButton.dataset.deletePrefix);
    return;
  }

  const item = event.target.closest("[data-filename]");
  if (!item) {
    return;
  }

  loadSession(item.dataset.filename);
});

if (elements.undoButton) {
  elements.undoButton.addEventListener("click", () => {
    undoLastAction();
  });
}

if (elements.deleteSelectedButton) {
  elements.deleteSelectedButton.addEventListener("click", () => {
    deleteSelectedAnnotation();
  });
}

if (elements.clearButton) {
  elements.clearButton.addEventListener("click", () => {
  state.annotations = [];
  state.selectedId = null;
  state.undoStack = [];
  resetDraftState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus("已清空当前图片上的所有标注。");
  });
}

if (elements.downloadButton) {
  elements.downloadButton.addEventListener("click", () => {
    downloadAnnotatedImage();
  });
}

if (elements.saveAnnotationName) {
  elements.saveAnnotationName.addEventListener("click", () => {
    saveAnnotationName();
  });
}

if (elements.annotationNameInput) {
  elements.annotationNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveAnnotationName();
  }
  });
}

if (elements.saveButton) {
  elements.saveButton.addEventListener("click", () => {
    saveAnnotations();
  });
}

if (elements.refreshHistory) {
  elements.refreshHistory.addEventListener("click", async () => {
  await loadHistoryList();
  setStatus("历史记录已刷新。");
  });
}

if (elements.resetImagePosition) {
  elements.resetImagePosition.addEventListener("click", () => {
    resetImagePosition();
  });
}

if (elements.clearScale) {
  elements.clearScale.addEventListener("click", () => {
    clearScale();
  });
}

if (elements.scaleCancel) {
  elements.scaleCancel.addEventListener("click", () => {
    hideScaleModal();
  });
}

if (elements.scaleConfirm) {
  elements.scaleConfirm.addEventListener("click", () => {
    confirmScale();
  });
}

if (elements.scaleUnitSelect) {
  elements.scaleUnitSelect.addEventListener("change", () => {
    syncScaleUnitInputs(elements.scaleUnitSelect.value);
    if (elements.scaleUnitSelect.value === "custom") {
      elements.scaleUnitCustomInput?.focus();
    }
  });
}

if (elements.scaleLengthInput) {
  elements.scaleLengthInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmScale();
    } else if (event.key === "Escape") {
      event.preventDefault();
      hideScaleModal();
    }
  });
}

if (elements.scaleUnitCustomInput) {
  elements.scaleUnitCustomInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmScale();
    } else if (event.key === "Escape") {
      event.preventDefault();
      hideScaleModal();
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.scaleModalOverlay && !elements.scaleModalOverlay.classList.contains("hidden")) {
    event.preventDefault();
    hideScaleModal();
    return;
  }

  if (session.isBatchSession) {
    if (event.key === "ArrowLeft" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      goToPrevTask();
      return;
    }
    if (event.key === "ArrowRight" && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      goToNextTask();
      return;
    }
  }
});

window.addEventListener("resize", syncCanvasSize);

window.addEventListener("beforeunload", (event) => {
  if (hasAnyUnsavedChanges()) {
    event.preventDefault();
    event.returnValue = "您有未保存的标注更改，确定要离开吗？";
    return event.returnValue;
  }
});

if (elements.batchImageLoader) {
  elements.batchImageLoader.addEventListener("change", (event) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      startBatchSession(files);
    }
    event.target.value = "";
  });
}

if (elements.batchPrev) {
  elements.batchPrev.addEventListener("click", () => {
    goToPrevTask();
  });
}

if (elements.batchNext) {
  elements.batchNext.addEventListener("click", () => {
    goToNextTask();
  });
}

if (elements.exitBatch) {
  elements.exitBatch.addEventListener("click", () => {
    exitBatchSession();
  });
}

if (elements.batchTaskList) {
  elements.batchTaskList.addEventListener("click", (event) => {
    const item = event.target.closest("[data-batch-index]");
    if (!item) {
      return;
    }
    const index = parseInt(item.dataset.batchIndex, 10);
    if (!isNaN(index)) {
      switchToTask(index);
    }
  });
}

if (elements.shareScale) {
  elements.shareScale.addEventListener("change", () => {
    session.shareScale = elements.shareScale.checked;
    
    if (session.shareScale) {
      if (state.scale.enabled) {
        syncSharedScaleToAllTasks(state.scale);
        setStatus(`已启用比例复用，当前比例 ${Math.round(state.scale.pixels)} px = ${formatRealLength(state.scale.realLength, state.scale.unit)} 将应用到所有图片`);
      } else {
        session.sharedScale = null;
        setStatus("已启用比例复用，请先设置比例标定");
      }
    } else {
      const currentTask = getCurrentTask();
      if (currentTask) {
        currentTask.scale = structuredClone(state.scale);
        state.scale = structuredClone(currentTask.scale);
        updateScalePanel();
        setStatus("已关闭比例复用，各图片将使用独立的比例设置");
      }
      session.sharedScale = null;
    }
    
    updateBatchUI();
  });
}

if (elements.applyProjectToAll) {
  elements.applyProjectToAll.addEventListener("change", () => {
    session.applyProjectToAll = elements.applyProjectToAll.checked;
    const currentTask = getCurrentTask();
    if (currentTask) {
      syncTaskProjectSettingsFromForm(currentTask);
    }
    if (session.applyProjectToAll) {
      applyProjectSettingsToAllTasks(currentTask || readProjectSettingsFromForm());
      setStatus("已启用项目设置复用，保存时将使用当前项目名称和备注");
    } else {
      setStatus("已关闭项目设置复用，各图片可使用独立的项目名称和备注");
    }
    updateBatchUI();
  });
}

elements.projectName.addEventListener("input", handleBatchProjectSettingsChanged);
elements.projectNotes.addEventListener("input", handleBatchProjectSettingsChanged);
elements.exportFilename.addEventListener("input", handleBatchProjectSettingsChanged);
elements.imageTags.addEventListener("input", handleBatchProjectSettingsChanged);

let editingTemplateId = null;
let editingCategoryId = null;

function showTemplateModal(templateId = null) {
  editingTemplateId = templateId;
  const template = templateId ? getTemplateById(templateId) : null;

  if (template) {
    elements.templateModalTitle.textContent = "编辑模板";
    elements.templateNameInput.value = template.name;
    elements.templateDefaultCheckbox.checked = template.isDefault;
  } else {
    elements.templateModalTitle.textContent = "新建模板";
    elements.templateNameInput.value = "";
    elements.templateDefaultCheckbox.checked = false;
  }

  elements.templateModalOverlay.classList.remove("hidden");
  elements.templateNameInput.focus();
}

function hideTemplateModal() {
  elements.templateModalOverlay.classList.add("hidden");
  editingTemplateId = null;
}

function saveTemplate() {
  const name = elements.templateNameInput.value.trim();
  if (!name) {
    setStatus("请输入模板名称。", "error");
    return;
  }

  const isDefault = elements.templateDefaultCheckbox.checked;

  if (editingTemplateId) {
    updateTemplate(editingTemplateId, { name, isDefault });
    setStatus(`已更新模板：${name}`);
  } else {
    const template = createTemplate(name, isDefault);
    addTemplate(template);
    setStatus(`已创建模板：${name}`);
  }

  hideTemplateModal();
  renderTemplateList();
  renderCategoryList();
  saveTemplatesToStorage();
}

function showCategoryModal(categoryId = null) {
  editingCategoryId = categoryId;
  const category = categoryId ? getCategoryById(categoryId) : null;

  if (category) {
    elements.categoryModalTitle.textContent = "编辑类别";
    elements.categoryNameInput.value = category.name;
    elements.categoryColorInput.value = category.color;
    elements.categoryShapeType.value = category.shapeType;
    elements.categoryNamingPattern.value = category.namingPattern || "";
    elements.categoryShowMeasurements.checked = category.showMeasurements;
    elements.categoryExportIncluded.checked = category.exportIncluded;
  } else {
    elements.categoryModalTitle.textContent = "新建类别";
    elements.categoryNameInput.value = "";
    elements.categoryColorInput.value = presetColors[0];
    elements.categoryShapeType.value = "rectangle";
    elements.categoryNamingPattern.value = "";
    elements.categoryShowMeasurements.checked = true;
    elements.categoryExportIncluded.checked = true;
  }

  initColorPresetGrid();
  elements.categoryModalOverlay.classList.remove("hidden");
  elements.categoryNameInput.focus();
}

function hideCategoryModal() {
  elements.categoryModalOverlay.classList.add("hidden");
  editingCategoryId = null;
}

function initColorPresetGrid() {
  elements.colorPresetGrid.innerHTML = presetColors
    .map((color) => {
      const activeClass = color === elements.categoryColorInput.value ? "color-preset active" : "color-preset";
      return `<div class="${activeClass}" style="background-color: ${color};" data-color="${color}"></div>`;
    })
    .join("");
}

function saveCategory() {
  const name = elements.categoryNameInput.value.trim();
  if (!name) {
    setStatus("请输入类别名称。", "error");
    return;
  }

  const categoryData = {
    name,
    color: elements.categoryColorInput.value,
    shapeType: elements.categoryShapeType.value,
    namingPattern: elements.categoryNamingPattern.value.trim() || null,
    showMeasurements: elements.categoryShowMeasurements.checked,
    exportIncluded: elements.categoryExportIncluded.checked,
  };

  const activeTemplateId = getActiveTemplateId();
  if (!activeTemplateId) {
    setStatus("请先选择一个模板。", "error");
    return;
  }

  if (editingCategoryId) {
    updateCategory(activeTemplateId, editingCategoryId, categoryData);
    setStatus(`已更新类别：${name}`);
  } else {
    const category = createCategory(categoryData.name, categoryData.color, categoryData.shapeType);
    Object.assign(category, categoryData);
    addCategory(activeTemplateId, category);
    setStatus(`已创建类别：${name}`);
  }

  hideCategoryModal();
  renderCategoryList();
  saveTemplatesToStorage();
}

function deleteCurrentTemplate() {
  const activeTemplateId = getActiveTemplateId();
  if (!activeTemplateId) {
    setStatus("没有可删除的模板。", "error");
    return;
  }

  const templates = getActiveTemplates();
  if (templates.length <= 1) {
    setStatus("至少需要保留一个模板。", "error");
    return;
  }

  const template = getTemplateById(activeTemplateId);
  if (template && confirm(`确定要删除模板"${template.name}"及其所有类别吗？`)) {
    removeTemplate(activeTemplateId);
    renderTemplateList();
    renderCategoryList();
    saveTemplatesToStorage();
    setStatus(`已删除模板：${template.name}`);
  }
}

function selectTemplate(templateId) {
  if (setActiveTemplate(templateId)) {
    saveTemplatesToStorage();
    const template = getActiveTemplate();
    if (template) {
      setStatus(`已切换到模板：${template.name}`);
    }
  }
}

function selectCategory(categoryId) {
  if (setActiveCategory(categoryId)) {
    saveTemplatesToStorage();
    const category = getCategoryById(categoryId);
    if (category) {
      setStatus(`已选择类别：${category.name}`);
    }
  }
}

function deleteCategoryFromUI(categoryId) {
  const category = getCategoryById(categoryId);
  if (category && confirm(`确定要删除类别"${category.name}"吗？`)) {
    const activeTemplateId = getActiveTemplateId();
    if (activeTemplateId) {
      removeCategory(activeTemplateId, categoryId);
      renderCategoryList();
      saveTemplatesToStorage();
      setStatus(`已删除类别：${category.name}`);
    }
  }
}

elements.templateSelect.addEventListener("change", (event) => {
  const templateId = event.target.value;
  if (templateId) {
    selectTemplate(templateId);
  }
});

elements.newTemplateButton.addEventListener("click", () => {
  showTemplateModal();
});

elements.editTemplateButton.addEventListener("click", () => {
  const activeTemplateId = getActiveTemplateId();
  if (activeTemplateId) {
    showTemplateModal(activeTemplateId);
  } else {
    setStatus("请先选择一个模板。", "error");
  }
});

elements.deleteTemplateButton.addEventListener("click", () => {
  deleteCurrentTemplate();
});

elements.newCategoryButton.addEventListener("click", () => {
  const activeTemplateId = getActiveTemplateId();
  if (activeTemplateId) {
    showCategoryModal();
  } else {
    setStatus("请先选择一个模板。", "error");
  }
});

elements.templateModalCancel.addEventListener("click", hideTemplateModal);
elements.templateModalConfirm.addEventListener("click", saveTemplate);

elements.categoryModalCancel.addEventListener("click", hideCategoryModal);
elements.categoryModalConfirm.addEventListener("click", saveCategory);

elements.colorPresetGrid.addEventListener("click", (event) => {
  const preset = event.target.closest(".color-preset");
  if (preset) {
    const color = preset.dataset.color;
    elements.categoryColorInput.value = color;
    initColorPresetGrid();
  }
});

elements.categoryList.addEventListener("click", (event) => {
  const categoryItem = event.target.closest(".category-item");
  if (!categoryItem) return;

  const categoryId = categoryItem.dataset.id;
  const actionBtn = event.target.closest(".category-action-btn");

  if (actionBtn) {
    const action = actionBtn.dataset.categoryAction;
    if (action === "edit") {
      showCategoryModal(categoryId);
    } else if (action === "delete") {
      deleteCategoryFromUI(categoryId);
    }
  } else {
    selectCategory(categoryId);
  }
});

elements.templateModalOverlay.addEventListener("click", (event) => {
  if (event.target === elements.templateModalOverlay) {
    hideTemplateModal();
  }
});

elements.categoryModalOverlay.addEventListener("click", (event) => {
  if (event.target === elements.categoryModalOverlay) {
    hideCategoryModal();
  }
});

elements.templateNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveTemplate();
  }
});

elements.categoryNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    saveCategory();
  }
});

renderAnnotationList();
updateToolButtons();
updateDisplayModeButtons();
updateImagePositionDisplay();
syncScaleUnitInputs(state.scale.unit);
updateScalePanel();
refreshOverlay();
syncCanvasSize();
loadHistoryList();

loadTemplatesFromStorage();
renderTemplateList();
renderCategoryList();
