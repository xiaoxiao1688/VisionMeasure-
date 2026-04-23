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
  scalePreviewLength: document.querySelector("#scale-preview-length"),
  scaleCancel: document.querySelector("#scale-cancel"),
  scaleConfirm: document.querySelector("#scale-confirm"),
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
  scale: {
    enabled: false,
    pixels: 0,
    realLength: 0,
    unit: "cm",
    pixelPerUnit: 0,
  },
  scaleLinePoints: [],
  scaleDraft: null,
  pendingScalePixels: 0,
};

const ctx = elements.canvas.getContext("2d");
const canvasContainer = elements.canvas.parentElement;

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

  if (annotation.type === "line") {
    drawPolylineAnnotation(annotation, "#55d5ff", "#8ae6ff", isDraft);
    return;
  }

  if (annotation.type === "polygon") {
    drawPolygonAnnotation(annotation, isDraft);
    return;
  }

  if (annotation.type === "brush") {
    drawPolylineAnnotation(annotation, "#ff6b9d", "#ffd18a", isDraft);
    return;
  }

  drawRectangleAnnotation(annotation, isDraft);
}

function drawRectangleAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;
  const x = placement.x + annotation.x * placement.scale;
  const y = placement.y + annotation.y * placement.scale;
  const width = annotation.width * placement.scale;
  const height = annotation.height * placement.scale;

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#ffd18a" : "#ff8f62";
  ctx.fillStyle = isDraft ? "rgba(255, 143, 98, 0.12)" : "rgba(255, 143, 98, 0.18)";
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

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#b8ff8a" : "#8ae35f";
  ctx.fillStyle = isDraft ? "rgba(138, 227, 95, 0.12)" : "rgba(138, 227, 95, 0.22)";
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

  return {
    id: crypto.randomUUID(),
    type: "rectangle",
    name: "",
    x,
    y,
    width,
    height,
    area: width * height,
  };
}

function createLineAnnotation(points) {
  return {
    id: crypto.randomUUID(),
    type: "line",
    name: "",
    points,
    length: getPolylineLength(points),
  };
}

function createPolygonAnnotation(points) {
  return {
    id: crypto.randomUUID(),
    type: "polygon",
    name: "",
    points,
    area: getPolygonArea(points),
    perimeter: getPolygonPerimeter(points),
  };
}

function createBrushAnnotation(points) {
  return {
    id: crypto.randomUUID(),
    type: "brush",
    name: "",
    points,
    length: getPolylineLength(points),
  };
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

function getAnnotationLabel(annotation) {
  const prefix = annotation.name ? `${annotation.name} · ` : "";
  const scaleEnabled = state.scale.enabled && state.scale.pixelPerUnit > 0;
  const unit = state.scale.unit;

  if (annotation.type === "line") {
    const pixelLabel = `${Math.round(annotation.length)} px`;
    if (scaleEnabled) {
      const realLength = getRealLength(annotation.length);
      const realLabel = formatRealLength(realLength, unit);
      return `${prefix}折线 ${pixelLabel} / ${realLabel}`;
    }
    return `${prefix}折线 ${pixelLabel}`;
  }

  if (annotation.type === "polygon") {
    const pixelLabel = `${Math.round(annotation.area)} px²`;
    if (scaleEnabled) {
      const realArea = getRealArea(annotation.area);
      const realLabel = formatRealArea(realArea, unit);
      return `${prefix}多边形 ${pixelLabel} / ${realLabel}`;
    }
    return `${prefix}多边形 ${pixelLabel}`;
  }

  if (annotation.type === "brush") {
    const pixelLabel = `${Math.round(annotation.length)} px`;
    if (scaleEnabled) {
      const realLength = getRealLength(annotation.length);
      const realLabel = formatRealLength(realLength, unit);
      return `${prefix}画笔 ${pixelLabel} / ${realLabel}`;
    }
    return `${prefix}画笔 ${pixelLabel}`;
  }

  const pixelLabel = `${Math.round(annotation.width)} × ${Math.round(annotation.height)} px`;
  if (scaleEnabled) {
    const realWidth = getRealLength(annotation.width);
    const realHeight = getRealLength(annotation.height);
    const realLabel = `${formatRealLength(realWidth, unit)} × ${formatRealLength(realHeight, unit)}`;
    return `${prefix}${pixelLabel} / ${realLabel}`;
  }
  return `${prefix}${pixelLabel}`;
}

function getAnnotationSummary(annotation) {
  const prefix = annotation.name ? `${annotation.name} · ` : "";
  const scaleEnabled = state.scale.enabled && state.scale.pixelPerUnit > 0;
  const unit = state.scale.unit;

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
  const labels = {
    mm: "mm",
    cm: "cm",
    m: "m",
    in: "in",
    ft: "ft",
  };
  return labels[unit] || "cm";
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

  if (state.currentTool === "scale") {
    elements.scalePanel.classList.remove("hidden");
  } else {
    if (!state.scale.enabled) {
      elements.scalePanel.classList.add("hidden");
    }
  }

  if (state.scale.enabled) {
    elements.scaleInfo.classList.remove("hidden");
    elements.scaleStatus.textContent = "已标定";
    elements.scalePixels.textContent = `${Math.round(state.scale.pixels)} px`;
    elements.scaleReal.textContent = formatRealLength(state.scale.realLength, state.scale.unit);
    elements.scaleRatio.textContent = `${Math.round(state.scale.pixelPerUnit)} px/${getUnitLabel(state.scale.unit)}`;
    elements.scaleHint.textContent = "比例标定已生效，所有标注将同时显示像素值和真实单位。";
  } else {
    elements.scaleInfo.classList.add("hidden");
    elements.scaleStatus.textContent = "未标定";
    elements.scalePixels.textContent = "0 px";
    elements.scaleReal.textContent = "0 cm";
    elements.scaleRatio.textContent = "0 px/cm";
    elements.scaleHint.textContent = "在图片上绘制一条已知长度的参考线，建立像素与真实单位的换算关系。";
  }
}

function resetScaleState() {
  state.scaleLinePoints = [];
  state.scaleDraft = null;
  state.pendingScalePixels = 0;
}

function clearScale() {
  state.scale = {
    enabled: false,
    pixels: 0,
    realLength: 0,
    unit: "cm",
    pixelPerUnit: 0,
  };
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
  elements.scaleUnitSelect.value = "cm";
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
  const unit = elements.scaleUnitSelect.value;

  if (isNaN(length) || length <= 0) {
    setStatus("请输入有效的真实长度值。", "error");
    return;
  }

  state.scale = {
    enabled: true,
    pixels: state.pendingScalePixels,
    realLength: length,
    unit: unit,
    pixelPerUnit: state.pendingScalePixels / length,
  };

  hideScaleModal();
  updateScalePanel();
  renderAnnotationList();
  drawScene();
  setStatus(`比例标定已设置：${Math.round(state.pendingScalePixels)} px = ${formatRealLength(length, unit)}`);
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
  state.scale = {
    enabled: false,
    pixels: 0,
    realLength: 0,
    unit: "cm",
    pixelPerUnit: 0,
  };
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

function drawToCanvas(targetContext) {
  if (!state.image) {
    return;
  }

  targetContext.drawImage(state.image, 0, 0);

  state.annotations.forEach((annotation) => {
    if (annotation.type === "rectangle") {
      targetContext.lineWidth = 3;
      targetContext.strokeStyle = "#ff8f62";
      targetContext.fillStyle = "rgba(255, 143, 98, 0.18)";
      targetContext.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      targetContext.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
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
      targetContext.closePath();
      targetContext.lineWidth = 3;
      targetContext.strokeStyle = "#8ae35f";
      targetContext.fillStyle = "rgba(138, 227, 95, 0.22)";
      targetContext.fill();
      targetContext.stroke();
      return;
    }

    targetContext.lineWidth = annotation.type === "brush" ? 3 : 3;
    targetContext.strokeStyle = annotation.type === "brush" ? "#ff6b9d" : "#55d5ff";
    targetContext.stroke();
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

function serializeAnnotations() {
  return state.annotations.map((annotation) => ({
    id: annotation.id,
    type: annotation.type,
    name: annotation.name || "",
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
          pixelPerUnit: Number(state.scale.pixelPerUnit.toFixed(4)),
        }
      : undefined,
    annotations: serializeAnnotations(),
    originalImage,
    annotatedImage,
  };

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
    setStatus(`已保存 ${state.annotations.length} 个标注到 data/，前缀：${body.filePrefix}`);
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
    .map((session) => {
      const notePreview = session.notes
        ? `${session.notes.slice(0, 26)}${session.notes.length > 26 ? "..." : ""}`
        : "无备注";
      return `
        <li class="history-item" data-filename="${session.filePrefix}">
          <div class="history-item-header">
            <p class="history-item-title">${escapeHtml(session.projectName)}</p>
            <button
              class="history-delete-button"
              type="button"
              data-delete-prefix="${session.filePrefix}"
              aria-label="删除 ${escapeHtml(session.projectName)}"
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
            <span>${formatDate(session.savedAt)}</span>
            <span>${session.annotationCount} 个标注</span>
          </p>
          <p class="history-item-meta">
            <span>${escapeHtml(session.imageName || "未记录图片名")}</span>
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

    elements.projectName.value = body.projectName || "GeoDraft Prototype";
    elements.projectNotes.value = body.projectNotes || "";
    elements.exportFilename.value = body.exportFilename || "";
    elements.imageTags.value = Array.isArray(body.imageTags) ? body.imageTags.join(", ") : "";
    state.imageOffset = { x: 0, y: 0 };
    state.displayMode = "fit";
    state.currentSessionPrefix = filePrefix;
    state.originalImageDataUrl = body.originalImage || null;
    state.annotations = Array.isArray(body.annotations) ? body.annotations : [];
    state.selectedId = null;
    state.undoStack = [];

    if (body.scale && body.scale.enabled) {
      state.scale = {
        enabled: Boolean(body.scale.enabled),
        pixels: Number(body.scale.pixels) || 0,
        realLength: Number(body.scale.realLength) || 0,
        unit: String(body.scale.unit || "cm"),
        pixelPerUnit: Number(body.scale.pixelPerUnit) || 0,
      };
    } else {
      state.scale = {
        enabled: false,
        pixels: 0,
        realLength: 0,
        unit: "cm",
        pixelPerUnit: 0,
      };
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
  } catch (error) {
    setStatus(error.message || "加载历史项目失败。", "error");
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && elements.scaleModalOverlay && !elements.scaleModalOverlay.classList.contains("hidden")) {
    event.preventDefault();
    hideScaleModal();
  }
});

window.addEventListener("resize", syncCanvasSize);

renderAnnotationList();
updateToolButtons();
updateDisplayModeButtons();
updateImagePositionDisplay();
updateScalePanel();
refreshOverlay();
syncCanvasSize();
loadHistoryList();
