const elements = {
  annotationCount: document.querySelector("#annotation-count"),
  annotationList: document.querySelector("#annotation-list"),
  annotationNameEditor: document.querySelector("#annotation-name-editor"),
  annotationNameInput: document.querySelector("#annotation-name-input"),
  canvas: document.querySelector("#draft-canvas"),
  clearButton: document.querySelector("#clear-button"),
  downloadButton: document.querySelector("#download-button"),
  exportFilename: document.querySelector("#export-filename"),
  fileName: document.querySelector("#file-name"),
  historyList: document.querySelector("#history-list"),
  imageLoader: document.querySelector("#image-loader"),
  imageSize: document.querySelector("#image-size"),
  imageTags: document.querySelector("#image-tags"),
  overlay: document.querySelector("#canvas-overlay"),
  projectName: document.querySelector("#project-name"),
  projectNotes: document.querySelector("#project-notes"),
  refreshHistory: document.querySelector("#refresh-history"),
  saveAnnotationName: document.querySelector("#save-annotation-name"),
  saveButton: document.querySelector("#save-button"),
  selectionSize: document.querySelector("#selection-size"),
  statusLine: document.querySelector("#status-line"),
  toolButtons: [...document.querySelectorAll("[data-tool]")],
  undoButton: document.querySelector("#undo-button"),
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
  imagePlacement: null,
  pointerStart: null,
  polygonPoints: [],
  linePoints: [],
  selectedId: null,
  sessions: [],
  brushPoints: [],
  undoStack: [],
};

const ctx = elements.canvas.getContext("2d");
const canvasContainer = elements.canvas.parentElement;

function setStatus(message, tone = "default") {
  elements.statusLine.textContent = message;
  elements.statusLine.style.background =
    tone === "error" ? "rgba(184, 79, 37, 0.12)" : "rgba(35, 106, 76, 0.08)";
  elements.statusLine.style.color = tone === "error" ? "#b84f25" : "#236a4c";
}

function getToolInstructions(tool = state.currentTool) {
  if (tool === "line") {
    return "线段工具已启用，点击添加顶点，双击或按 Enter 完成，按 Backspace 撤销上一段。";
  }

  if (tool === "polygon") {
    return "多边形工具已启用，点击添加顶点，双击或按 Enter 完成闭合。";
  }

  if (tool === "brush") {
    return "画笔工具已启用，在图片上拖动即可自由绘制。";
  }

  return "矩形工具已启用，在图片上拖动即可创建测量框。";
}

function syncCanvasSize() {
  const bounds = canvasContainer.getBoundingClientRect();
  const width = Math.max(320, Math.floor(bounds.width));
  const height = Math.max(320, Math.floor(bounds.height));

  if (elements.canvas.width !== width || elements.canvas.height !== height) {
    elements.canvas.width = width;
    elements.canvas.height = height;
  }

  computeImagePlacement();
  drawScene();
}

function computeImagePlacement() {
  if (!state.image) {
    state.imagePlacement = null;
    return;
  }

  const padding = 36;
  const availableWidth = elements.canvas.width - padding * 2;
  const availableHeight = elements.canvas.height - padding * 2;
  const scale = Math.min(
    availableWidth / state.image.width,
    availableHeight / state.image.height,
    1
  );

  const drawWidth = state.image.width * scale;
  const drawHeight = state.image.height * scale;

  state.imagePlacement = {
    scale,
    x: (elements.canvas.width - drawWidth) / 2,
    y: (elements.canvas.height - drawHeight) / 2,
    width: drawWidth,
    height: drawHeight,
  };
}

function drawScene() {
  ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

  if (!state.image || !state.imagePlacement) {
    drawEmptyCanvas();
    return;
  }

  const placement = state.imagePlacement;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 30;
  ctx.drawImage(state.image, placement.x, placement.y, placement.width, placement.height);
  ctx.restore();

  state.annotations.forEach((annotation) => drawAnnotation(annotation));

  if (state.draftAnnotation && state.draftAnnotation.type !== "polygon-preview" && state.draftAnnotation.type !== "line-preview") {
    drawAnnotation({ ...state.draftAnnotation, id: "draft" }, true);
  }

  if (state.currentTool === "polygon" && state.polygonPoints.length) {
    drawPolygonDraft();
  }

  if (state.currentTool === "brush" && state.brushPoints.length) {
    drawBrushDraft();
  }

  if (state.currentTool === "line" && state.linePoints.length) {
    drawLineDraft();
  }
}

function drawEmptyCanvas() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.font = '600 20px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("加载图片后开始标注。", 32, 42);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.font = '400 14px "Aptos", "Segoe UI Variable Text", sans-serif';
  ctx.fillText("当前支持矩形、线段、多边形、历史恢复和 PNG 导出。", 32, 68);
  ctx.restore();
}

function drawAnnotation(annotation, isDraft = false) {
  if (!state.imagePlacement) {
    return;
  }

  if (annotation.type === "line") {
    drawLineAnnotation(annotation);
    return;
  }

  if (annotation.type === "polygon") {
    drawPolygonAnnotation(annotation, isDraft);
    return;
  }

  if (annotation.type === "brush") {
    drawBrushAnnotation(annotation, isDraft);
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
  drawLabel(x, Math.max(placement.y, y - 28), getAnnotationLabel(annotation));
  ctx.restore();
}

function drawLineAnnotation(annotation) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;

  const points = annotation.points
    ? annotation.points.map((point) => ({
        x: placement.x + point.x * placement.scale,
        y: placement.y + point.y * placement.scale,
      }))
    : [
        { x: placement.x + annotation.start.x * placement.scale, y: placement.y + annotation.start.y * placement.scale },
        { x: placement.x + annotation.end.x * placement.scale, y: placement.y + annotation.end.y * placement.scale },
      ];

  if (points.length < 2) {
    return;
  }

  const centroid = getPolygonCentroid(points);

  ctx.save();
  ctx.lineWidth = selected ? 3 : 2;
  ctx.strokeStyle = selected ? "#8ae6ff" : "#55d5ff";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();

  points.forEach((point) => drawVertex(point.x, point.y, selected));
  drawLabel(centroid.x - 32, centroid.y - 32, getAnnotationLabel(annotation));
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

  const centroid = getPolygonCentroid(points);

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
  drawLabel(centroid.x - 36, centroid.y - 14, getAnnotationLabel(annotation));
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
  ctx.fillStyle = "rgba(138, 227, 95, 0.1)";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  if (state.draftAnnotation && state.draftAnnotation.type === "polygon-preview") {
    const previewX = placement.x + state.draftAnnotation.previewPoint.x * placement.scale;
    const previewY = placement.y + state.draftAnnotation.previewPoint.y * placement.scale;
    ctx.lineTo(previewX, previewY);
  }
  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, false));
  ctx.restore();
}

function drawBrushAnnotation(annotation, isDraft) {
  const placement = state.imagePlacement;
  const selected = annotation.id === state.selectedId;

  if (!annotation.points?.length) {
    return;
  }

  const points = annotation.points.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

  ctx.save();
  ctx.lineWidth = selected ? 4 : 3;
  ctx.strokeStyle = selected ? "#ffd18a" : "#ff6b9d";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    ctx.lineTo(points[index].x, points[index].y);
  }
  ctx.stroke();

  const centroid = getPolygonCentroid(points);
  drawLabel(centroid.x - 36, centroid.y - 14, getAnnotationLabel(annotation));
  ctx.restore();
}

function drawBrushDraft() {
  const placement = state.imagePlacement;

  if (!state.brushPoints.length) {
    return;
  }

  const points = state.brushPoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

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

function drawLineDraft() {
  const placement = state.imagePlacement;

  if (!state.linePoints.length) {
    return;
  }

  const points = state.linePoints.map((point) => ({
    x: placement.x + point.x * placement.scale,
    y: placement.y + point.y * placement.scale,
  }));

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

  if (state.draftAnnotation && state.draftAnnotation.type === "line-preview") {
    const previewX = placement.x + state.draftAnnotation.previewPoint.x * placement.scale;
    const previewY = placement.y + state.draftAnnotation.previewPoint.y * placement.scale;
    ctx.lineTo(previewX, previewY);
  }

  ctx.stroke();
  points.forEach((point) => drawVertex(point.x, point.y, false));
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
  const safeX = Math.max(12, Math.min(x, elements.canvas.width - 180));
  const safeY = Math.max(12, Math.min(y, elements.canvas.height - 36));
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

function getPolylineLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
    length += Math.hypot(current.x - previous.x, current.y - previous.y);
  }
  return length;
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
    length: getBrushLength(points),
  };
}

function getBrushLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];
    const previous = points[index - 1];
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

  if (annotation.type === "line") {
    return `${prefix}${Math.round(annotation.length)} px`;
  }

  if (annotation.type === "polygon") {
    return `${prefix}${Math.round(annotation.area)} px²`;
  }

  if (annotation.type === "brush") {
    return `${prefix}画笔 ${Math.round(annotation.length)} px`;
  }

  return `${prefix}${Math.round(annotation.width)} × ${Math.round(annotation.height)} px`;
}

function getAnnotationSummary(annotation) {
  const prefix = annotation.name ? `${annotation.name} · ` : "";

  if (annotation.type === "line") {
    const points = annotation.points
      ? annotation.points
      : [annotation.start, annotation.end];
    const firstPoint = points[0] || { x: 0, y: 0 };
    const lastPoint = points[points.length - 1] || { x: 0, y: 0 };

    return {
      title: `${prefix}线段 ${Math.round(annotation.length)} px`,
      meta: `${points.length} 个顶点，起点 (${Math.round(firstPoint.x)}, ${Math.round(firstPoint.y)})，终点 (${Math.round(lastPoint.x)}, ${Math.round(lastPoint.y)})`,
      selection: `${Math.round(annotation.length)} px`,
    };
  }

  if (annotation.type === "polygon") {
    return {
      title: `${prefix}多边形 ${Math.round(annotation.area)} px²`,
      meta: `${annotation.points.length} 个顶点，周长 ${Math.round(annotation.perimeter)} px`,
      selection: `${Math.round(annotation.area)} px²`,
    };
  }

  if (annotation.type === "brush") {
    return {
      title: `${prefix}画笔 ${Math.round(annotation.length)} px`,
      meta: `${annotation.points.length} 个点，总长度 ${Math.round(annotation.length)} px`,
      selection: `${Math.round(annotation.length)} px`,
    };
  }

  return {
    title: `${prefix}${Math.round(annotation.width)} × ${Math.round(annotation.height)} px`,
    meta: `面积 ${Math.round(annotation.area)} px²，起点 (${Math.round(annotation.x)}, ${Math.round(annotation.y)})`,
    selection: `${Math.round(annotation.width)} × ${Math.round(annotation.height)} px`,
  };
}

function updateToolButtons() {
  elements.toolButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === state.currentTool);
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

function refreshOverlay() {
  const headline = state.imageName || "画布已就绪";
  const message = state.image ? getToolInstructions() : "加载一张本地图片后开始标注。";
  elements.overlay.innerHTML = `<strong>${headline}</strong><span>${message}</span>`;
}

function setCurrentTool(tool) {
  state.currentTool = tool;
  resetDraftState();
  updateToolButtons();
  refreshOverlay();
  setStatus(getToolInstructions(tool));
  drawScene();
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
          <p class="annotation-title">${summary.title}</p>
          <p class="annotation-meta">${summary.meta}</p>
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
  resetDraftState();
  renderAnnotationList();
  updateAnnotationNameEditor();
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

function loadImage(file) {
  if (!file) {
    elements.fileName.textContent = "未选择图片";
    return;
  }

  state.currentSessionPrefix = null;
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

function exportAnnotatedImage() {
  if (!state.image) {
    return null;
  }

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = state.image.width;
  tempCanvas.height = state.image.height;
  const tempCtx = tempCanvas.getContext("2d");

  tempCtx.drawImage(state.image, 0, 0);

  state.annotations.forEach((annotation) => {
    if (annotation.type === "rectangle") {
      tempCtx.lineWidth = 3;
      tempCtx.strokeStyle = "#ff8f62";
      tempCtx.fillStyle = "rgba(255, 143, 98, 0.18)";
      tempCtx.strokeRect(annotation.x, annotation.y, annotation.width, annotation.height);
      tempCtx.fillRect(annotation.x, annotation.y, annotation.width, annotation.height);
      return;
    }

    if (annotation.type === "line") {
      tempCtx.lineWidth = 3;
      tempCtx.strokeStyle = "#55d5ff";
      tempCtx.lineCap = "round";
      tempCtx.lineJoin = "round";

      const points = annotation.points
        ? annotation.points
        : [annotation.start, annotation.end];

      if (points.length < 2) {
        return;
      }

      tempCtx.beginPath();
      tempCtx.moveTo(points[0].x, points[0].y);
      for (let index = 1; index < points.length; index += 1) {
        tempCtx.lineTo(points[index].x, points[index].y);
      }
      tempCtx.stroke();
      return;
    }

    if (annotation.type === "brush") {
      if (!annotation.points?.length) {
        return;
      }

      tempCtx.lineWidth = 3;
      tempCtx.strokeStyle = "#ff6b9d";
      tempCtx.lineCap = "round";
      tempCtx.lineJoin = "round";
      tempCtx.beginPath();
      tempCtx.moveTo(annotation.points[0].x, annotation.points[0].y);
      for (let index = 1; index < annotation.points.length; index += 1) {
        tempCtx.lineTo(annotation.points[index].x, annotation.points[index].y);
      }
      tempCtx.stroke();
      return;
    }

    if (!annotation.points?.length) {
      return;
    }

    tempCtx.lineWidth = 3;
    tempCtx.strokeStyle = "#8ae35f";
    tempCtx.fillStyle = "rgba(138, 227, 95, 0.22)";
    tempCtx.beginPath();
    tempCtx.moveTo(annotation.points[0].x, annotation.points[0].y);
    for (let index = 1; index < annotation.points.length; index += 1) {
      tempCtx.lineTo(annotation.points[index].x, annotation.points[index].y);
    }
    tempCtx.closePath();
    tempCtx.fill();
    tempCtx.stroke();
  });

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

  const link = document.createElement("a");
  const customFilename = elements.exportFilename.value.trim();

  if (customFilename) {
    const safeFilename = customFilename.replace(/[<>:"/\\|?*]/g, "_");
    link.download = safeFilename.endsWith(".png") ? safeFilename : `${safeFilename}.png`;
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const projectName = elements.projectName.value.trim() || "geodraft";
    link.download = `${projectName}-${timestamp}.png`;
  }

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
    start: annotation.start
      ? {
          x: Number(annotation.start.x.toFixed(2)),
          y: Number(annotation.start.y.toFixed(2)),
        }
      : undefined,
    end: annotation.end
      ? {
          x: Number(annotation.end.x.toFixed(2)),
          y: Number(annotation.end.y.toFixed(2)),
        }
      : undefined,
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

  let originalImage = null;
  try {
    originalImage = await readFileAsDataUrl(state.imageFile);
  } catch (error) {
    console.warn("Failed to read original image:", error);
  }

  const tagsInput = elements.imageTags.value.trim();
  const tags = tagsInput
    ? tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag)
    : [];

  const payload = {
    projectName: elements.projectName.value.trim() || "GeoDraft Prototype",
    projectNotes: elements.projectNotes.value.trim(),
    imageTags: tags,
    exportFilename: elements.exportFilename.value.trim(),
    imageMeta: {
      name: state.imageName,
      width: state.image.width,
      height: state.image.height,
    },
    annotations: serializeAnnotations(),
    originalImage,
    annotatedImage,
  };

  try {
    setStatus("正在保存项目...");
    const response = await fetch("/api/annotations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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
    elements.imageTags.value = (body.imageTags || []).join(", ");
    state.currentSessionPrefix = filePrefix;
    state.annotations = Array.isArray(body.annotations) ? body.annotations : [];
    state.selectedId = null;
    resetDraftState();
    renderAnnotationList();
    updateAnnotationNameEditor();

    const imageMeta = body.imageMeta || {};
    const preferredImage = body.originalImage || body.annotatedImage;

    if (preferredImage) {
      loadImageFromSource(preferredImage, imageMeta.name || "已恢复图片", {
        preserveAnnotations: true,
        imageFile: null,
        afterLoad: () => {
          const message = body.originalImage
            ? `已加载历史项目：${elements.projectName.value}`
            : `已加载历史项目：${elements.projectName.value}。当前显示的是已标注预览图。`;
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

  state.undoStack.push({
    action: "add",
    annotation: { ...polygon },
  });

  state.annotations.push(polygon);
  state.selectedId = polygon.id;
  resetDraftState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加多边形，面积 ${Math.round(polygon.area)} px²。`);
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

function finalizeLine() {
  if (state.linePoints.length < 2) {
    setStatus("线段至少需要两个顶点。", "error");
    return;
  }

  const polyline = createLineAnnotation([...state.linePoints]);
  const pointCount = state.linePoints.length;

  if (polyline.length < 4) {
    setStatus("这个线段太短，已忽略。", "error");
    resetDraftState();
    drawScene();
    return;
  }

  state.undoStack.push({
    action: "add",
    annotation: { ...polyline },
  });

  state.annotations.push(polyline);
  state.selectedId = polyline.id;
  resetDraftState();
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加线段，总长度 ${Math.round(polyline.length)} px，共 ${pointCount} 个顶点。`);
}

function undoLastAction() {
  if (state.undoStack.length === 0) {
    setStatus("没有可撤销的操作。请先添加一些标注。", "error");
    return;
  }

  const lastAction = state.undoStack.pop();

  if (lastAction.action === "add") {
    const index = state.annotations.findIndex((a) => a.id === lastAction.annotation.id);
    if (index !== -1) {
      state.annotations.splice(index, 1);
      state.selectedId = null;
      renderAnnotationList();
      updateAnnotationNameEditor();
      drawScene();
      setStatus(`已撤销：${lastAction.annotation.type} 标注。`);
    } else {
      setStatus("无法找到要撤销的标注。", "error");
    }
  }
}

elements.canvas.addEventListener("pointerdown", (event) => {
  if (!state.image) {
    setStatus("请先加载图片。", "error");
    return;
  }

  const point = pointerToImageCoordinates(event);
  if (!point) {
    return;
  }

  state.selectedId = null;
  updateAnnotationNameEditor();

  if (state.currentTool === "polygon") {
    state.polygonPoints.push(point);
    state.draftAnnotation = null;
    renderAnnotationList();
    drawScene();
    setStatus(`已添加顶点 ${state.polygonPoints.length}，双击或按 Enter 完成。`);
    return;
  }

  if (state.currentTool === "line") {
    state.linePoints.push(point);
    state.draftAnnotation = null;
    renderAnnotationList();
    drawScene();
    setStatus(`已添加顶点 ${state.linePoints.length}，双击或按 Enter 完成，按 Backspace 撤销上一个顶点。`);
    return;
  }

  if (state.currentTool === "brush") {
    state.drawing = true;
    state.brushPoints = [point];
    drawScene();
    setStatus("画笔绘制中...");
    return;
  }

  state.drawing = true;
  state.pointerStart = point;
  state.draftAnnotation = normalizeRectangle(point, point);
  drawScene();
});

elements.canvas.addEventListener("pointermove", (event) => {
  if (state.currentTool === "polygon") {
    const point = pointerToImageCoordinates(event);
    state.draftAnnotation =
      state.polygonPoints.length && point ? { type: "polygon-preview", previewPoint: point } : null;
    drawScene();
    return;
  }

  if (state.currentTool === "line") {
    const point = pointerToImageCoordinates(event);
    state.draftAnnotation =
      state.linePoints.length && point ? { type: "line-preview", previewPoint: point } : null;
    drawScene();
    return;
  }

  if (state.currentTool === "brush") {
    if (!state.drawing) {
      return;
    }

    const point = pointerToImageCoordinates(event);
    if (point) {
      state.brushPoints.push(point);
      drawScene();
    }
    return;
  }

  if (!state.drawing || !state.pointerStart) {
    return;
  }

  const point = pointerToImageCoordinates(event);
  if (!point) {
    return;
  }

  state.draftAnnotation = normalizeRectangle(state.pointerStart, point);
  drawScene();
});

elements.canvas.addEventListener("pointerup", (event) => {
  if (state.currentTool === "polygon" || state.currentTool === "line") {
    return;
  }

  if (state.currentTool === "brush") {
    if (!state.drawing) {
      return;
    }

    state.drawing = false;

    if (state.brushPoints.length < 2) {
      state.brushPoints = [];
      drawScene();
      setStatus("画笔路径太短，已忽略。", "error");
      return;
    }

    const annotation = createBrushAnnotation([...state.brushPoints]);
    state.brushPoints = [];

    if (annotation.length < 4) {
      setStatus("画笔路径太短，已忽略。", "error");
      drawScene();
      return;
    }

    state.undoStack.push({
      action: "add",
      annotation: { ...annotation },
    });

    state.annotations.push(annotation);
    state.selectedId = annotation.id;
    renderAnnotationList();
    updateAnnotationNameEditor();
    drawScene();
    setStatus(`已添加画笔，长度 ${Math.round(annotation.length)} px。`);
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

  const tooSmall = annotation.width < 4 || annotation.height < 4;

  if (tooSmall) {
    setStatus("这个矩形太小，已忽略。", "error");
    drawScene();
    return;
  }

  state.undoStack.push({
    action: "add",
    annotation: { ...annotation },
  });

  state.annotations.push(annotation);
  state.selectedId = annotation.id;
  renderAnnotationList();
  updateAnnotationNameEditor();
  drawScene();
  setStatus(`已添加矩形，尺寸 ${Math.round(annotation.width)} × ${Math.round(annotation.height)} px。`);
});

elements.canvas.addEventListener("pointerleave", () => {
  if (state.currentTool === "polygon" || state.currentTool === "line") {
    state.draftAnnotation = null;
    drawScene();
    return;
  }

  if (state.currentTool === "brush") {
    if (!state.drawing) {
      return;
    }

    state.drawing = false;

    if (state.brushPoints.length >= 2) {
      const annotation = createBrushAnnotation([...state.brushPoints]);
      state.brushPoints = [];

      if (annotation.length >= 4) {
        state.undoStack.push({
          action: "add",
          annotation: { ...annotation },
        });

        state.annotations.push(annotation);
        state.selectedId = annotation.id;
        renderAnnotationList();
        updateAnnotationNameEditor();
        drawScene();
        setStatus(`已添加画笔，长度 ${Math.round(annotation.length)} px。`);
        return;
      }
    }

    state.brushPoints = [];
    drawScene();
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
    finalizePolygon();
    return;
  }

  if (state.currentTool === "line") {
    event.preventDefault();
    finalizeLine();
    return;
  }
});

document.addEventListener("keydown", (event) => {
  if (event.ctrlKey && event.key === "z") {
    event.preventDefault();
    undoLastAction();
    return;
  }

  if (state.currentTool === "polygon") {
    if (event.key === "Enter") {
      finalizePolygon();
    }

    if (event.key === "Escape") {
      resetDraftState();
      drawScene();
      setStatus("已取消当前多边形绘制。");
    }

    if (event.key === "Backspace" && state.polygonPoints.length > 0) {
      event.preventDefault();
      state.polygonPoints.pop();
      drawScene();
      setStatus(`已撤销上一个顶点，当前共 ${state.polygonPoints.length} 个顶点。`);
    }

    return;
  }

  if (state.currentTool === "line") {
    if (event.key === "Enter") {
      finalizeLine();
    }

    if (event.key === "Escape") {
      resetDraftState();
      drawScene();
      setStatus("已取消当前线段绘制。");
    }

    if (event.key === "Backspace" && state.linePoints.length > 0) {
      event.preventDefault();
      state.linePoints.pop();
      drawScene();
      setStatus(`已撤销上一个顶点，当前共 ${state.linePoints.length} 个顶点。`);
    }

    return;
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

elements.undoButton.addEventListener("click", () => {
  undoLastAction();
});

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

elements.downloadButton.addEventListener("click", () => {
  downloadAnnotatedImage();
});

elements.saveAnnotationName.addEventListener("click", () => {
  saveAnnotationName();
});

elements.annotationNameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    saveAnnotationName();
  }
});

elements.saveButton.addEventListener("click", () => {
  saveAnnotations();
});

elements.refreshHistory.addEventListener("click", async () => {
  await loadHistoryList();
  setStatus("历史记录已刷新。");
});

window.addEventListener("resize", syncCanvasSize);

renderAnnotationList();
updateToolButtons();
refreshOverlay();
syncCanvasSize();
loadHistoryList();
